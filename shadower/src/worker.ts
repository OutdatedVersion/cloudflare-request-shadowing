import { NeonQueryFunction, neon } from "@neondatabase/serverless";
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
  statuses: number[];
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
  if (url.pathname === "/jaja/one/") {
    return {
      targets: [
        {
          // TODO: support relative URLs. update: only in UI.
          url: "https://bwatkins.dev/jaja/two/",
          timeout: 5,
          statuses: [200],
        },
      ],
    };
  }
};

const shadow = async (
  config: ShadowingConfig,
  query: NeonQueryFunction<false, false>,
  request: Request,
  control: Response,
  controlDuration: number,
) => {
  const to = config.targets[0].url;

  console.log(`shadowing to '${to}'`);

  let shadowed;
  const start = Date.now();
  try {
    shadowed = await Promise.race([
      fetch(
        new Request(to, {
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
    // TODO handle error
    return;
  }
  const duration = Date.now() - start;

  if (!config.targets[0].statuses.includes(shadowed.status)) {
    return;
  }

  const responses = await Promise.all([control.text(), shadowed.text()]);

  // TODO: based on `content-type` response header
  const [a, aErr] = await attempt(() => JSON.parse(responses[0]));
  const [b, bErr] = await attempt(() => JSON.parse(responses[1]));
  if (aErr || bErr) {
    return;
  }

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

  await query(
    "INSERT INTO requests (id, divergent, control, shadows) VALUES (gen_random_uuid(), $1, $2, $3);",
    [
      divergent,
      JSON.stringify({
        url: control.url,
        duration: controlDuration,
        status: control.status,
        response: responses[0],
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
          response: responses[1],
        },
      ]),
    ],
  );
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const config = getConfig(url);

    const start = Date.now();
    const res = await fetch(request);
    const total = Date.now() - start;
    if (config && config.targets.length >= 1) {
      ctx.waitUntil(
        shadow(
          config,
          neon(env.DATABASE_URL),
          request.clone(),
          res.clone(),
          total,
        ),
      );
    }
    return res;
  },
};
