import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { Pool } from "pg";
import set from "date-fns/set";
import subMinutes from "date-fns/subMinutes";
import { Kysely, PostgresDialect, sql } from "kysely";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";
import { z } from "zod";
import { requestsTableSchema } from "./schema";
import { generateKey, decrypt, EncryptedData } from "@local/encryption";

export interface IdkEnv {
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  ENCRYPTION_SECRET: string;
  [other: string]: string;
}

interface RequestShadowingDatabase {
  requests: z.infer<typeof requestsTableSchema>;
}

const serverTiming = (
  entries: Array<{ name: string; dur: number | string; desc?: string }>,
) => {
  return {
    "server-timing": entries
      .map(({ name, desc, dur }) => {
        let value = `${name};dur=${dur}`;
        if (desc) {
          value += `;desc=${desc}`;
        }
        return value;
      })
      .join(", "),
  };
};

const getMirrorAggregation = async (
  db: Kysely<RequestShadowingDatabase>,
  {
    lookbackPeriodHours,
    rollupPeriodMinutes,
    tags,
  }: {
    lookbackPeriodHours: number;
    rollupPeriodMinutes: number;
    tags?: Record<string, string[]>;
  },
) => {
  let incompleteTotalsQuery = db
    .selectFrom("requests")
    .select((eb) => eb.fn.count<string>("divergent").as("total"))
    .select(sql<string>`sum(divergent::int)`.as("divergent"))
    .select(
      sql<Date>`date_bin(${`${rollupPeriodMinutes} minutes`}::interval, created_at, now() - ${`${lookbackPeriodHours} hours`}::interval)`.as(
        "bin",
      ),
    )
    .where(
      sql`now() - ${`${lookbackPeriodHours} hours`}::interval <= created_at`,
    );

  for (const [tag, values] of Object.entries(tags ?? {})) {
    incompleteTotalsQuery = incompleteTotalsQuery.where((eb) =>
      eb.or(values.map((value) => sql`tags ->> ${tag}::text = ${value}::text`)),
    );
  }

  incompleteTotalsQuery = incompleteTotalsQuery
    .groupBy("bin")
    .orderBy("bin", "desc");

  const incompleteTotals = await incompleteTotalsQuery.execute();

  return Array((lookbackPeriodHours * 60) / rollupPeriodMinutes)
    .fill(undefined)
    .map((_, idx, arr) => {
      const start = set(
        subMinutes(new Date(), rollupPeriodMinutes * (idx + 1)),
        {
          seconds: 0,
          milliseconds: 0,
        },
      );
      const end = set(subMinutes(new Date(), rollupPeriodMinutes * idx), {
        seconds: 0,
        milliseconds: 0,
      });
      const bin = subMinutes(start, Math.floor(rollupPeriodMinutes / 2));

      const match = incompleteTotals.find(
        (t) => isBefore(t.bin, end) && isAfter(t.bin, start),
      );

      return {
        start,
        bin,
        end,
        total: match ? parseInt(match.total, 10) : 0,
        divergent: match ? parseInt(match.divergent, 10) : 0,
      };
    })
    .reverse();
};

const getDatabase = (env: IdkEnv) => {
  const config = {
    max: 1,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT, 10),
    database: env.DB_NAME,
  };
  console.log("Connecting to database", { ...config, password: undefined });
  return new Kysely<RequestShadowingDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool(config),
    }),
  });
};

const router = new Hono<{
  Bindings: IdkEnv;
}>();

router.onError((error, ctx) => {
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
// TODO: forward JWT from Cloudflare Access and validate that?
// https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
router.use("*", bearerAuth({ token: "scurvy-reuse-bulldozer" }));

router.get("/mirrors/aggregation", async (ctx) => {
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

  const data = await getMirrorAggregation(getDatabase(ctx.env), {
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

router.get("/mirrors", async (ctx) => {
  const url = new URL(ctx.req.url);

  let query = getDatabase(ctx.env)
    .selectFrom("requests")
    .select(["id", "divergent", "created_at", "tags"])
    .select(
      sql<Array<{ added: number; removed: number; paths: string[] }>>`
          jsonb_build_object(
            'added', jsonb_extract_path(shadows, '0', 'diff', 'added'),
            'removed', jsonb_extract_path(shadows, '0', 'diff', 'removed'),
            'paths', jsonb_extract_path(shadows, '0', 'diff', 'paths')
          )`.as("diff"),
    )
    .select(
      sql<Array<{ url: string; status: number }>>`
          jsonb_build_object(
            'url', jsonb_extract_path(control, 'url'),
            'status', jsonb_extract_path(control, 'status')
          )`.as("control"),
    )
    .select(
      sql<Array<{ url: string; status: number }>>`
          jsonb_build_object(
            'url', jsonb_extract_path(shadows, '0', 'url'),
            'status', jsonb_extract_path(shadows, '0', 'status')
          )`.as("shadow"),
    )
    .orderBy("created_at", "desc")
    .limit(Math.min(250, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const param = url.searchParams.get("divergent")?.toLowerCase();
  if (param === "" || param === "true") {
    query = query.where("divergent", "is", true);
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

  return ctx.json(
    {
      data: result,
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    },
  );
});

const decryptMirrorInPlace = async ({
  mirror,
  key,
}: {
  mirror: Omit<z.infer<typeof requestsTableSchema>, "replays">;
  key: CryptoKey;
}) => {
  mirror.control.response = await decrypt(
    mirror.control.response as EncryptedData,
    {
      key,
    },
  );
  mirror.control.request.headers = JSON.parse(
    await decrypt(mirror.control.request.headers as EncryptedData, {
      key,
    }),
  );
  mirror.shadows[0].diff.patches = JSON.parse(
    await decrypt(mirror.shadows[0].diff.patches as EncryptedData, {
      key,
    }),
  );
  mirror.shadows[0].headers = JSON.parse(
    await decrypt(mirror.shadows[0].headers as EncryptedData, {
      key,
    }),
  );
  mirror.shadows[0].response = await decrypt(
    mirror.shadows[0].response as EncryptedData,
    {
      key,
    },
  );
  return mirror;
};

router.get("/mirrors/:id", async (ctx) => {
  const id = ctx.req.param("id");

  const start = Date.now();
  const mirror = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();

  if (!mirror) {
    return ctx.json(
      { message: "No such mirror", data: { id } },
      { status: 404 },
    );
  }

  if (typeof mirror.control.response === "object") {
    const { key } = await generateKey(ctx.env.ENCRYPTION_SECRET, {
      saltAsBase64: mirror.control.response.salt,
    });

    await decryptMirrorInPlace({
      key,
      mirror,
    });

    if (mirror.replays) {
      for (const replay of mirror.replays) {
        const encodedSalt = (replay.control.response as EncryptedData).salt;
        // Since replays are appended one at a time in separate requests they
        // will always have a different salt preventing reuse.
        const replayKey = await generateKey(ctx.env.ENCRYPTION_SECRET, {
          saltAsBase64: encodedSalt,
        });
        await decryptMirrorInPlace({ key: replayKey.key, mirror: replay });
      }
    }
  }

  return ctx.json(
    { data: mirror },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    },
  );
});

router.post("/mirrors/:id/replay", async (ctx) => {
  const id = ctx.req.param("id");

  const queryStart = Date.now();
  const mirror = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();
  const queryMs = Date.now() - queryStart;

  if (!mirror) {
    return ctx.json(
      { message: "No such mirror", data: { id } },
      { status: 404 },
    );
  }

  if (typeof mirror.control.response === "object") {
    const { key } = await generateKey(ctx.env.ENCRYPTION_SECRET, {
      saltAsBase64: mirror.control.response.salt,
    });

    await decryptMirrorInPlace({
      key,
      mirror,
    });
  }

  // rely on ingest filters to avoid header bomb
  const headers = Object.fromEntries(
    Object.entries(mirror.control.request.headers).filter(
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
  await fetch(mirror.control.url, {
    method: mirror.control.request.method,
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
