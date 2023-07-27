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
  Title,
  AreaChart,
} from '@tremor/react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import parseISO from 'date-fns/parseISO';
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
  response: string;
}

interface A {
  id: string;
  created_at: string;
  control: Stored;
  shadows: Stored[];
}

export const loader = async ({ context }: LoaderArgs) => {
  const query = neon(context.env.DATABASE_URL as string);

  const result = (await query(
    'SELECT * FROM requests ORDER BY created_at DESC LIMIT 25;',
  )) as A[];

  return json(result, 200);
};

const chartdata = [
  {
    date: '11:00am',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '12:00pm',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '1:00pm',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '2:00pm',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '3:00pm',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '4:00pm',
    Total: 0,
    Divergent: 0,
  },
  {
    date: '5:00pm',
    Total: 0,
    Divergent: 0,
  },
];

export default function Index() {
  const requests = useLoaderData<typeof loader>();
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
        <Col numColSpanSm={2} numColSpanLg={2}>
          <Card className="p-2">
            <Title className="pl-2">Divergent requests</Title>
            <AreaChart
              showGradient={false}
              className="max-h-56"
              data={chartdata}
              index="date"
              categories={['Total', 'Divergent']}
              colors={['zinc', 'rose']}
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
          {requests.map((req) => (
            <TableRow
              key={req.id}
              className="transition-colors duration-100 hover:bg-gray-200"
            >
              <TableCell>
                {formatDistanceToNow(parseISO(req.created_at), {
                  addSuffix: true,
                }).replace('about', '')}
              </TableCell>
              <TableCell>{new URL(req.control.url).pathname}</TableCell>
              <TableCell>{new URL(req.shadows[0].url).pathname}</TableCell>
              <TableCell>
                <span className="font-medium text-green-600">+0</span>
                <span className="px-1 font-medium text-neutral-500">0</span>
                <span className="font-medium text-red-600">-0</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
