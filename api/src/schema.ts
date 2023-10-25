import { z } from "zod";

export const encryptedDataSchema = z.object({
  iv: z.string(),
  salt: z.string(),
  cipherText: z.string(),
});

export const controlDataSchema = z.object({
  url: z.string(),
  duration: z.number(),
  // legacy data support
  startedAt: z.number().optional(),
  // legacy data support
  endedAt: z.number().optional(),
  status: z.number(),
  request: z.object({
    method: z.string(),
    headers: z.union([encryptedDataSchema, z.object({}).passthrough()]),
  }),
  response: z.union([encryptedDataSchema, z.string()]),
});

export const shadowDataSchema = z.object({
  url: z.string(),
  duration: z.number(),
  startedAt: z.number().optional(),
  // legacy data support
  endedAt: z.number().optional(),
  // legacy data support
  status: z.number(),
  diff: z.object({
    added: z.number(),
    removed: z.number(),
    // legacy data support
    paths: z.array(z.string()).optional(),
    patches: z.union([encryptedDataSchema, z.array(z.any())]),
  }),
  headers: z.union([encryptedDataSchema, z.object({}).passthrough()]),
  response: z.union([encryptedDataSchema, z.string()]),
});

export const requestsTableSchema = z.object({
  id: z.string().uuid(),
  divergent: z.boolean(),
  created_at: z.date(),
  control: controlDataSchema,
  shadows: z.array(shadowDataSchema),
  replays: z
    .array(
      z.object({
        id: z.string().uuid(),
        created_at: z.date(),
        divergent: z.boolean(),
        control: controlDataSchema,
        shadows: z.array(shadowDataSchema),
      })
    )
    .nullable(),
});
