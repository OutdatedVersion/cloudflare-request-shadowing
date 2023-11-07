import { type LoaderArgs, json, defer } from '@remix-run/cloudflare';
import { Await, useLoaderData, useOutletContext } from '@remix-run/react';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { type ReactNode, Suspense, useEffect, useState } from 'react';
import { create, formatters } from 'jsondiffpatch';
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { quote as shellQuote } from 'shell-quote';
import cn from 'classnames';
import type { loader as rootLoader } from './shadows/route';
import type { PublicApi, PublicRequest } from '@local/schema';

import '~/diff.css';
import { Tag } from '~/components/Tag';
import { getAuthzCookie } from '~/auth';

const diff = create({
  objectHash: (obj: Record<string, unknown>) => {
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(',');
  },
});

export const loader = async ({
  request,
  params,
  context: { env },
}: LoaderArgs) => {
  const authzCookie = getAuthzCookie(request);
  if (!authzCookie) {
    throw json(
      {
        name: 'Unauthorized',
        message: 'Missing cookie',
      },
      {
        status: 401,
      },
    );
  }

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
    baseUrl: env.API_BASE_URL,
    mirror: fetch(`${env.API_BASE_URL}/shadows/${requestId}`, {
      headers: {
        cookie: authzCookie,
      },
    })
      .then((resp) => resp.json() as Promise<PublicApi['/shadows/:id']>)
      .then((resp) => resp.data),
  });
};

const getCurlCommand = ({ control }: PublicRequest) => {
  const headers = Object.entries(control.request.headers)
    // TODO: is it even safe for the browser to get these headers?
    .filter(([k]) => !['true-client-ip', 'cf-connecting-ip'].includes(k))
    .map(([k, v]) => `-H '${k}: ${v}'`)
    .join(' ');

  let cmd = `curl -X ${shellQuote([
    control.request.method,
  ])} ${headers} ${shellQuote([control.request.url])}`;

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

const Row = ({
  mirror,
  className,
  onClick,
}: {
  mirror: PublicRequest;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <tr className={className} onClick={onClick}>
      <td>{format(parseISO(mirror.created_at), 'Ppp')}</td>
      <td>{mirror.control.response.status}</td>
      <td
        className={cn({
          'text-yellow-600':
            mirror.control.response.status !== mirror.shadow.response.status,
        })}
      >
        {mirror.shadow.response.status}
      </td>
      <td>
        {mirror.diff?.added || mirror.diff?.removed ? (
          <>
            <span className="font-medium text-green-600">
              +{mirror.diff.added}
            </span>
            <span className="pl-1.5 font-medium text-red-600">
              -{mirror.diff.removed}
            </span>
          </>
        ) : (
          '✅'
        )}
      </td>
    </tr>
  );
};

const DiffView = ({ mirror }: { mirror: PublicRequest }) => {
  const [showUnchanged, setShowUnchanged] = useState(true);
  useEffect(() => {
    if (showUnchanged) {
      formatters.html.showUnchanged(true);
    } else {
      formatters.html.hideUnchanged();
    }
  }, [showUnchanged]);

  return (
    <>
      <div className="mb-2">
        <p
          className="px-1 inline-block dark:text-white"
          style={{ backgroundColor: 'rgb(74 222 128)' }}
        >
          Control
        </p>
        <p
          className="ml-2 px-1 inline-block dark:text-white"
          style={{ backgroundColor: 'rgb(248 113 113)' }}
        >
          Shadow
        </p>
      </div>

      <div className="float-right absolute top-0 right-0">
        <div
          className="tooltip"
          data-tip={`${showUnchanged ? 'Hide' : 'Show'} similar properties`}
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
                  JSON.parse(mirror.control.response.body),
                  null,
                  2,
                )
              }
            >
              Control response
            </CopyToClipboard>
            <CopyToClipboard
              getText={() =>
                JSON.stringify(JSON.parse(mirror.shadow.response.body), null, 2)
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
              JSON.parse(mirror.control.response.body),
              JSON.parse(mirror.shadow.response.body),
            )!,
            JSON.parse(mirror.control.response.body),
          ),
        }}
      />
    </>
  );
};

export default function MirroredRequest() {
  const { mirror: loadingMirror, baseUrl } = useLoaderData<typeof loader>();
  const { mirrorHint } = useOutletContext<{
    mirrorHint:
      | NonNullable<
          Awaited<ReturnType<typeof rootLoader>>['data']['divergences']
        >[number]
      | undefined;
  }>();

  const [selected, setSelected] = useState<PublicRequest>();

  return (
    <Suspense>
      <Await
        resolve={loadingMirror}
        children={(mirror) => (
          <div>
            <div>
              <div className="badge badge-info inline-block">
                {new URL(mirror.control.request.url).hostname}
              </div>

              {mirror.tags &&
                Object.entries(mirror.tags).map(([k, v]) => (
                  <Tag key={k} tag={`${k}:${v}`} />
                ))}
            </div>

            <h1 className="inline-block text-xl font-bold mt-2">
              <span>{mirror.control.request.method.toUpperCase()}</span>
              <span className="pl-2">
                {new URL(mirror.control.request.url).pathname +
                  new URL(mirror.control.request.url).search}
              </span>
            </h1>

            <div className="tooltip tooltip-bottom" data-tip={'Replay request'}>
              <button
                className="ml-1.5 btn btn-xs btn-secondary"
                onClick={() => {
                  fetch(`${baseUrl}/shadows/${mirror.id}/replay`, {
                    method: 'post',
                    headers: {
                      authorization: 'Bearer scurvy-reuse-bulldozer',
                    },
                  });
                }}
              >
                <ArrowPathIcon className="w-5" />
              </button>
            </div>

            <div className="mt-10">
              <table className="table">
                <thead>
                  <th>Sent at</th>
                  <th>Control status</th>
                  <th>Shadow status</th>
                  <th>Changes</th>
                </thead>
                <tbody>
                  {[mirror, ...(mirror.replays ?? [])].map((m, idx) => (
                    <Row
                      key={m.id}
                      mirror={m}
                      className={cn('cursor-pointer', {
                        'bg-base-300':
                          (!selected && idx === 0) || selected?.id === m.id,
                      })}
                      onClick={() => {
                        setSelected(m);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 font-mono bg-base-300 p-3 w-full rounded-sm relative">
              {(selected ?? mirror).diff ? (
                <DiffView mirror={selected ?? mirror} />
              ) : (
                <>
                  <p>Responses match 🥳</p>
                  <pre className="mt-2">
                    {JSON.stringify(
                      JSON.parse((selected ?? mirror).shadow.response.body),
                      null,
                      2,
                    )}
                  </pre>
                </>
              )}
            </div>

            <div className="mt-10">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <th>Shadow response header</th>
                    <th>Value</th>
                  </thead>
                  <tbody>
                    {Object.entries(
                      (selected ?? mirror).shadow.response.headers,
                    ).map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      />
    </Suspense>
  );
}
