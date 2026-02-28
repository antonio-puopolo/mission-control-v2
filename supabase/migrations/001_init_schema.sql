-- Mission Control v2 Schema
-- Initial setup with RLS

-- LAPs table (core)
CREATE TABLE IF NOT EXISTS laps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'LAP',
  follow_up_date DATE,
  notes JSONB DEFAULT '{}',
  agent_assigned TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT status_check CHECK (status IN ('LAP', 'Listed', 'Sold', 'Withdrawn'))
);

-- Activity log (for tracking calls, appraisals, activities)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  activity_type TEXT NOT NULL,
  description TEXT,
  lap_id UUID REFERENCES laps(id),
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log (tracks all changes)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  row_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent results (stores agent outputs)
CREATE TABLE IF NOT EXISTS agent_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  output TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Enable RLS
ALTER TABLE laps ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- LAPs: Users can only see LAPs (for now, all users see all)
CREATE POLICY "LAPs are viewable by all users" ON laps FOR SELECT USING (true);
CREATE POLICY "LAPs can be inserted by users" ON laps FOR INSERT WITH CHECK (true);
CREATE POLICY "LAPs can be updated by users" ON laps FOR UPDATE USING (true);

-- Activity: Viewable by all
CREATE POLICY "Activity is viewable by all users" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Activity can be inserted" ON activity_log FOR INSERT WITH CHECK (true);

-- Audit: Read-only
CREATE POLICY "Audit logs are viewable by all users" ON audit_log FOR SELECT USING (true);

-- Agent results: Read-only from app
CREATE POLICY "Agent results are viewable by all users" ON agent_results FOR SELECT USING (true);
CREATE POLICY "Agent results can be inserted" ON agent_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Agent results can be updated" ON agent_results FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_laps_status ON laps(status);
CREATE INDEX idx_laps_follow_up_date ON laps(follow_up_date);
CREATE INDEX idx_activity_created_at ON activity_log(created_at);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
