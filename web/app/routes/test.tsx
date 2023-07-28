// https://master--63da8268a0da9970db6992aa.chromatic.com/?path=/story/examples-areachart--percent-area-chart
// https://github.com/recharts/recharts/blob/a6dbd1c9ffc0d55654d0a96a2efc5fb42310906a/storybook/stories/Examples/cartesian/XAxis/XAxisWithTickFormatter.stories.tsx#L23

import { type V2_MetaFunction } from '@remix-run/cloudflare';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import subMinutes from 'date-fns/subMinutes';
import set from 'date-fns/set';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import isBefore from 'date-fns/isBefore';
import isAfter from 'date-fns/isAfter';
import sub from 'date-fns/sub';

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Testing' }];
};

const requests = getData().reverse();

export default function Test() {
  const [rollupPeriod, setRollupPeriod] = useState(10);
  const [hours, setHours] = useState(6);

  const data = useMemo(() => {
    const bins = Array((hours * 60) / rollupPeriod)
      .fill(undefined)
      .map((_, idx) => {
        const start = set(subMinutes(new Date(), rollupPeriod * idx), {
          seconds: 0,
          milliseconds: 0,
        });
        const end = set(subMinutes(new Date(), rollupPeriod * (idx - 1)), {
          seconds: 0,
          milliseconds: 0,
        });
        return {
          start,
          end,
          total: 0,
          divergent: 0,
        };
      })
      .reverse();

    console.log('bins', bins);

    for (const req of requests) {
      const t = parseISO(req.created_at);

      for (const bin of bins) {
        if (isBefore(t, bin.end) && isAfter(t, bin.start)) {
          if (req.divergent) {
            bin.divergent += 1;
          } else {
            bin.total += 1;
          }
        }
      }
    }

    return bins;
  }, [hours, rollupPeriod]);

  return (
    <div className="m-6 mt-12">
      <div>
        <span>History (hours)</span>
        <input
          className="ml-4 input input-bordered"
          type="number"
          defaultValue={hours}
          onBlur={(event) => {
            setHours(event.currentTarget.valueAsNumber);
          }}
        />
      </div>
      <div className="mt-4 mb-12">
        <span>Rollup period</span>
        <select
          className="ml-4 select select-bordered"
          value={String(rollupPeriod)}
          onChange={(event) =>
            setRollupPeriod(parseInt(event.target.value, 10))
          }
        >
          <option value="1">1m</option>
          <option value="3">3m</option>
          <option value="5">5m</option>
          <option value="10">10m</option>
          <option value="30">30m</option>
          <option value="60">1h</option>
          <option value="120">2h</option>
          <option value="240">4h</option>
        </select>
      </div>

      <ResponsiveContainer height={500} width="100%">
        <AreaChart data={data} height={300} width={600}>
          <CartesianGrid
            // horizontalFill={[]}
            // horizontalPoints={[]}
            strokeDasharray="3 3"
            // verticalFill={[]}
            // verticalPoints={[]}
          />
          <XAxis
            allowDataOverflow
            dataKey="start"
            // interval={6}
            tickSize={10}
            tickFormatter={(val, idx) => format(val, 'h:mmaaa')}
            type="category"
          />
          <YAxis />
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) {
                return null;
              }

              const idk = payload[0].payload as (typeof data)[number];

              return (
                <div className="p-2 bg-gray-200 rounded-sm">
                  <div className="font-bold">
                    {format(idk.start, 'h:mmaaa')} to{' '}
                    {format(idk.end, 'h:mmaaa')}
                  </div>
                  {payload.map((p) => (
                    <div key={p.name}>
                      {p.name}: {p.value}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend />

          <Area dataKey="total" fill="#a8a29e" />
          <Area dataKey="divergent" fill="#dc2626" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function getData() {
  return Array(5000)
    .fill(undefined)
    .map((_, idx) => ({
      divergent: Math.random() < 0.26,
      created_at: sub(new Date(), {
        hours: Math.random() * (11 - 0) + 0,
        minutes: Math.random() * (60 - 0) + 0,
      }).toISOString(),
    }));
}
