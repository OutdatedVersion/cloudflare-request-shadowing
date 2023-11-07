import { z } from 'zod';

export const encryptedDataSchema = z.object({
  iv: z.string(),
  salt: z.string(),
  cipherText: z.string(),
});

const baseRequestsTableSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  created_at: z.date(),
  tags: z.record(z.string(), z.string()),
  diff_paths: z.array(z.string()).nullable(),
  diff_added_count: z.number().nullable(),
  diff_removed_count: z.number().nullable(),
  control_req_url: z.string(),
  control_req_method: z.string(),
  control_res_http_status: z.number(),
  control_started_at: z.date(),
  control_ended_at: z.date(),
  shadow_req_url: z.string(),
  shadow_req_method: z.string(),
  shadow_res_http_status: z.number(),
  shadow_started_at: z.date(),
  shadow_ended_at: z.date(),
});

export const encryptedRequestsTableSchema = baseRequestsTableSchema.extend({
  diff_patches: encryptedDataSchema.nullable(),
  control_req_headers: encryptedDataSchema,
  control_res_body: encryptedDataSchema,
  shadow_res_body: encryptedDataSchema,
  shadow_res_headers: encryptedDataSchema,
});
export type EncryptedRequestTable = z.infer<
  typeof encryptedRequestsTableSchema
>;

export const decryptedRequestsTableSchema = baseRequestsTableSchema.extend({
  diff_patches: z
    .array(
      z.object({
        op: z.string(),
        path: z.string(),
        value: z.unknown(),
      })
    )
    .nullable(),
  control_req_headers: z.record(z.string(), z.string()),
  control_res_body: z.string(),
  shadow_res_body: z.string(),
  shadow_res_headers: z.record(z.string(), z.string()),
});
export type DecryptedRequestTable = z.infer<
  typeof decryptedRequestsTableSchema
>;

export const publicRequestSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  tags: z.record(z.string(), z.string()),
  diff: z
    .object({
      added: z.number(),
      removed: z.number(),
      paths: z.array(z.string()),
      patches: z
        .array(
          z.object({
            op: z.string(),
            path: z.string(),
            value: z.unknown(),
          })
        )
        .nullable(),
    })
    .nullable(),
  control: z.object({
    request: z.object({
      url: z.string(),
      method: z.string(),
      headers: z.record(z.string(), z.string()),
    }),
    response: z.object({
      status: z.number(),
      body: z.string(),
    }),
  }),
  shadow: z.object({
    request: z.object({
      url: z.string(),
      method: z.string(),
      headers: z.record(z.string(), z.string()),
    }),
    response: z.object({
      status: z.number(),
      body: z.string(),
      headers: z.record(z.string(), z.string()),
    }),
  }),
});
export type PublicRequest = z.infer<typeof publicRequestSchema>;

export const api = {
  '/shadows/:id': publicRequestSchema.extend({
    replays: z.array(publicRequestSchema),
  }),
} as const;

export type PublicApi = {
  [Path in keyof typeof api]: { data: z.infer<(typeof api)[Path]> };
};
