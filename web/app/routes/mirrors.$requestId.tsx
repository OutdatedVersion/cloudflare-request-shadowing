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
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { quote as shellQuote } from 'shell-quote';

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
      `https://request-mirroring-api.nelnetvelocity.workers.dev/mirrors/${requestId}`,
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

const getCurlCommand = ({ control }: Mirror) => {
  const headers = Object.entries(control.request.headers)
    // TODO: is it even safe for the browser to get these headers?
    .filter(([k]) => !['true-client-ip', 'cf-connecting-ip'].includes(k))
    .map(([k, v]) => `-H '${k}: ${v}'`)
    .join(' ');

  let cmd = `curl -X ${shellQuote([
    control.request.method,
  ])} ${headers} ${shellQuote([control.url])}`;

  // We want the reproduction command to be as close as possible to the original request
  // Though the original client likely has a different gzip distribution than our user
  // this at least exercise's the server's compression subsystem in-case it is the issue.
  if (control.request.headers['accept-encoding'].indexOf('gzip') > -1) {
    cmd += ' | gzip -d';
  }

  return cmd;
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

            <div className="mt-10 font-mono bg-base-300 p-3 w-full rounded-sm relative">
              <div className="mb-2">
                <p className="px-1 bg-green-300 inline-block">Control</p>
                <p className="ml-2 px-1 bg-red-300 inline-block">Mirrored</p>
              </div>

              <div className="float-right absolute top-0 right-0">
                <div
                  className="tooltip"
                  data-tip={`${
                    showUnchanged ? 'Hide' : 'Show'
                  } similar properties`}
                >
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowUnchanged((prev) => !prev)}
                  >
                    {showUnchanged ? (
                      <EyeIcon className="h-5 w-5" />
                    ) : (
                      <EyeSlashIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

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
                    <CopyToClipboard getText={() => getCurlCommand(mirror)}>
                      As cURL
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
