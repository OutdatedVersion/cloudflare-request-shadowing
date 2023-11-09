CREATE TABLE requests(
	id uuid NOT NULL PRIMARY KEY,
	parent_id uuid references requests(id),
	created_at timestamp default now(),

	tags jsonb,

	diff_paths text[],
	diff_added_count int,
	diff_removed_count int,
	-- encrypted
	diff_patches jsonb,

	control_req_url text NOT NULL,
	control_req_method text NOT NULL,
	-- encrypted
	control_req_headers jsonb NOT NULL,
	control_res_http_status smallint NOT NULL,
	-- encrypted
	-- null for 204?
	control_res_body jsonb,
	control_started_at timestamp NOT NULL,
	control_ended_at timestamp NOT NULL,
	-----------------------------
	shadow_req_url text NOT NULL,
	shadow_req_method text NOT NULL,
	-- encrypted
	shadow_res_headers jsonb NOT NULL,
	shadow_res_http_status smallint NOT NULL,
	-- encrypted
	-- null for 204?
	shadow_res_body jsonb,
	shadow_started_at timestamp NOT NULL,
	shadow_ended_at timestamp NOT NULL
);
