import { Client } from "pg";

export const getDatabaseClient = async (connectionString: string) => {
  const url = new URL(connectionString);
  console.log("Connecting to database", {
    connectionString: url.toString().replace(url.password, "******"),
  });
  const client = new Client({
    connectionString: url.toString(),
  });
  await client.connect();
  return client;
};
