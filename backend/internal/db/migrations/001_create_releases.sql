CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    additional_info TEXT,
    steps_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_releases_due_date ON releases (due_date);
