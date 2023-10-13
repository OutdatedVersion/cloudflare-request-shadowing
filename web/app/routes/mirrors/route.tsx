import { defer, type LoaderArgs } from '@remix-run/cloudflare';
import {
  Await,
  Outlet,
  useLoaderData,
  useMatches,
  useNavigate,
} from '@remix-run/react';
import differenceInHours from 'date-fns/differenceInHours';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Mirror } from '~/types';
import cn from 'classnames';

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') ?? 50;

  const divergences = await fetch(
    `https://request-mirroring-api.nelnetvelocity.workers.dev/mirrors?divergent&limit=${limit}`,
    {
      headers: {
        authorization: 'Bearer scurvy-reuse-bulldozer',
      },
    },
  )
    .then((resp) => resp.json() as { data?: Mirror[] })
    .then((resp) => resp.data);

  const lookback = divergences
    ? differenceInHours(
        new Date(),
        parseISO(divergences[divergences.length - 1].created_at),
      ) + 1
    : 4;

  return defer({
    divergences,
    aggregation: fetch(
      `https://request-mirroring-api.nelnetvelocity.workers.dev/mirrors/aggregation?lookbackPeriodHours=${lookback}&rollupPeriodMinutes=1`,
      {
        headers: {
          authorization: 'Bearer scurvy-reuse-bulldozer',
        },
      },
    )
      .then(
        (resp) =>
          resp.json() as {
            data?: Array<{
              start: string;
              end: string;
              total: number;
              divergent: number;
            }>;
          },
      )
      .then((resp) => resp.data),
  });
};

const getStatusCodeBadge = (statusCode: number) => {
  switch (statusCode) {
    case 200:
      return null;
    default:
      return (
        <span className="ml-2 badge badge-sm badge-error text-white">
          {statusCode}
        </span>
      );
  }
};

export default function MirrorsList() {
  const { divergences, aggregation } = useLoaderData<typeof loader>();
  const drawerTrigger = useRef<HTMLInputElement | null>(null);
  const nav = useNavigate();
  const matches = useMatches();
  const selectedRequestRoute = useMemo(
    () => matches.find((m) => m.id.includes('$requestId')),
    [matches],
  );

  const [mirrorHint, setMirrorHint] = useState<Mirror | null>(null);

  // Open the details drawer if someone uses a direct link
  const scheduled = useRef(false);
  useEffect(() => {
    if (selectedRequestRoute && !scheduled.current) {
      console.log('Toggling drawer');
      drawerTrigger.current?.click();
      scheduled.current = !scheduled.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const responseGroups = useRef(new Map<string, string>());
  const responseGroupsIdx = useRef(0);
  const [responseGroupsIdxState, setResponseGroupsIdxState] = useState(0);

  return (
    <div className="drawer drawer-end">
      <input
        ref={drawerTrigger}
        id="main-drawer"
        type="checkbox"
        className="drawer-toggle"
      />
      <div className="drawer-content py-8 mx-4 md:mx-8">
        <div className="mb-8">
          <Suspense
            fallback={
              <div className="w-full h-96 rounded-md bg-base-200 animate-pulse" />
            }
          >
            <Await
              resolve={aggregation}
              children={(data) => (
                <ResponsiveContainer height={400} width="100%">
                  <AreaChart data={data} height={300} width={600}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      allowDataOverflow
                      dataKey="end"
                      tickSize={10}
                      tickFormatter={(val, idx) =>
                        format(parseISO(val), 'h:mmaaa')
                      }
                      type="category"
                    />
                    <YAxis />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || !payload.length) {
                          return null;
                        }

                        const idk = payload[0].payload as (typeof data)[number];
                        const pct =
                          idk.total !== 0 &&
                          ` ${((idk.divergent / idk.total) * 100).toFixed(
                            0,
                          )}% divergent`;

                        return (
                          <div className="p-2 bg-gray-200 rounded-sm text-black">
                            <div className="font-bold">
                              {format(parseISO(idk.start), 'h:mmaaa')} to{' '}
                              {format(parseISO(idk.end), 'h:mmaaa')}
                            </div>
                            <div className="mt-1.5">Total: {idk.total}</div>
                            <div>Divergent: {idk.divergent}</div>
                            <div className="mt-1.5">{pct}</div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Area dataKey="total" stroke="#75716f" fill="#75716f" />
                    <Area
                      dataKey="divergent"
                      stroke="rgb(185 28 28)"
                      fill="rgb(185 28 28)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />
          </Suspense>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>
                  <div
                    className="tooltip tooltip-bottom before:whitespace-pre-wrap"
                    data-tip={`Shadowed responses which share differing keys will be grouped together\n\nShowing ${responseGroupsIdxState} groups`}
                  >
                    Group
                  </div>
                </th>
                <th>Original request to</th>
                <th>Shadowed request to</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {divergences
                .map((req) => {
                  const digest = req.shadows[0].diff.patches
                    .map((d) => d.path)
                    .join('|');

                  let bucket = responseGroups.current.get(digest);
                  if (bucket === undefined) {
                    const startingEmoji = 0x1f950;
                    bucket = String.fromCodePoint(
                      startingEmoji + responseGroupsIdx.current++,
                    );
                    responseGroups.current.set(digest, bucket);
                    setResponseGroupsIdxState(responseGroupsIdx.current);
                  }

                  return { ...req, digest, digestEmoji: bucket };
                })
                .map((req, _, array) => {
                  return (
                    <tr
                      key={req.id}
                      className={cn('hover cursor-pointer', {
                        'bg-base-200':
                          selectedRequestRoute?.params.requestId === req.id,
                      })}
                      onClick={() => {
                        drawerTrigger.current?.click();
                        setMirrorHint(req);
                        nav(`/mirrors/${req.id}`, { preventScrollReset: true });
                      }}
                    >
                      <td>
                        {formatDistanceToNow(parseISO(req.created_at), {
                          addSuffix: true,
                          includeSeconds: true,
                        }).replace('about', '')}
                      </td>
                      <td>
                        <span
                          className="text-2xl tooltip tooltip-bottom before:whitespace-pre-wrap"
                          data-tip={`${array.reduce(
                            (num, curr) =>
                              num +
                              (req.digestEmoji === curr.digestEmoji ? 1 : 0),
                            0,
                          )} ${req.digestEmoji} total`}
                        >
                          {req.digestEmoji}
                        </span>
                      </td>
                      <td>
                        {new URL(req.control.url).pathname}
                        {getStatusCodeBadge(req.control.status)}
                      </td>
                      <td>
                        {new URL(req.shadows[0].url).pathname}
                        {getStatusCodeBadge(req.shadows[0].status)}
                      </td>
                      <td>
                        <span className="font-medium text-green-600">
                          +{req.shadows[0].diff.added}
                        </span>
                        <span className="pl-1.5 font-medium text-red-600">
                          -{req.shadows[0].diff.removed}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="main-drawer"
          className="drawer-overlay"
          onClick={() => {
            nav('/mirrors', { preventScrollReset: true });
            setMirrorHint(null);
          }}
        ></label>
        <div className="p-4 w-full md:w-10/12 h-fit min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btm-circle btn-neutral float-right md:invisible"
            onClick={() => {
              nav('/mirrors', { preventScrollReset: true });
              setMirrorHint(null);
              drawerTrigger.current?.click();
            }}
          >
            x
          </button>
          <Outlet context={{ mirrorHint }} />
        </div>
      </div>
    </div>
  );
}
