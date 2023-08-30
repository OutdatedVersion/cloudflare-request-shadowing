import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { useState } from 'react';
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

export const Graph = () => {
  const [data] = useState([]);

  return (
    <ResponsiveContainer height={400} width="100%">
      <AreaChart data={data} height={300} width={600}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          allowDataOverflow
          dataKey="end"
          tickSize={10}
          tickFormatter={(val, idx) => format(parseISO(val), 'h:mmaaa')}
          type="category"
        />
        <YAxis />
        <Tooltip
          content={({ payload }) => {
            if (!payload || !payload.length) {
              return null;
            }

            const idk = payload[0].payload as (typeof data)[number];
            const pct =
              idk.total !== 0 &&
              ` ${((idk.divergent / idk.total) * 100).toFixed(0)}% divergent`;

            return (
              <div className="p-2 bg-gray-200 rounded-sm text-black">
                <div className="font-bold">
                  {format(parseISO(idk.start), 'h:mmaaa')} to{' '}
                  {format(parseISO(idk.end), 'h:mmaaa')}
                </div>
                <div className="mt-1.5">Total: {idk.total}</div>
                <div>Divergent: {idk.divergent}</div>
                <div className="mt-1.5">{pct}</div>
              </div>
            );
          }}
        />
        <Legend />

        <Area dataKey="total" stroke="#75716f" fill="#75716f" />
        <Area
          dataKey="divergent"
          stroke="rgb(185 28 28)"
          fill="rgb(185 28 28)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
