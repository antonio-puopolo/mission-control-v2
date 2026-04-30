-- Multi-Suburb Market Pulse Migration
-- Adds suburb column to snapshots + properties tables
-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/zjyrillpennxowntwebo/sql/new

-- 1. Add suburb column to snapshots (existing Camp Hill data defaults to 'camp_hill')
ALTER TABLE camp_hill_sales_snapshots
  ADD COLUMN IF NOT EXISTS suburb TEXT NOT NULL DEFAULT 'camp_hill';

-- 2. Drop old unique constraint (month+year) and replace with suburb+month+year
ALTER TABLE camp_hill_sales_snapshots
  DROP CONSTRAINT IF EXISTS camp_hill_sales_snapshots_month_year_key;

ALTER TABLE camp_hill_sales_snapshots
  ADD CONSTRAINT market_snapshots_suburb_month_year_key UNIQUE (suburb, month, year);

-- 3. Add suburb column to properties (existing Camp Hill data defaults to 'camp_hill')
ALTER TABLE camp_hill_properties
  ADD COLUMN IF NOT EXISTS suburb TEXT NOT NULL DEFAULT 'camp_hill';

-- 4. Add indexes for suburb filtering
CREATE INDEX IF NOT EXISTS idx_camp_hill_snapshots_suburb
  ON camp_hill_sales_snapshots(suburb);

CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_suburb
  ON camp_hill_properties(suburb);
