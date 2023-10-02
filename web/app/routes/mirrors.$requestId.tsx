import { type LoaderArgs, json, defer } from '@remix-run/cloudflare';
import { Await, useLoaderData, useOutletContext } from '@remix-run/react';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { type ReactNode, Suspense, useEffect, useState } from 'react';
import type { Mirror } from '~/types';
import { create, formatters } from 'jsondiffpatch';
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

import '~/diff.css';

const diff = create({
  objectHash: (obj: Record<string, unknown>) => {
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(',');
  },
});

export const loader = async ({ params }: LoaderArgs) => {
  const { requestId } = params;

  if (!requestId) {
    throw json(
      {
        error: 'missing `requestId`',
      },
      {
        status: 400,
      },
    );
  }

  return defer({
    mirror: fetch(
      `https://request-shadowing-demo.bwatkins.dev/mirrors/${requestId}`,
      {
        headers: {
          authorization: 'idk scurvy-reuse-bulldozer',
        },
      },
    )
      .then((resp) => resp.json() as { data?: Mirror })
      .then((resp) => resp.data),
  });
};

const CopyToClipboard = ({
  getText,
  children,
}: {
  children: ReactNode;
  getText: () => string;
}) => {
  const [done, setDone] = useState<boolean>();

  const onClick = () => {
    const text = getText();
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 750);
  };

  return (
    <button
      className="btn btn-primary btn-sm w-full p-0.5 normal-case"
      onClick={onClick}
    >
      {done ? <ClipboardDocumentCheckIcon className="h-5 w-5" /> : children}
    </button>
  );
};

export default function MirroredRequest() {
  const { mirror: serverMirror } = useLoaderData<typeof loader>();
  const { mirrorHint: clientMirrorHint } = useOutletContext<{
    mirrorHint: Mirror;
  }>();
  const [loadingMirror] = useState(clientMirrorHint ?? serverMirror);

  const [showUnchanged, setShowUnchanged] = useState(true);
  useEffect(() => {
    if (showUnchanged) {
      formatters.html.showUnchanged(true);
    } else {
      formatters.html.hideUnchanged();
    }
  }, [showUnchanged]);

  return (
    <Suspense>
      <Await
        resolve={loadingMirror}
        children={(mirror) => (
          <div>
            <h1 className="text-lg font-bold">
              {mirror.control.request.method}{' '}
              {new URL(mirror.control.url).pathname +
                new URL(mirror.control.url).search}
            </h1>
            <p className="text-md text-neutral-500">
              {format(parseISO(mirror.created_at), 'Pp')}
            </p>
            <p className="text-neutral-400 text-md">
              {mirror.control.status} {mirror.control.duration}ms
            </p>

            <div className="mt-14">
              <p>
                <span className="bg-green-300">Green</span> is control
              </p>
              <p>
                <span className="bg-red-300">Red</span> is mirrored
              </p>
            </div>

            <div className="form-control w-52">
              <label className="label cursor-pointer">
                <span className="label-text">Show similar properties</span>
                <input
                  type="checkbox"
                  checked={showUnchanged}
                  className="toggle toggle-sm my-4"
                  onChange={() => setShowUnchanged((prev) => !prev)}
                />
              </label>
            </div>

            <div className="font-mono bg-base-300 p-3 w-fit rounded-sm relative">
              <div className="float-right absolute top-0 right-0">
                <div className="dropdown dropdown-bottom dropdown-end dropdown-hover">
                  <label tabIndex={0} className="m-1 btn btn-ghost">
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </label>
                  <div
                    tabIndex={0}
                    className="dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 grid gap-2"
                  >
                    <CopyToClipboard
                      getText={() =>
                        JSON.stringify(
                          JSON.parse(mirror.control.response),
                          null,
                          2,
                        )
                      }
                    >
                      Control response
                    </CopyToClipboard>
                    <CopyToClipboard
                      getText={() =>
                        JSON.stringify(
                          JSON.parse(mirror.shadows[0].response),
                          null,
                          2,
                        )
                      }
                    >
                      Shadow response
                    </CopyToClipboard>
                  </div>
                </div>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: formatters.html.format(
                    diff.diff(
                      JSON.parse(mirror.control.response),
                      JSON.parse(mirror.shadows[0].response),
                    )!,
                    JSON.parse(mirror.control.response),
                  ),
                }}
              />
            </div>
          </div>
        )}
      />
    </Suspense>
  );
}
