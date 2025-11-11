import { DecryptedRequestTable, PublicRequest } from "@local/schema";

export const databaseToPublicSchema = (
  req: DecryptedRequestTable,
): PublicRequest => {
  // simple mapping function as we have one entity

  // "mom, can we get ORM?"
  // "we have ORM at home":

  return {
    id: req.id,
    created_at: req.created_at.toISOString(),
    tags: req.tags,
    diff:
      req.diff_added_count !== null &&
      req.diff_removed_count !== null &&
      req.diff_paths
        ? {
            added: req.diff_added_count,
            removed: req.diff_removed_count,
            paths: req.diff_paths,
            patches: req.diff_patches,
          }
        : null,
    control: {
      request: {
        url: req.control_req_url,
        method: req.control_req_method,
        headers: req.control_req_headers,
      },
      response: {
        status: req.control_res_http_status,
        body: req.control_res_body,
      },
    },
    shadow: {
      request: {
        url: req.shadow_req_url,
        method: req.shadow_req_method,
        // 🤠
        headers: req.control_req_headers,
      },
      response: {
        status: req.shadow_res_http_status,
        body: req.shadow_res_body,
        headers: req.shadow_res_headers,
      },
    },
  };
};
