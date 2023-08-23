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
    { title: 'Request mirroring' },
    { name: 'description', content: 'View mirrored requests' },
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
  control: Stored & {
    request: { method: string; headers: Record<string, string> };
  };
  shadows: Stored[];
}

export const loader = async ({ context }: LoaderArgs) => {
  const divergencesQueryStart = Date.now();
  const divergences = (
    (await (
      await fetch('https://request-shadowing-demo.bwatkins.dev/api/data', {
        headers: {
          authorization: 'idk scurvy-reuse-bulldozer',
        },
      })
    ).json()) as any
  ).divergences as A[];
  const divergencesQuery = Date.now() - divergencesQueryStart;

  return json(
    { divergences },
    {
      headers: {
        'server-timing': `dq;dur=${divergencesQuery}`,
      },
    },
  );
};

export default function Index() {
  const { divergences } = useLoaderData<typeof loader>();
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
                  <td>
                    {new URL(req.control.url).pathname}
                    {req.control.status !== 200 ? (
                      <span className="ml-2 badge badge-sm badge-error text-white">
                        {req.control.status}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {new URL(req.shadows[0].url).pathname}
                    {req.shadows[0].status !== 200 ? (
                      <span className="ml-2 badge badge-sm badge-error text-white">
                        {req.shadows[0].status}
                      </span>
                    ) : null}
                  </td>
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
        <div className="p-4 w-full md:w-10/12 h-fit min-h-full bg-base-200 text-base-content">
          <button
            className="btn btn-sm btm-circle btn-neutral float-right md:invisible"
            onClick={() => drawerTrigger.current?.click()}
          >
            x
          </button>

          {selectedRequest ? (
            <div>
              <h1 className="text-lg font-bold">
                {selectedRequest.control.request.method}{' '}
                {new URL(selectedRequest.control.url).pathname +
                  new URL(selectedRequest.control.url).search}
              </h1>
              <p className="text-md text-neutral-500">
                {format(parseISO(selectedRequest.created_at), 'Pp')}
              </p>
              <p className="text-neutral-400 text-md">
                {selectedRequest.control.status}{' '}
                {selectedRequest.control.duration}ms
              </p>

              <div className="mt-14">
                <p>
                  <span className="bg-red-300">Red</span> is control
                </p>
                <p>
                  <span className="bg-green-300">Green</span> is mirrored
                </p>
              </div>

              <div className="form-control w-52">
                <label className="label cursor-pointer">
                  <span className="label-text">Show similar properties</span>
                  <input
                    type="checkbox"
                    checked={unchanged}
                    className="toggle toggle-sm my-4"
                    onChange={() => setUnchanged((prev) => !prev)}
                  />
                </label>
              </div>

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
