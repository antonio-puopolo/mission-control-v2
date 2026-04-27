-- Camp Hill Occupancy Data Schema
-- Phase 2B: Market Occupancy Snapshot (from RPData export)

-- Occupancy snapshot (monthly or on-demand)
CREATE TABLE IF NOT EXISTS camp_hill_occupancy_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_properties INT NOT NULL,
  owner_occupied_count INT NOT NULL,
  rented_count INT NOT NULL,
  owner_occupied_pct INT NOT NULL,
  rented_pct INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- Individual property occupancy records (denormalized for fast lookup)
CREATE TABLE IF NOT EXISTS camp_hill_occupancy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  occupancy_status TEXT NOT NULL CHECK (occupancy_status IN ('owner_occupied', 'rented')),
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'unit')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_occupancy_snapshot_date ON camp_hill_occupancy_snapshot(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_occupancy_address ON camp_hill_occupancy(address);
CREATE INDEX IF NOT EXISTS idx_occupancy_status ON camp_hill_occupancy(occupancy_status);

-- Disable RLS
ALTER TABLE camp_hill_occupancy_snapshot DISABLE ROW LEVEL SECURITY;
ALTER TABLE camp_hill_occupancy DISABLE ROW LEVEL SECURITY;
