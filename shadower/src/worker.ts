import { formatDistanceToNow, parseISO } from 'date-fns';
import { diffString } from 'json-diff';
import { NeonQueryFunction, neon } from '@neondatabase/serverless';

type ShadowingConfig = {
  targets: ShadowingTarget[];
};

type ShadowingTarget = {
  url: string;
  timeout: number;
  statuses: number[];
};

type StoredRequest = {
  url: string;
  duration: number;
  status: number;
  response: string;
};

const getConfig = (url: URL): ShadowingConfig | undefined => {
  console.log(url.pathname);
  if (url.pathname === '/jaja/one/') {
    return {
      targets: [
        {
          // TODO: support relative URLs. update: only in UI.
          url: 'https://bwatkins.dev/jaja/two/',
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
          () => reject(new Error('request did not complete')),
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
    'INSERT INTO requests (id, control, shadows, created_at) VALUES (gen_random_uuid(), $1, $2, now());',
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

const getDiffHtml = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  const changes = diffString(a, b, {
    color: false,
    keepUnchangedValues: true,
  });

  return changes;
};

const getHtml = (
  requests: Array<{
    id: string;
    created_at: Date;
    control: StoredRequest;
    shadows: StoredRequest[];
  }>,
) => {
  return `<html>
    <head>
        <title>Things</title>
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@3.5.0/dist/full.css" rel="stylesheet" type="text/css" />
    </head>
    <body data-theme="cmyk">
    <div class="py-12 mx-4 md:mx-12">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th>Original request to</th>
              <th>Shadowed request to</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
          ${requests
            .map((req) => {
              return `<tr class="hover">
            <td>${formatDistanceToNow(req.created_at, {
              addSuffix: true,
              includeSeconds: true,
            })}</td>
            <td>${new URL(req.control.url).pathname}</td>
            <td>${new URL(req.shadows[0].url).pathname}</td>
            <td>
                <span class="font-medium text-green-600">+0</span>
                <span class="px-1 font-medium text-neutral-500">0</span>
                <span class="font-medium text-red-600">-0</span>
            </td>
          </tr>`;
            })
            .join('')}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === '/shadow' || url.pathname === '/shadow/api') {
      const query = neon(env.DATABASE_URL);

      const rows = (await query(
        'SELECT * FROM requests ORDER BY created_at DESC LIMIT 25;',
      )) as [];

      if (url.pathname === '/shadow/api') {
        return new Response(JSON.stringify({ requests: rows }, null, 2), {
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      if (rows.length < 1) {
        return new Response('no requests');
      }

      return new Response(getHtml(rows), {
        headers: {
          'content-type': 'text/html',
        },
      });
    }

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
