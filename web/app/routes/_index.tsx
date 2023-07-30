import { neon } from '@neondatabase/serverless';
import {
  json,
  type LoaderArgs,
  type V2_MetaFunction,
} from '@remix-run/cloudflare';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
import set from 'date-fns/set';
import subMinutes from 'date-fns/subMinutes';
import { useEffect, useRef, useState } from 'react';
import { create, formatters } from 'jsondiffpatch';

import '~/diff.css';

const diff = create({
  objectHash: (obj: Record<string, unknown>) => {
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(',');
  },
});

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

interface Stored {
  url: string;
  status: number;
  duration: number;
  diff: {
    added: number;
    removed: number;
    kept: number;
    patches: [];
  };
  response: string;
}

interface A {
  id: string;
  created_at: string;
  divergent: boolean;
  control: Stored;
  shadows: Stored[];
}

export const loader = async ({ context }: LoaderArgs) => {
  const query = neon(context.env.DATABASE_URL as string);

  const totalsQueryStart = Date.now();
  const incompleteTotals = (await query(
    `SELECT 
      count(divergent)::int AS total,
      sum(divergent::int)::int AS divergent,
      date_bin(
        '30 minute'::interval,
        created_at,
        now() - '4 hours'::interval
      ) AS bin
     FROM
      requests
     WHERE 
      now() - '4 hours'::interval <= created_at
     GROUP BY
      bin
     ORDER BY
      bin DESC;`,
  )) as Array<{ total: number; divergent: number; bin: Date }>;
  const totalsQuery = Date.now() - totalsQueryStart;

  const totals = Array(4 * 2)
    .fill(undefined)
    .map((_, idx) => {
      const bin = subMinutes(
        set(new Date(), {
          seconds: 0,
          milliseconds: 0,
        }),
        30 * idx,
      ).toISOString();

      const match = incompleteTotals.find(
        (t) =>
          set(t.bin, {
            seconds: 0,
            milliseconds: 0,
          }).toISOString() === bin,
      );

      return {
        bin,
        total: match?.total ?? 0,
        divergent: match?.divergent ?? 0,
      };
    });

  const divergencesQueryStart = Date.now();
  const divergences = (await query(
    'SELECT * FROM requests WHERE divergent IS TRUE ORDER BY created_at DESC LIMIT 25;',
  )) as A[];
  const divergencesQuery = Date.now() - divergencesQueryStart;

  return json(
    { totals, divergences },
    {
      headers: {
        'server-timing': `tq;dur=${totalsQuery},dq;dur=${divergencesQuery}`,
      },
    },
  );
};

export default function Index() {
  const { divergences, totals } = useLoaderData<typeof loader>();
  const [selectedRequest, setSelectedRequest] = useState<A>();
  const revalidator = useRevalidator();
  const drawerTrigger = useRef<HTMLInputElement | null>(null);

  const [unchanged, setUnchanged] = useState(true);
  useEffect(() => {
    if (unchanged) {
      formatters.html.showUnchanged(true);
    } else {
      formatters.html.hideUnchanged();
    }
  }, [unchanged]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        revalidator.revalidate();
      }
    }, 5_000);
    return () => clearInterval(interval);
  });

  return (
    <div className="drawer drawer-end">
      <input
        ref={drawerTrigger}
        id="main-drawer"
        type="checkbox"
        className="drawer-toggle"
      />
      <div className="drawer-content py-8 mx-4 md:mx-8">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Original request to</th>
                <th>Shadowed request to</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {divergences.map((req) => (
                <tr
                  key={req.id}
                  className="hover cursor-pointer"
                  onClick={() => {
                    setSelectedRequest(req);
                    drawerTrigger.current?.click();
                  }}
                >
                  <td>
                    {formatDistanceToNow(parseISO(req.created_at), {
                      addSuffix: true,
                      includeSeconds: true,
                    }).replace('about', '')}
                  </td>
                  <td>{new URL(req.control.url).pathname}</td>
                  <td>{new URL(req.shadows[0].url).pathname}</td>
                  <td>
                    <span className="font-medium text-green-600">
                      +{req.shadows[0].diff.added}
                    </span>
                    <span className="px-1 font-medium text-neutral-500">
                      {req.shadows[0].diff.kept}
                    </span>
                    <span className="font-medium text-red-600">
                      -{req.shadows[0].diff.removed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="drawer-side">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <div className="p-4 w-full md:w-9/12 h-fit min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btm-circle btn-neutral float-right md:invisible"
            onClick={() => drawerTrigger.current?.click()}
          >
            x
          </button>

          {selectedRequest ? (
            <div>
              <h1 className="text-lg font-bold">
                Request to {selectedRequest.control.url}
              </h1>
              <p className="text-md text-neutral-500">
                {format(parseISO(selectedRequest.created_at), 'Pp')}
              </p>
              <p className="text-neutral-400 text-md">
                {selectedRequest.control.status}{' '}
                {selectedRequest.control.duration}ms
              </p>

              <input
                type="checkbox"
                checked={unchanged}
                className="checkbox mt-14 checkbox-sm"
                onChange={() => setUnchanged((prev) => !prev)}
              />
              <div
                className="font-mono bg-base-300 p-3 w-fit rounded-sm"
                dangerouslySetInnerHTML={{
                  __html: formatters.html.format(
                    diff.diff(
                      JSON.parse(selectedRequest.control.response),
                      JSON.parse(selectedRequest.shadows[0].response),
                    )!,
                    JSON.parse(selectedRequest.control.response),
                  ),
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
