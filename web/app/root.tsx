import type { LinksFunction } from '@remix-run/cloudflare';
import { cssBundleHref } from '@remix-run/css-bundle';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import stylesheet from '~/tailwind.css';
import { useHydrated } from 'remix-utils';
import { useEffect, useRef } from 'react';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
];

export default function App() {
  const hydrated = useHydrated();
  const initializedDatadogRum = useRef(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (initializedDatadogRum.current) {
      console.log('Skipping Datadog RUM start: Already started');
      return;
    }

    initializedDatadogRum.current = true;

    import('@datadog/browser-rum').then(({ datadogRum }) => {
      datadogRum.init({
        applicationId: 'd7972898-a384-45e2-aca0-3d88fa6f0730',
        clientToken: 'pub9c239a8430cb5d0453eac3df419c0d49',
        site: 'datadoghq.com',
        service: 'request-mirroring',
        env: 'dev',
        version: '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      datadogRum.startSessionReplayRecording();
      console.log('Started Datadog RUM');
    });
  }, [hydrated]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
