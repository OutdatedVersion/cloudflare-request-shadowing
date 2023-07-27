import type { V2_MetaFunction } from '@remix-run/cloudflare';
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

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

const data = [
  {
    id: 'e3bd6db4-b072-4cfd-b60e-2cd50569f5b5',
    created_at: '2023-07-27T04:41:03.892Z',
    control: {
      url: 'https://bwatkins.dev/jaja/one/',
    },
    shadow: {
      url: 'https://bwatkins.dev/jaja/two/',
    },
    diff: {
      added: 5,
      removed: 2,
      kept: 4,
    },
  },
  {
    id: '5ac1b88d-db20-426c-b1a1-9a4a80a21eef',
    created_at: '2023-07-27T04:41:03.892Z',
    control: {
      url: 'https://bwatkins.dev/jaja/one/',
    },
    shadow: {
      url: 'https://bwatkins.dev/jaja/two/',
    },
    diff: {
      added: 33,
      removed: 1,
      kept: 12,
    },
  },
];

const chartdata = [
  {
    date: '11:00am',
    Total: 230,
    Divergent: 0,
  },
  {
    date: '12:00pm',
    Total: 200,
    Divergent: 2,
  },
  {
    date: '1:00pm',
    Total: 230,
    Divergent: 5,
  },
  {
    date: '2:00pm',
    Total: 340,
    Divergent: 280,
  },
  {
    date: '3:00pm',
    Total: 400,
    Divergent: 290,
  },
  {
    date: '4:00pm',
    Total: 480,
    Divergent: 23,
  },
  {
    date: '5:00pm',
    Total: 430,
    Divergent: 30,
  },
];

export default function Index() {
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
          {data.map((d) => (
            <TableRow
              key={d.id}
              className="transition-colors duration-100 hover:bg-gray-200"
            >
              <TableCell>
                {formatDistanceToNow(parseISO(d.created_at), {
                  addSuffix: true,
                }).replace('about', '')}
              </TableCell>
              <TableCell>{new URL(d.control.url).pathname}</TableCell>
              <TableCell>{new URL(d.shadow.url).pathname}</TableCell>
              <TableCell>
                <span className="font-medium text-green-600">
                  +{d.diff.added}
                </span>
                <span className="px-1 font-medium text-neutral-500">
                  {d.diff.kept}
                </span>
                <span className="font-medium text-red-600">
                  -{d.diff.removed}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
