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
import { useDatadogRum } from './hooks/useDatadogRum';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
];

export default function App() {
  useDatadogRum();

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
