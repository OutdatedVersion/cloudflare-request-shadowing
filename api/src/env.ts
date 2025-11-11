export interface WorkerEnv {
  DATABASE_CONNECTION_STRING: string;
  DB_HYPERDRIVE?: Hyperdrive;
  ENCRYPTION_SECRET: string;
  AUTH_TEAM_NAME: string;
  AUTH_AUD_CLAIM: string;
  [other: string]: unknown;
}
