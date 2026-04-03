-- Agent Usage Tracking Table
-- Tracks token usage across all agent sessions

CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('main', 'subagent', 'cron')),
  agent_name TEXT CHECK (agent_name IN ('Main Chat', 'Coder', 'Researcher', 'Analyst', 'Writer')),
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER GENERATED ALWAYS AS (tokens_in + tokens_out) STORED,
  duration_seconds INTEGER,
  work_type TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_agent_usage_timestamp ON agent_usage(timestamp DESC);
CREATE INDEX idx_agent_usage_agent ON agent_usage(agent_name);
CREATE INDEX idx_agent_usage_model ON agent_usage(model);
CREATE INDEX idx_agent_usage_session ON agent_usage(session_id);

-- Enable RLS
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies - read-only from frontend, writable from backend
CREATE POLICY "Agent usage is viewable by all users" ON agent_usage FOR SELECT USING (true);
CREATE POLICY "Agent usage can be inserted by services" ON agent_usage FOR INSERT WITH CHECK (true);

-- Helper view for daily aggregates
CREATE VIEW agent_usage_daily AS
SELECT 
  DATE(timestamp) as date,
  agent_name,
  model,
  COUNT(*) as session_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(tokens_total) as total_tokens,
  AVG(duration_seconds) as avg_duration_seconds
FROM agent_usage
GROUP BY DATE(timestamp), agent_name, model;

-- Helper view for monthly aggregates  
CREATE VIEW agent_usage_monthly AS
SELECT 
  DATE_TRUNC('month', timestamp) as month,
  agent_name,
  model,
  COUNT(*) as session_count,
  SUM(tokens_in) as total_tokens_in,
  SUM(tokens_out) as total_tokens_out,
  SUM(tokens_total) as total_tokens,
  AVG(duration_seconds) as avg_duration_seconds
FROM agent_usage
GROUP BY DATE_TRUNC('month', timestamp), agent_name, model;