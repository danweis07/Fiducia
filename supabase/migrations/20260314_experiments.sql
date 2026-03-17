-- =============================================================================
-- A/B Experiment Framework
-- =============================================================================

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  metric          TEXT NOT NULL DEFAULT 'click_rate',
  traffic_percent INT NOT NULL DEFAULT 100
                    CHECK (traffic_percent BETWEEN 1 AND 100),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiments_firm_id ON experiments(firm_id);
CREATE INDEX idx_experiments_status  ON experiments(status);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- Experiment variants
CREATE TABLE IF NOT EXISTS experiment_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  content_id    UUID REFERENCES cms_content(id) ON DELETE SET NULL,
  weight        INT NOT NULL DEFAULT 50
                  CHECK (weight BETWEEN 0 AND 100),
  is_control    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_variants_experiment_id ON experiment_variants(experiment_id);

ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;

-- Experiment assignments (sticky bucketing)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  variant_id    UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

CREATE INDEX idx_experiment_assignments_experiment_id ON experiment_assignments(experiment_id);
CREATE INDEX idx_experiment_assignments_user_id       ON experiment_assignments(user_id);

ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;

-- Experiment events (impressions, clicks, conversions, etc.)
CREATE TABLE IF NOT EXISTS experiment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id    UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  event_type    TEXT NOT NULL
                  CHECK (event_type IN ('impression', 'click', 'dismiss', 'conversion')),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiment_events_experiment_id ON experiment_events(experiment_id);
CREATE INDEX idx_experiment_events_variant_id    ON experiment_events(variant_id);
CREATE INDEX idx_experiment_events_event_type    ON experiment_events(event_type);
CREATE INDEX idx_experiment_events_created_at    ON experiment_events(created_at);

ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
