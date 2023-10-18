import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { Pool } from "pg";
import set from "date-fns/set";
import subMinutes from "date-fns/subMinutes";
import { Kysely, PostgresDialect, sql } from "kysely";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";
import z from "zod";

export interface IdkEnv {
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  [other: string]: string;
}

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

const getDatabase = (env: IdkEnv) => {
  return new Kysely<CoolDatabase>({
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
};

const router = new Hono<{
  Bindings: IdkEnv;
}>();

router.onError((error, ctx) => {
  console.error("uncaught error", error);
  return ctx.json(
    {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    {
      status: 500,
    }
  );
});

router.use(
  "*",
  cors({
    origin: ["https://request-mirroring.pages.dev", "http://localhost:8788"],
  })
);
// TODO: forward JWT from Cloudflare Access and validate that?
// https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
router.use("*", bearerAuth({ token: "scurvy-reuse-bulldozer" }));

router.get("/mirrors/aggregation", async (ctx) => {
  const url = new URL(ctx.req.url);

  const start = Date.now();
  const data = await getMirrorAggregation(getDatabase(ctx.env), {
    rollupPeriodMinutes: parseInt(
      url.searchParams.get("rollupPeriodMinutes") ?? "30",
      10
    ),
    lookbackPeriodHours: parseInt(
      url.searchParams.get("lookbackPeriodHours") ?? "4",
      10
    ),
  });

  return ctx.json(
    {
      data,
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    }
  );
});

router.get("/mirrors", async (ctx) => {
  const url = new URL(ctx.req.url);
  const start = Date.now();
  let query = getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(Math.min(250, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const param = url.searchParams.get("divergent")?.toLowerCase();
  if (param === "" || param === "true") {
    query = query.where("divergent", "is", true);
  }

  return ctx.json(
    {
      data: await query.execute(),
    },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    }
  );
});

router.get("/mirrors/:id", async (ctx) => {
  const id = ctx.req.param("id");

  const start = Date.now();
  const mirror = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();

  if (!mirror) {
    return ctx.json(
      { message: "No such mirror", data: { id } },
      { status: 404 }
    );
  }

  return ctx.json(
    { data: mirror },
    {
      headers: {
        ...serverTiming([{ name: "query", dur: Date.now() - start }]),
      },
    }
  );
});

router.post("/mirrors/:id/replay", async (ctx) => {
  const id = ctx.req.param("id");

  const queryStart = Date.now();
  const mirror = await getDatabase(ctx.env)
    .selectFrom("requests")
    .selectAll()
    .where("id", "=", id)
    .limit(1)
    .executeTakeFirst();
  const queryMs = Date.now() - queryStart;

  if (!mirror) {
    return ctx.json(
      { message: "No such mirror", data: { id } },
      { status: 404 }
    );
  }

  // rely on ingest filters to avoid header bomb
  const headers = Object.fromEntries(
    Object.entries(mirror.control.request.headers).filter(
      ([k]) =>
        ![
          "x-forwarded-proto",
          "x-real-ip",
          "cf-visitor",
          "cf-ray",
          "cf-connecting-ip",
          "cf-ipcountry",
          "true-client-ip",
        ].includes(k.toLowerCase())
    )
  );

  const start = Date.now();
  await fetch(mirror.control.url, {
    method: mirror.control.request.method,
    headers: {
      ...headers,
      "shadowing-parent-id": id,
    },
  });

  return ctx.newResponse(null, {
    status: 202,
    headers: {
      ...serverTiming([
        { name: "query", dur: queryMs },
        { name: "req", dur: Date.now() - start },
      ]),
    },
  });
});

export default router;
