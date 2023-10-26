CREATE TABLE requests(
	id uuid,
	divergent bool,
	control jsonb,
	shadows jsonb,
	replays jsonb,
    tags jsonb,
	created_at timestamp DEFAULT NOW()
);
