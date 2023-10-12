import { Client } from "pg";
import {
  Delta,
  create,
  formatters as diffFormattersIgnore,
} from "jsondiffpatch";

type ShadowingConfig = {
  targets: ShadowingTarget[];
};

type ShadowingTarget = {
  url: string;
  timeout: number;
  statuses?: number[];
  sampleRate: number;
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

const attempt = async <T, Err = Error>(fn: () => T | Promise<T>) => {
  try {
    return [await fn(), null] as const;
  } catch (error) {
    return [null, error as Err] as const;
  }
};

const getConfig = (url: URL): ShadowingConfig | undefined => {
  return {
    targets: [],
  };
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

const shadow = async (
  config: ShadowingConfig,
  env: Env,
  request: Request,
  control: Response,
  controlDuration: number,
) => {
  const to = new URL(config.targets[0].url);
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
          config.targets[0].timeout * 1000,
        ),
      ),
    ]);
  } catch (error) {
    ac.abort();
    console.error(`Failed to shadow '${to}'`, error);
    // TODO handle error
    return;
  }
  const duration = Date.now() - start;

  console.log(`Shadowed to '${to}'`, {
    duration,
    status: shadowed.status,
  });

  if (
    config.targets[0].statuses &&
    !config.targets[0].statuses.includes(shadowed.status)
  ) {
    console.error(
      `Not saving as '${
        shadowed.status
      }' is not one of ${config.targets[0].statuses.join(", ")}`,
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

  console.log("Trying to save");
  const databaseClientStart = Date.now();
  const client = await getClient(env);
  console.log("Opened database connection", {
    duration: Date.now() - databaseClientStart,
  });
  const databaseStart = Date.now();
  await client.query(
    "INSERT INTO requests (id, divergent, control, shadows) VALUES (gen_random_uuid(), $1, $2, $3);",
    [
      divergent,
      JSON.stringify({
        url: control.url,
        duration: controlDuration,
        status: control.status,
        request: {
          method: request.method,
          headers: Object.fromEntries(request.headers),
        },
        response: typeof a === "string" ? a : JSON.stringify(a),
      }),
      JSON.stringify([
        {
          url: shadowed.url,
          duration,
          status: shadowed.status,
          diff: {
            ...summary,
            patches,
          },
          headers: Object.fromEntries(shadowed.headers),
          response: typeof b === "string" ? b : JSON.stringify(b),
        },
      ]),
    ],
  );
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

    const config = getConfig(url);

    const start = Date.now();
    const res = await fetch(request);
    const total = Date.now() - start;
    if (config && config.targets.length >= 1) {
      const { sampleRate } = config.targets[0];
      if (sampleRate !== 1 && Math.random() < sampleRate) {
        console.log(
          `Skipping shadow due to sample rate (${sampleRate * 100}%)`,
        );
        return res;
      }

      if (request.method === "OPTIONS") {
        return res;
      }

      ctx.waitUntil(shadow(config, env, request.clone(), res.clone(), total));
    }
    return res;
  },
};
