import { neon } from '@neondatabase/serverless';
import {
  json,
  type LoaderArgs,
  type V2_MetaFunction,
} from '@remix-run/cloudflare';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import {
  Card,
  Grid,
  Col,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  AreaChart,
  Metric,
  Text,
} from '@tremor/react';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
import set from 'date-fns/set';
import subMinutes from 'date-fns/subMinutes';
import { useEffect } from 'react';

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
  const revalidator = useRevalidator();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        revalidator.revalidate();
      }
    }, 5_000);
    return () => clearInterval(interval);
  });

  return (
    <div className="py-8 mx-4 md:mx-8">
      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-2">
        <Col>
          <Card>
            <Text>Divergent</Text>
            <Metric>
              {totals.reduce((total, curr) => total + curr.divergent, 0)}
            </Metric>
          </Card>
        </Col>
        <Col>
          <Card>
            <Text>Total</Text>
            <Metric>
              {totals.reduce((total, curr) => total + curr.total, 0)}
            </Metric>
          </Card>
        </Col>
        <Col numColSpanSm={2} numColSpanLg={2}>
          <Card className="p-2">
            <AreaChart
              showGradient={false}
              className="max-h-56"
              data={totals
                .map((t) => ({
                  Divergent: t.divergent,
                  Total: t.total,
                  bin: format(parseISO(t.bin), 'K:mmaaa'),
                }))
                .reverse()}
              index="bin"
              categories={['Divergent', 'Total']}
              colors={['rose', 'zinc']}
              valueFormatter={(num) => `${num}`}
            />
          </Card>
        </Col>
      </Grid>
      <Table className="mt-14">
        <TableHead>
          <TableRow>
            <TableHeaderCell></TableHeaderCell>
            <TableHeaderCell>Original request to</TableHeaderCell>
            <TableHeaderCell>Shadowed request to</TableHeaderCell>
            <TableHeaderCell>Changes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {divergences.map((req) => (
            <TableRow
              key={req.id}
              className="transition-colors duration-100 hover:bg-gray-200"
            >
              <TableCell>
                {formatDistanceToNow(parseISO(req.created_at), {
                  addSuffix: true,
                  includeSeconds: true,
                }).replace('about', '')}
              </TableCell>
              <TableCell>{new URL(req.control.url).pathname}</TableCell>
              <TableCell>{new URL(req.shadows[0].url).pathname}</TableCell>
              <TableCell>
                <span className="font-medium text-green-600">
                  +{req.shadows[0].diff.added}
                </span>
                <span className="px-1 font-medium text-neutral-500">
                  {req.shadows[0].diff.kept}
                </span>
                <span className="font-medium text-red-600">
                  -{req.shadows[0].diff.removed}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
