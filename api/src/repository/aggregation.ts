import { Kysely, sql } from "kysely";
import { RequestShadowingDatabase } from "./database";
import set from "date-fns/set";
import subMinutes from "date-fns/subMinutes";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";

export const fetchAndAggregateRequests = async (
  db: Kysely<RequestShadowingDatabase>,
  {
    lookbackPeriodHours,
    rollupPeriodMinutes,
    tags,
  }: {
    lookbackPeriodHours: number;
    rollupPeriodMinutes: number;
    tags?: Record<string, string[]>;
  },
) => {
  let incompleteTotalsQuery = db
    .selectFrom("requests")
    .select((eb) => eb.fn.countAll().as("total"))
    .select(
      sql<string>`sum(case when diff_paths is not null then 1 else 0 end)`.as(
        "divergent",
      ),
    )
    .select(
      sql<Date>`date_bin(${`${rollupPeriodMinutes} minutes`}::interval, created_at, now() - ${`${lookbackPeriodHours} hours`}::interval)`.as(
        "bin",
      ),
    )
    .where(
      sql`now() - ${`${lookbackPeriodHours} hours`}::interval <= created_at`,
    );

  for (const [tag, values] of Object.entries(tags ?? {})) {
    incompleteTotalsQuery = incompleteTotalsQuery.where((eb) =>
      eb.or(values.map((value) => sql`tags ->> ${tag}::text = ${value}::text`)),
    );
  }

  incompleteTotalsQuery = incompleteTotalsQuery
    .groupBy("bin")
    .orderBy("bin", "desc");

  const incompleteTotals = await incompleteTotalsQuery.execute();

  return Array((lookbackPeriodHours * 60) / rollupPeriodMinutes)
    .fill(undefined)
    .map((_, idx, arr) => {
      const start = set(
        subMinutes(new Date(), rollupPeriodMinutes * (idx + 1)),
        {
          seconds: 0,
          milliseconds: 0,
        },
      );
      const end = set(subMinutes(new Date(), rollupPeriodMinutes * idx), {
        seconds: 0,
        milliseconds: 0,
      });
      const bin = subMinutes(start, Math.floor(rollupPeriodMinutes / 2));

      const match = incompleteTotals.find(
        (t) => isBefore(t.bin, end) && isAfter(t.bin, start),
      );

      return {
        start,
        bin,
        end,
        total: match ? parseInt(match.total, 10) : 0,
        divergent: match ? parseInt(match.divergent, 10) : 0,
      };
    })
    .reverse();
};
