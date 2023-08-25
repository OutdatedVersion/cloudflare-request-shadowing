import { Pool } from "pg";
import set from "date-fns/set";
import subMinutes from "date-fns/subMinutes";
import { Kysely, PostgresDialect, sql } from "kysely";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";
import z from "zod";

export interface Env {
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
}

const json = (data: unknown, init?: ResponseInit) => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
};

const serverTiming = (
  entries: Array<{ name: string; dur: number | string; desc?: string }>
) => {
  return {
    "server-timing": entries
      .map(({ name, desc, dur }) => {
        let value = `${name};dur=${dur}`;
        if (desc) {
          value += `;desc=${desc}`;
        }
        return value;
      })
      .join(", "),
  };
};

const getMirrorAggregation = async (
  db: Kysely<CoolDatabase>,
  {
    lookbackPeriodHours,
    rollupPeriodMinutes,
  }: { lookbackPeriodHours: number; rollupPeriodMinutes: number }
) => {
  const incompleteTotals = await db
    .selectFrom("requests")
    .select((eb) => eb.fn.count<string>("divergent").as("total"))
    .select(sql<string>`sum(divergent::int)`.as("divergent"))
    .select(
      sql<Date>`date_bin(${`${rollupPeriodMinutes} minutes`}::interval, created_at, now() - ${`${lookbackPeriodHours} hours`}::interval)`.as(
        "bin"
      )
    )
    .where(
      sql`now() - ${`${lookbackPeriodHours} hours`}::interval <= created_at`
    )
    .groupBy("bin")
    .orderBy("bin", "desc")
    .execute();

  return Array((lookbackPeriodHours * 60) / rollupPeriodMinutes)
    .fill(undefined)
    .map((_, idx, arr) => {
      const start = set(
        subMinutes(new Date(), rollupPeriodMinutes * (idx + 1)),
        {
          seconds: 0,
          milliseconds: 0,
        }
      );
      const end = set(subMinutes(new Date(), rollupPeriodMinutes * idx), {
        seconds: 0,
        milliseconds: 0,
      });
      const bin = subMinutes(start, Math.floor(rollupPeriodMinutes / 2));

      const match = incompleteTotals.find(
        (t) => isBefore(t.bin, end) && isAfter(t.bin, start)
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

const requestsTableSchema = z.object({
  id: z.string().uuid(),
  divergent: z.boolean(),
  control: z.any(),
  shadows: z.any(),
  created_at: z.date(),
});
type RequestTable = z.infer<typeof requestsTableSchema>;

type CoolDatabase = {
  requests: RequestTable;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // TODO: forward JWT from Cloudflare Access and validate that?
    // https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
    const encoder = new TextEncoder();
    const pw = encoder.encode("scurvy-reuse-bulldozer");

    const auth = request.headers.get("authorization");
    const key = auth?.split(" ")[1];
    if (!key || !crypto.subtle.timingSafeEqual(pw, encoder.encode(key))) {
      return json(
        {
          message: "missing or incorrect 'authorization' header",
        },
        {
          status: 401,
        }
      );
    }

    const url = new URL(request.url);
    const match = new URLPattern({
      pathname: "/mirrors/:id([0-9a-fA-F-]{36}|aggregation)?",
    }).exec(url);

    if (!match) {
      return json(
        { message: `No route for '${url.pathname}'` },
        {
          status: 404,
        }
      );
    }

    const db = new Kysely<CoolDatabase>({
      dialect: new PostgresDialect({
        pool: new Pool({
          max: 1,
          user: env.DB_USERNAME,
          password: env.DB_PASSWORD,
          host: env.DB_HOST,
          port: parseInt(env.DB_PORT, 10),
          database: env.DB_NAME,
        }),
      }),
    });

    if (url.pathname === "/mirrors/aggregation") {
      const start = Date.now();
      const data = await getMirrorAggregation(db, {
        rollupPeriodMinutes: parseInt(
          url.searchParams.get("rollupPeriodMinutes") ?? "30",
          10
        ),
        lookbackPeriodHours: parseInt(
          url.searchParams.get("lookbackPeriodHours") ?? "4",
          10
        ),
      });

      return json(
        {
          data,
        },
        {
          headers: {
            ...serverTiming([{ name: "query", dur: Date.now() - start }]),
          },
        }
      );
    }

    const { id } = match.pathname.groups;

    if (id) {
      const start = Date.now();
      const rows = await db
        .selectFrom("requests")
        .selectAll()
        .where("id", "=", id)
        .limit(1)
        .execute();

      if (rows.length === 0) {
        throw json(
          { message: "No such mirror", data: { id } },
          { status: 404 }
        );
      }

      return json(
        { data: rows[0] },
        {
          headers: {
            ...serverTiming([{ name: "query", dur: Date.now() - start }]),
          },
        }
      );
    } else {
      const start = Date.now();
      let query = db
        .selectFrom("requests")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(50);

      const param = url.searchParams.get("divergent")?.toLowerCase();
      if (param === "" || param === "true") {
        query = query.where("divergent", "is", true);
      }

      return json(
        {
          data: await query.execute(),
        },
        {
          headers: {
            ...serverTiming([{ name: "query", dur: Date.now() - start }]),
          },
        }
      );
    }
  },
};
