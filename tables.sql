CREATE TABLE requests(
	id uuid,
	divergent bool,
	control jsonb,
	shadows jsonb,
	created_at timestamp DEFAULT NOW()
);