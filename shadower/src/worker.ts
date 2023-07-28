import { NeonQueryFunction, neon } from "@neondatabase/serverless";
import { Change, diffJson } from "diff";

type ShadowingConfig = {
  targets: ShadowingTarget[];
};

type ShadowingTarget = {
  url: string;
  timeout: number;
  statuses: number[];
};

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

  const diff = diffJson(a, b, { ignoreWhitespace: true });
  const changes = diff.reduce(
    (prev, curr) => {
      if (curr.added) {
        prev.added += 1;
      } else if (curr.removed) {
        prev.removed += 1;
      } else {
        prev.kept += 1;
      }
      return prev;
    },
    { added: 0, removed: 0, kept: 0 },
  );
  const divergent = changes.added > 0 || changes.removed > 0;

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
            ...changes,
            patches: diff,
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
