#!/usr/bin/env node
/**
 * Creates the camp_hill_sales_snapshots and camp_hill_properties tables
 * via Supabase Management API + pg
 * 
 * Usage: node scripts/create-camp-hill-tables.js
 */

const https = require('https')

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

const SQL = `
-- Camp Hill Market Pulse tables
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

CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_snapshot_id ON camp_hill_properties(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_sale_date ON camp_hill_properties(sale_date);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_property_type ON camp_hill_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_camp_hill_properties_address ON camp_hill_properties(address);
CREATE INDEX IF NOT EXISTS idx_camp_hill_snapshots_year_month ON camp_hill_sales_snapshots(year, month);
`

async function createTables () {
  console.log('Creating Camp Hill tables via pg...')

  try {
    const { Client } = require('pg')

    // Supabase direct connection  
    // Format: postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable required. Set it to your Supabase postgres connection string.')
    }

    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    await client.query(SQL)
    await client.end()

    console.log('✅ Tables created successfully!')
  } catch (err) {
    if (err.message.includes('DATABASE_URL')) {
      console.log('\n⚠️  Direct DB not available. Tables must be created manually.')
      console.log('\n📋 Run this SQL in your Supabase dashboard (SQL Editor):')
      console.log('\nhttps://supabase.com/dashboard/project/zjyrillpennxowntwebo/sql/new\n')
      console.log(SQL)
    } else {
      console.error('❌ Error:', err.message)
    }
  }
}

createTables()
