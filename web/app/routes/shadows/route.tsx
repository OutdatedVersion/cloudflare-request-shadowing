import { defer, type LoaderArgs } from '@remix-run/cloudflare';
import {
  Await,
  Outlet,
  useLoaderData,
  useMatches,
  useNavigate,
  useSearchParams,
} from '@remix-run/react';
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
import cn from 'classnames';
import { Tag } from '~/components/Tag';

export const loader = async ({ request, context: { env } }: LoaderArgs) => {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') ?? 50;
  const tags = url.searchParams.getAll('tag');

  const divergencesParams = new URLSearchParams({
    limit: String(limit),
    divergent: 'true',
  });
  for (const tag of tags) {
    divergencesParams.append('tag', tag);
  }

  const divergences = await fetch(
    `${env.API_BASE_URL}/shadows?${divergencesParams}`,
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
            id: string;
            divergent: boolean;
            created_at: string;
            tags: Record<string, string> | null;
            control: {
              url: string;
              status: number;
            };
            shadow: {
              url: string;
              status: number;
            };
            diff: {
              added: number;
              removed: number;
              paths: string[];
            };
          }>;
        },
    )
    .then((resp) => resp.data);

  const aggregationParams = new URLSearchParams({
    lookbackPeriodHours: '24',
    rollupPeriodMinutes: '1',
  });
  for (const tag of tags) {
    aggregationParams.append('tag', tag);
  }

  return defer({
    divergences,
    aggregation: fetch(
      `${env.API_BASE_URL}/shadows/aggregation?${aggregationParams}`,
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

const TagSelector = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [txt, setTxt] = useState('');
  const [tags, setTags] = useState(
    Array.from(searchParams.entries()).map(([_, value]) => value),
  );
  useEffect(() => {
    setSearchParams(new URLSearchParams(tags.map((val) => ['tag', val])));
  }, [tags, setSearchParams, setTxt]);
  const [error, setError] = useState(undefined as string | undefined);

  const handleRemove = (tag: string) => {
    setTags(tags.filter((val) => val !== tag));
  };

  const handleButtonClick = () => {
    if (!/^([a-z0-9]+:[a-z0-9-]+)$/i.test(txt)) {
      setError(`Invalid tag format: '${txt}'. Expected 'tag:value'.`);
      return;
    }

    setTags([...tags, txt]);
    setTxt('');
  };

  return (
    <div className="mb-8">
      <div className="form-control w-full max-w-s">
        <input
          className={cn('input input-bordered w-full max-w-xs', {
            'input-error': !!error,
          })}
          type="text"
          placeholder="key:value"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyUp={(e) => (e.key === 'Enter' ? handleButtonClick() : undefined)}
        />
        {error && (
          <label className="label">
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
      </div>
      {tags.map((tag) => (
        <Tag key={tag} tag={tag} onRemove={handleRemove} />
      ))}
    </div>
  );
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

  const [mirrorHint, setMirrorHint] = useState<
    (typeof divergences)[number] | null
  >(null);

  // Open the details drawer if someone uses a direct link
  useEffect(() => {
    if (selectedRequestRoute && !drawerTrigger.current?.checked) {
      console.log('Toggling drawer');
      drawerTrigger.current?.click();
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
        <TagSelector />
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
                      tickFormatter={(val) =>
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
                  const digest = req.diff.paths.join('|');

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
                        nav(`/shadows/${req.id}`, { preventScrollReset: true });
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
                        {Object.entries(req.tags ?? {})
                          .map(([key, value]) => `${key}:${value}`)
                          .map((tag) => (
                            <Tag key={tag} tag={tag} />
                          ))}
                      </td>
                      <td>
                        {new URL(req.shadow.url).pathname}
                        {getStatusCodeBadge(req.shadow.status)}
                      </td>
                      <td>
                        <span className="font-medium text-green-600">
                          +{req.diff.added}
                        </span>
                        <span className="pl-1.5 font-medium text-red-600">
                          -{req.diff.removed}
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
            nav('/shadows', { preventScrollReset: true });
            setMirrorHint(null);
          }}
        ></label>
        <div className="p-4 w-full md:w-10/12 h-fit min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btm-circle btn-neutral float-right md:invisible"
            onClick={() => {
              nav('/shadows', { preventScrollReset: true });
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
