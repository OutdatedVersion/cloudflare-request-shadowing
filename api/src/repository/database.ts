import { Pool, PoolConfig } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { EncryptedRequestTable } from "@local/schema";
import { WorkerEnv } from "../env";

interface RequestShadowingDatabase {
  requests: EncryptedRequestTable;
}

export const getDatabase = (env: WorkerEnv) => {
  const config: PoolConfig = {
    max: 1,
    connectionString:
      env.DB_HYPERDRIVE?.connectionString ?? env.DATABASE_CONNECTION_STRING,
  };

  const url = new URL(config.connectionString!);

  console.log("Connecting to database", {
    connectionString: url.toString().replace(url.password, "******"),
  });
  return new Kysely<RequestShadowingDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool(config),
    }),
  });
};
