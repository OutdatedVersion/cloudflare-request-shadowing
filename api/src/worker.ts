import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import { JWTPayload, createRemoteJWKSet, jwtVerify } from "jose";
import { generateKey, decrypt } from "@local/encryption";
import partition from "lodash/partition";
import {
  PublicApi,
  PublicRequest,
  EncryptedRequestTable,
  DecryptedRequestTable,
} from "@local/schema";
import { WorkerEnv } from "./env";
import { getDatabase } from "./repository/database";
import { serverTiming } from "./helpers/server-timing-header";
import { fetchAndAggregateRequests } from "./repository/aggregation";

let _jwk: ReturnType<typeof createRemoteJWKSet>;
const getJsonWebKeyProvider = (env: WorkerEnv) => {
  // note: it's possible we'll become out-of-date due to a lack of
  // cache invalidation and long lived worker instances
  if (_jwk) {
    return _jwk;
  }

  _jwk = createRemoteJWKSet(
    new URL(
      `https://${env.AUTH_TEAM_NAME}.cloudflareaccess.com/cdn-cgi/access/certs`,
    ),
  );
  return _jwk;
};

const router = new Hono<{
  Bindings: WorkerEnv;
  Variables: {
    tokenClaims: JWTPayload;
  };
}>();

router.onError((error, ctx) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error("uncaught error", error.stack);
  return ctx.json(
    {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    {
      status: 500,
    },
  );
});

router.use(
  "*",
  cors({
    origin: [
      "https://request-shadowing-demo.bwatkins.dev",
      "http://localhost:8788",
    ],
  }),
);
// https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
router.use("*", async (ctx, next) => {
  const token = (
    getCookie(ctx, "CF_Authorization") ??
    ctx.req.header("Cf-Access-Jwt-Assertion")
  )?.trim();

  if (!token) {
    return ctx.json(
      {
        name: "Unauthorized",
        message: "Cookie/header missing",
      },
      { status: 401 },
    );
  }

  try {
    const { payload } = await jwtVerify(token, getJsonWebKeyProvider(ctx.env), {
      issuer: `https://${ctx.env.AUTH_TEAM_NAME}.cloudflareaccess.com`,
      audience: ctx.env.AUTH_AUD_CLAIM,
    });

    ctx.set("tokenClaims", payload);
  } catch (error) {
    return ctx.json(
      {
        name: "Unauthorized",
        message: "Malformed token",
        cause: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      {
        status: 401,
      },
    );
  }

  await next();
});

router.get("/shadows/aggregation", async (ctx) => {
  const url = new URL(ctx.req.url);

  const start = Date.now();

  const errors: string[] = [];
  const tags = (ctx.req.queries().tag ?? [])
    .filter((entry) => {
      // Validate tags
      if (!/^([a-z0-9]+:[a-z0-9-]+)$/i.test(entry)) {
        errors.push(entry);
        return false;
      }
      return true;
    })
    .reduce((entries, entry) => {
      const [key, value] = entry.toLowerCase().split(":");
      return {
        ...entries,
        [key]: [...(entries[key] ?? []), value],
      };
    }, {} as Record<string, string[]>);

  if (errors.length > 0) {
    return ctx.json(
      {
        message: "Malformed tags query. e.g. 'key:value'",
        data: { malformedTags: errors },
      },
      { status: 400 },
    );
  }

  const data = await fetchAndAggregateRequests(getDatabase(ctx.env), {
    rollupPeriodMinutes: parseInt(
      url.searchParams.get("rollupPeriodMinutes") ?? "30",
      10,
    ),
    lookbackPeriodHours: parseInt(
      url.searchParams.get("lookbackPeriodHours") ?? "4",
      10,
    ),
    tags,
  });

  return ctx.json(
    {
      data,
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    },
  );
});

router.get("/shadows", async (ctx) => {
  const url = new URL(ctx.req.url);

  let query = getDatabase(ctx.env)
    .selectFrom("requests")
    // metadata
    .select(["id", "created_at", "tags"])
    // divergence data
    .select(["diff_paths", "diff_added_count", "diff_removed_count"])
    // control data
    .select(["control_req_url", "control_res_http_status"])
    // shadow data
    .select(["shadow_req_url", "shadow_res_http_status"])
    .orderBy("created_at", "desc")
    .limit(Math.min(250, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const param = url.searchParams.get("divergent")?.toLowerCase();
  if (param === "" || param === "true") {
    query = query.where("diff_paths", "is not", null);
  }

  const errors: string[] = [];
  const tags = (ctx.req.queries().tag ?? [])
    .filter((entry) => {
      // Validate tags
      if (!/^([a-z0-9]+:[a-z0-9-]+)$/i.test(entry)) {
        errors.push(entry);
        return false;
      }
      return true;
    })
    .reduce((entries, entry) => {
      const [key, value] = entry.toLowerCase().split(":");
      return {
        ...entries,
        [key]: [...(entries[key] ?? []), value],
      };
    }, {} as Record<string, string[]>);

  if (errors.length > 0) {
    return ctx.json(
      {
        message: "Malformed tags query. e.g. 'key:value'",
        data: { malformedTags: errors },
      },
      { status: 400 },
    );
  }

  for (const [tag, values] of Object.entries(tags ?? {})) {
    query = query.where((eb) =>
      eb.or(values.map((value) => sql`tags ->> ${tag}::text = ${value}::text`)),
    );
  }

  const start = Date.now();
  const result = await query.execute();
  const total = Date.now() - start;

  return ctx.json(
    {
      data: result.map((req) => ({
        id: req.id,
        created_at: req.created_at,
        tags: req.tags,
        diff: {
          added: req.diff_added_count,
          removed: req.diff_removed_count,
          paths: req.diff_paths,
        },
        control: {
          url: req.control_req_url,
          status: req.control_res_http_status,
        },
        shadow: {
          url: req.shadow_req_url,
          status: req.shadow_res_http_status,
        },
      })),
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: total }]),
      },
    },
  );
});

const decryptRequest = async ({
  encrypted,
  key,
}: {
  encrypted: Omit<EncryptedRequestTable, "replays">;
  key: CryptoKey;
}) => {
  const decrypted = { ...encrypted } as unknown as DecryptedRequestTable;
  decrypted.control_res_body = await decrypt(encrypted.control_res_body, {
    key,
  });
  decrypted.control_req_headers = JSON.parse(
    await decrypt(encrypted.control_req_headers, {
      key,
    }),
  ) as Record<string, string>;
  if (encrypted.diff_patches) {
    // @ts-expect-error
    decrypted.diff_patches = JSON.parse(
      await decrypt(encrypted.diff_patches, {
        key,
      }),
    );
  }
  decrypted.shadow_res_headers = JSON.parse(
    await decrypt(encrypted.shadow_res_headers, {
      key,
    }),
  ) as Record<string, string>;
  decrypted.shadow_res_body = await decrypt(encrypted.shadow_res_body, {
    key,
  });
  return decrypted;
};

// "mom, can we get ORM?"
// "we have ORM at home":
const databaseToPublicSchema = (req: DecryptedRequestTable): PublicRequest => {
  return {
    id: req.id,
    created_at: req.created_at.toISOString(),
    tags: req.tags,
    diff:
      req.diff_added_count !== null &&
      req.diff_removed_count !== null &&
      req.diff_paths
        ? {
            added: req.diff_added_count,
            removed: req.diff_removed_count,
            paths: req.diff_paths,
            patches: req.diff_patches,
          }
        : null,
    control: {
      request: {
        url: req.control_req_url,
        method: req.control_req_method,
        headers: req.control_req_headers,
      },
      response: {
        status: req.control_res_http_status,
        body: req.control_res_body,
      },
    },
    shadow: {
      request: {
        url: req.shadow_req_url,
        method: req.shadow_req_method,
        // 🤠
        headers: req.control_req_headers,
      },
      response: {
        status: req.shadow_res_http_status,
        body: req.shadow_res_body,
        headers: req.shadow_res_headers,
      },
    },
  };
};

router.get("/shadows/:id", async (ctx) => {
  const id = ctx.req.param("id");

  const start = Date.now();
  const requests = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where((qb) => qb.or([qb("id", "=", id), qb("parent_id", "=", id)]))
    .limit(1)
    .execute();

  if (requests.length <= 0) {
    return ctx.json(
      { message: "No such shadow found", data: { id } },
      { status: 404 },
    );
  }

  const decrypted = await Promise.all(
    requests.map(async (req) => {
      const { key } = await generateKey(ctx.env.ENCRYPTION_SECRET, {
        saltAsBase64: req.control_req_headers.salt,
      });

      return await decryptRequest({
        key,
        encrypted: req,
      });
    }),
  );

  const [[original], replays] = partition(
    decrypted,
    (d) => d.parent_id === null,
  );

  const data: PublicApi["/shadows/:id"] = {
    ...databaseToPublicSchema(original),
    replays: replays.map((r) => databaseToPublicSchema(r)),
  };

  return ctx.json(
    {
      data,
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    },
  );
});

router.post("/shadows/:id/replay", async (ctx) => {
  const id = ctx.req.param("id");

  const queryStart = Date.now();
  const encrypted = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();
  const queryMs = Date.now() - queryStart;

  if (!encrypted) {
    return ctx.json(
      { message: "No such mirror", data: { id } },
      { status: 404 },
    );
  }

  const { key } = await generateKey(ctx.env.ENCRYPTION_SECRET, {
    saltAsBase64: encrypted.control_res_body.salt,
  });
  const decrypted = await decryptRequest({
    key,
    encrypted,
  });

  // rely on ingest filters to avoid header bomb
  const headers = Object.fromEntries(
    Object.entries(decrypted.control_req_headers).filter(
      ([k]) =>
        ![
          "x-forwarded-proto",
          "x-real-ip",
          "cf-visitor",
          "cf-ray",
          "cf-connecting-ip",
          "cf-ipcountry",
          "true-client-ip",
        ].includes(k.toLowerCase()),
    ),
  );

  const start = Date.now();
  await fetch(decrypted.control_req_url, {
    method: decrypted.control_req_method,
    headers: {
      ...headers,
      "shadowing-parent-id": id,
    },
  });

  return ctx.newResponse(null, {
    status: 202,
    headers: {
      ...serverTiming([
        { name: "query", dur: queryMs },
        { name: "req", dur: Date.now() - start },
      ]),
    },
  });
});

export default router;
