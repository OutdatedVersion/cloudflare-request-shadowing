import { NeonQueryFunction, neon } from "@neondatabase/serverless";

type ShadowingConfig = {
  targets: ShadowingTarget[];
};

type ShadowingTarget = {
  url: string;
  timeout: number;
  statuses: number[];
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
    return;
  }
  const duration = Date.now() - start;

  if (!config.targets[0].statuses.includes(shadowed.status)) {
    return;
  }

  const responses = await Promise.all([control.text(), shadowed.text()]);

  await query(
    "INSERT INTO requests (id, control, shadows, created_at) VALUES (gen_random_uuid(), $1, $2, now());",
    [
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
