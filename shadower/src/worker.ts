import {
  Delta,
  create,
  formatters as diffFormattersIgnore,
} from "jsondiffpatch";
import { encrypt, generateKey } from "@local/encryption";
import { getDatabaseClient } from "./repository/database";

type ShadowingConfig = {
  /**
   * Absolute URL shadow request is sent to.
   *
   * Control request's query parameters will be appended to this.
   *
   * @example https://api.bwatkins.dev/new-service
   */
  url: string;

  /**
   * Maximum number of seconds the shadow request may take.
   *
   * Request will be aborted if >=timeout elapses. Note, this
   * may leave your server is an undefined state if it does
   * not handle unexpectedly closed connections.
   *
   * @example 5
   */
  timeout: number;

  /**
   * Percent of incoming requests to shadow.
   *
   * Unsampled requests will not be saved; including the control request.
   *
   * @example 100 -- all incoming requests will trigger a shadow
   * @example 50 -- half of incoming requests will trigger a shadow
   */
  percentSampleRate: number;

  /**
   * Set of HTTP status codes considered a successful shadow.
   *
   * If provided and a shadow request does not result in a response
   * code listed it will be discarded. The control and shadow will not be saved.
   *
   * If unset, all status codes are considered successful.
   *
   * @example []
   * @example [200, 404]
   */
  statuses?: number[];

  /**
   * Generic metadata stored with the control/shadow request.
   *
   * You can filter by these tags in the UI and API.
   *
   * @example { env: 'production' }
   * @example { env: 'develop' }
   */
  tags?: Record<string, string>;
};

// https://datatracker.ietf.org/doc/html/rfc6902#section-3
// Omitted `test` since that's not in our use-case
type JsonPatch =
  | {
      op: "remove";
      path: string;
    }
  | {
      op: "add";
      path: string;
      value: /* Json*/ unknown;
    }
  | {
      op: "copy";
      from: string;
      path: string;
    }
  | {
      op: "move";
      from: string;
      path: string;
    }
  | {
      op: "replace";
      path: string;
      value: /* Json */ unknown;
    };

const diffFormatters = diffFormattersIgnore as typeof diffFormattersIgnore & {
  jsonpatch: {
    // `Delta` is an `any` typed record so i'm
    // essentially only getting a participating trophy here
    format: (delta: Delta) => JsonPatch[];
  };
};
const diff = create({
  // `jsondiffpatch` first tries a `===` so primitives shouldn't pass through here
  // `{}` of varying depths seem ok
  // `[]`/tuples of varying depths seem ok
  objectHash: (obj: Record<string, unknown>) => {
    // JSON.stringify: this isn't a great idea.
    // while we can detect simple moves with this
    // it won't differentiate semantic moves

    // ideas:
    // - recursively call `jsondiffpatch`?
    //   - not particularly difficult to do some denial of service
    //   - oh. smooth brain. we don't have the other object to diff with.
    // - create a hash of the keys + values?
    //   - let's roll with this

    // it's not a hash.
    // but it is deterministic! :)
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(",");
  },
});

const getResponseBody = (res: Response) => {
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    // Even though we'll be serializing this back to text
    // soon we parse as JSON to perform the diff
    return res.json();
  } else {
    return res.text();
  }
};

const triggerAndProcessShadow = async (
  config: ShadowingConfig,
  env: Env,
  request: Request,
  control: Response,
  controlStartedAt: number,
  controlEndedAt: number,
  parentId: string | null,
) => {
  const to = new URL(config.url);
  to.search = new URL(request.url).search;

  console.log(`Shadowing to '${to}'`);

  let shadowed: Response;
  const ac = new AbortController();
  const start = Date.now();
  try {
    shadowed = await Promise.race([
      fetch(
        new Request(to, {
          signal: ac.signal,
          body: request.body,
          headers: request.headers,
          method: request.method,
          redirect: request.redirect,
        }),
      ),
      new Promise<never>((r, reject) =>
        setTimeout(
          () => reject(new Error("request did not complete")),
          config.timeout * 1000,
        ),
      ),
    ]);
  } catch (error) {
    ac.abort();
    console.error(`Failed to shadow '${to}'`, error);
    return;
  }
  const end = Date.now();

  console.log(`Shadowed to '${to}'`, {
    duration: end - start,
    status: shadowed.status,
  });

  if (config.statuses && !config.statuses.includes(shadowed.status)) {
    console.error(
      `Not saving as '${shadowed.status}' is not one of ${config.statuses.join(
        ", ",
      )}`,
    );
    return;
  }

  // TODO: 204
  const a = await getResponseBody(control);
  const b = await getResponseBody(shadowed);

  const delta = diff.diff(a, b) ?? {};
  const patches = diffFormatters.jsonpatch.format(delta);

  const summary = patches.reduce(
    (summary, patch) => {
      if (patch.op === "add") {
        summary.added += 1;
      } else if (patch.op === "remove") {
        summary.removed += 1;
      } else if (patch.op === "replace") {
        summary.added += 1;
        summary.removed += 1;
      }
      return summary;
    },
    { added: 0, removed: 0 },
  );

  console.log("Generating encryption key");
  const cryptoKey = await generateKey(env.ENCRYPTION_SECRET);

  console.log("Trying to save");

  const databaseClientStart = Date.now();
  const client = await getDatabaseClient(env.DATABASE_CONNECTION_STRING);
  console.log("Opened database connection", {
    duration: Date.now() - databaseClientStart,
  });
  const databaseStart = Date.now();

  await client.query(
    `INSERT INTO
      requests
     (
        id,
        parent_id,
        tags,
        diff_paths,
        diff_added_count,
        diff_removed_count,
        diff_patches,
        control_req_url,
        control_req_method,
        control_req_headers,
        control_res_http_status,
        control_res_body,
        control_started_at,
        control_ended_at,
        shadow_req_url,
        shadow_req_method,
        shadow_res_headers,
        shadow_res_http_status,
        shadow_res_body,
        shadow_started_at,
        shadow_ended_at
      )
      VALUES
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);
    `,
    [
      parentId,
      JSON.stringify(config.tags),
      patches.length > 0 ? patches.map((p) => p.path) : null,
      summary.added || null,
      summary.removed || null,
      JSON.stringify(await encrypt(JSON.stringify(patches), cryptoKey)),
      control.url,
      request.method.toLowerCase(),
      JSON.stringify(
        await encrypt(
          JSON.stringify(Object.fromEntries(request.headers)),
          cryptoKey,
        ),
      ),
      control.status,
      JSON.stringify(
        await encrypt(typeof a === "string" ? a : JSON.stringify(a), cryptoKey),
      ),
      new Date(controlStartedAt),
      new Date(controlEndedAt),
      shadowed.url,
      request.method.toLowerCase(),
      JSON.stringify(
        await encrypt(
          JSON.stringify(Object.fromEntries(shadowed.headers)),
          cryptoKey,
        ),
      ),
      shadowed.status,
      JSON.stringify(
        await encrypt(typeof b === "string" ? b : JSON.stringify(b), cryptoKey),
      ),
      new Date(start),
      new Date(end),
    ],
  );

  console.log("Saved to database", { duration: Date.now() - databaseStart });
  const databaseCloseStart = Date.now();
  await client.end();
  console.log("Closed database connection", {
    duration: Date.now() - databaseCloseStart,
  });
};

const getShadowingConfigForUrl = (url: URL): ShadowingConfig | undefined => {
  // We don't need to check `url.hostname` as your Worker's `routes` configuration
  // performs precursory filtering

  if (url.pathname === "/jaja/a.json") {
    return {
      url: "https://bwatkins.dev/jaja/b.json",
      percentSampleRate: 100,
      timeout: 5,
      tags: {
        // you can use whatever logic works for your use-case here!
        env: url.hostname === "bwatkins.dev" ? "production" : "develop",
        app: "jaja",
      },
    };
  }

  return undefined;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const config = getShadowingConfigForUrl(url);

    const parentId = request.headers.get("shadowing-parent-id");

    // It wouldn't hurt much but I don't want to encourage/end up
    // supporting underlying services acting on this header. So, let's
    // not leak it in the first place.
    const headers = new Headers(request.headers);
    headers.delete("shadowing-parent-id");
    request = new Request(request, {
      headers,
    });

    const start = Date.now();
    const res = await fetch(request);
    const end = Date.now();

    // We don't support shadowing pre-flight requests for now.
    if (request.method === "OPTIONS") {
      return res;
    }

    if (config) {
      if (
        config.percentSampleRate !== 100 &&
        Math.random() * 100 < config.percentSampleRate
      ) {
        console.log(
          `Skipping shadow due to sample rate (${config.percentSampleRate}%)`,
        );
        return res;
      }

      ctx.waitUntil(
        triggerAndProcessShadow(
          config,
          env,
          request.clone(),
          res.clone(),
          start,
          end,
          parentId,
        ),
      );
    }

    return res;
  },
};
