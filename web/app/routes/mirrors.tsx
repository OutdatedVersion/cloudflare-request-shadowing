import { defer, type LoaderArgs } from '@remix-run/cloudflare';
import {
  Await,
  Outlet,
  useLoaderData,
  useMatches,
  useNavigate,
} from '@remix-run/react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { Mirror } from '~/types';

export const loader = async (a: LoaderArgs) => {
  return defer({
    divergences: fetch(
      'https://request-mirroring-api.nelnetvelocity.workers.dev/mirrors?divergent',
      {
        headers: {
          authorization: 'idk scurvy-reuse-bulldozer',
        },
      },
    )
      .then((resp) => resp.json() as { data?: Mirror[] })
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
  const { divergences: loading } = useLoaderData<typeof loader>();
  const drawerTrigger = useRef<HTMLInputElement | null>(null);
  const nav = useNavigate();
  const matches = useMatches();

  const [mirrorHint, setMirrorHint] = useState<Mirror | null>(null);

  // Open the details drawer if someone uses a direct link
  const scheduled = useRef(false);
  useEffect(() => {
    const hasSelection = matches.some((m) => m.id.includes('$requestId'));
    if (hasSelection && !scheduled.current) {
      console.log('Toggling drawer');
      drawerTrigger.current?.click();
      scheduled.current = !scheduled.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <Suspense>
                <Await
                  resolve={loading}
                  children={(divergences) =>
                    divergences.map((req) => (
                      <tr
                        key={req.id}
                        className="hover cursor-pointer"
                        onClick={() => {
                          drawerTrigger.current?.click();
                          setMirrorHint(req);
                          nav(`/mirrors/${req.id}`);
                        }}
                      >
                        <td>
                          {formatDistanceToNow(parseISO(req.created_at), {
                            addSuffix: true,
                            includeSeconds: true,
                          }).replace('about', '')}
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
                    ))
                  }
                />
              </Suspense>
            </tbody>
          </table>
        </div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="main-drawer"
          className="drawer-overlay"
          onClick={() => {
            nav('/mirrors');
            setMirrorHint(null);
          }}
        ></label>
        <div className="p-4 w-full md:w-10/12 h-fit min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btm-circle btn-neutral float-right md:invisible"
            onClick={() => {
              nav('/mirrors');
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
