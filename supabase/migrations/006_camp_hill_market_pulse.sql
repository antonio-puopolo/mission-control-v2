-- Camp Hill Market Pulse Schema
-- Phase 2: Real Data Integration
-- Run this in the Supabase SQL Editor

-- Monthly snapshot aggregates
CREATE TABLE IF NOT EXISTS camp_hill_sales_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL,
  year INT NOT NULL,
  total_properties INT NOT NULL DEFAULT 0,
  median_house_price NUMERIC,
  median_unit_price NUMERIC,
  avg_days_on_market_houses INT,
  avg_days_on_market_units INT,
  owner_occupied_pct NUMERIC,
  rented_pct NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Individual property sales
CREATE TABLE IF NOT EXISTS camp_hill_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES camp_hill_sales_snapshots(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  price NUMERIC,
  sale_date DATE NOT NULL,
  days_on_market INT,
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'unit')),
  occupancy_status TEXT CHECK (occupancy_status IN ('owner_occupied', 'rented')),
  beds INT,
  baths INT,
  land_size NUMERIC,
  sold_year INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_snapshot_id ON camp_hill_properties(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_sale_date ON camp_hill_properties(sale_date);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_property_type ON camp_hill_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_address ON camp_hill_properties(address);
CREATE INDEX IF NOT EXISTS idx_camp_hill_snapshots_year_month ON camp_hill_sales_snapshots(year, month);

-- Disable RLS for now (anon key access, no auth)
ALTER TABLE camp_hill_sales_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE camp_hill_properties DISABLE ROW LEVEL SECURITY;
