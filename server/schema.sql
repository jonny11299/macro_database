-- Run once to set up the database.
-- From the project root: psql macro_database -f server/schema.sql

CREATE TABLE IF NOT EXISTS sessions (
  session_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  time_started TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domains (
  domain_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name       TEXT        NOT NULL,
  domain_identifier TEXT        NOT NULL,
  last_modified     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS macros (
  macro_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  macro_title   TEXT        NOT NULL UNIQUE,
  macro_pre     TEXT,
  macro_post    TEXT,
  last_modified TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- full_link is UNIQUE — duplicate URLs are rejected at the DB level.
CREATE TABLE IF NOT EXISTS links (
  link_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES sessions(session_id),
  file_name     TEXT        NOT NULL,
  sheet_name    TEXT        NOT NULL,
  header_name   TEXT,
  full_link     TEXT        NOT NULL UNIQUE,
  domain_id     UUID        REFERENCES domains(domain_id),
  last_modified TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS link_macros (
  link_id  UUID NOT NULL REFERENCES links(link_id),
  macro_id UUID NOT NULL REFERENCES macros(macro_id),
  PRIMARY KEY (link_id, macro_id)
);
