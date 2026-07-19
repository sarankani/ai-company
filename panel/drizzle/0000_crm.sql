-- CRM schema v0 (Tech Spec 002 §2.1, ADR-0008). Applied by scripts/db-migrate.ts.
CREATE TABLE crm_records (
  id            text PRIMARY KEY,
  type          text NOT NULL,
  title         text NOT NULL,
  stage         text NOT NULL,
  owner         text NOT NULL,
  account_id    text REFERENCES crm_records(id),
  summary       text NOT NULL DEFAULT '',
  fields        jsonb NOT NULL DEFAULT '{}',
  apr_id        text,
  pending_stage text,
  created_by    text NOT NULL,
  updated_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  search        tsvector GENERATED ALWAYS AS (to_tsvector('simple', id || ' ' || title || ' ' || summary)) STORED
);

CREATE INDEX crm_records_type_stage ON crm_records (type, stage);

CREATE INDEX crm_records_account ON crm_records (account_id);

CREATE INDEX crm_records_owner ON crm_records (owner);

CREATE INDEX crm_records_updated ON crm_records (updated_at DESC);

CREATE INDEX crm_records_search ON crm_records USING GIN (search);

CREATE TABLE crm_links (
  from_id text NOT NULL REFERENCES crm_records(id),
  to_id   text NOT NULL REFERENCES crm_records(id),
  rel     text NOT NULL,
  PRIMARY KEY (from_id, to_id, rel)
);

CREATE INDEX crm_links_to ON crm_links (to_id);

CREATE TABLE crm_activities (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id text NOT NULL REFERENCES crm_records(id),
  at        timestamptz NOT NULL DEFAULT now(),
  actor     text NOT NULL,
  kind      text NOT NULL,
  detail    jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX crm_activities_record ON crm_activities (record_id, at DESC);

CREATE TABLE crm_notifications (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient  text NOT NULL,
  kind       text NOT NULL,
  record_id  text REFERENCES crm_records(id),
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

CREATE INDEX crm_notifications_recipient ON crm_notifications (recipient, created_at DESC);
