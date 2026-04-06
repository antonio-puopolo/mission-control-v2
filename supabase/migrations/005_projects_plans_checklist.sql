-- Migration: Add project plans, checklist, and owner field
-- Mission Control v2 — 2026-04-06

-- Add owner column to projects table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS owner TEXT CHECK (owner IN ('antonio', 'hamm'));

-- Create projects_plans table
CREATE TABLE IF NOT EXISTS projects_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects_checklist table
CREATE TABLE IF NOT EXISTS projects_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  task_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE projects_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects_checklist ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects_plans
CREATE POLICY "Plans are viewable by all" ON projects_plans FOR SELECT USING (true);
CREATE POLICY "Plans can be inserted" ON projects_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Plans can be updated" ON projects_plans FOR UPDATE USING (true);
CREATE POLICY "Plans can be deleted" ON projects_plans FOR DELETE USING (true);

-- RLS policies for projects_checklist
CREATE POLICY "Checklist is viewable by all" ON projects_checklist FOR SELECT USING (true);
CREATE POLICY "Checklist can be inserted" ON projects_checklist FOR INSERT WITH CHECK (true);
CREATE POLICY "Checklist can be updated" ON projects_checklist FOR UPDATE USING (true);
CREATE POLICY "Checklist can be deleted" ON projects_checklist FOR DELETE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_plans_project_id ON projects_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_checklist_project_id ON projects_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_checklist_order ON projects_checklist(project_id, task_order);
