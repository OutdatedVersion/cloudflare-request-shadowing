import { Client } from "pg";
import {
  Delta,
  create,
  formatters as diffFormattersIgnore,
} from "jsondiffpatch";
import { encrypt, generateKey } from "@local/encryption";

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

const getShadowingConfigForUrl = (url: URL): ShadowingConfig | undefined => {
  return undefined;
};

const getResponseBody = (res: Response) => {
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return res.json();
  } else {
    return res.text();
  }
};

const getClient = async (env: Env) => {
  const config = {
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT, 10),
    database: env.DB_NAME,
  } as const;
  const client = new Client(config);
  await client.connect();
  return client;
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
    // TODO handle error
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
  const divergent = summary.added > 0 || summary.removed > 0;

  console.log("Generating encryption key");
  const cryptoKey = await generateKey(env.ENCRYPTION_SECRET);

  console.log("Trying to save");

  const controlData = {
    url: control.url,
    duration: controlEndedAt - controlStartedAt,
    startedAt: controlStartedAt,
    endedAt: controlEndedAt,
    status: control.status,
    request: {
      method: request.method,
      headers: await encrypt(
        JSON.stringify(Object.fromEntries(request.headers)),
        cryptoKey,
      ),
    },
    response: await encrypt(
      typeof a === "string" ? a : JSON.stringify(a),
      cryptoKey,
    ),
  };
  const shadowData = {
    url: shadowed.url,
    duration: end - start,
    startedAt: start,
    endedAt: end,
    status: shadowed.status,
    diff: {
      ...summary,
      paths: patches.map((p) => p.path),
      patches: await encrypt(JSON.stringify(patches), cryptoKey),
    },
    headers: await encrypt(
      JSON.stringify(Object.fromEntries(shadowed.headers)),
      cryptoKey,
    ),
    response: await encrypt(
      typeof b === "string" ? b : JSON.stringify(b),
      cryptoKey,
    ),
  };

  const databaseClientStart = Date.now();
  const client = await getClient(env);
  console.log("Opened database connection", {
    duration: Date.now() - databaseClientStart,
  });
  const databaseStart = Date.now();

  if (parentId) {
    console.log("Recognized as replay", { parentId });
    await client.query(
      "UPDATE requests SET replays = COALESCE(replays, '[]'::jsonb) || $2 WHERE id = $1;",
      [
        parentId,
        JSON.stringify([
          {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            divergent,
            control: controlData,
            shadows: [shadowData],
          },
        ]),
      ],
    );
  } else {
    await client.query(
      "INSERT INTO requests (id, divergent, control, shadows, tags) VALUES (gen_random_uuid(), $1, $2, $3, $4);",
      [
        divergent,
        JSON.stringify(controlData),
        JSON.stringify([shadowData]),
        JSON.stringify(config.tags),
      ],
    );
  }

  console.log("Saved to database", { duration: Date.now() - databaseStart });
  const databaseCloseStart = Date.now();
  await client.end();
  console.log("Closed database connection", {
    duration: Date.now() - databaseCloseStart,
  });
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
    headers.delete("shadowing-private-id");
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
