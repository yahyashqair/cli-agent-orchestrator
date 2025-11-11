CREATE TABLE IF NOT EXISTS terminals (
    id UUID PRIMARY KEY,
    alias VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terminal_logs (
    id UUID PRIMARY KEY,
    terminal_id UUID NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    level VARCHAR(32) NOT NULL,
    message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
