#!/usr/bin/env node
/**
 * Camp Hill Occupancy Data Seeder
 * Loads current owner/rented status from RPData export into Supabase
 * 
 * Usage:
 * SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-occupancy-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parse as parseCsv } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_PATH = path.join(__dirname, '../data/camp-hill-occupancy.csv');

// Logger
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Parse RPData CSV and extract occupancy data
 */
function loadOccupancyData(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const records = parseCsv(fileContent, {
    skip_empty_lines: true
  });

  log.info(`Parsed ${records.length} records from CSV`);
  
  // RPData column indices (based on provided CSV structure):
  // 0: Address, 1: Suburb, 2: State, 3: Postcode, 4: Property Type, 5: Beds, 6: Price,
  // 7: Sale Date, 8: Settlement, 9: Sale Type, 10: Agency, 11: Agent, 12: Zoning, 13: Lot,
  // 14-16: Buyers, 17: Occupancy Status, 18-20: Sellers
  
  return records.map((row) => ({
    address: (row[0] || '').trim().replace(/^"/, '').replace(/"$/, ''),
    suburb: (row[1] || '').trim().replace(/^"/, '').replace(/"$/, ''),
    state: (row[2] || '').trim().replace(/^"/, '').replace(/"$/, ''),
    postcode: (row[3] || '').trim().replace(/^"/, '').replace(/"$/, ''),
    property_type: (row[4] || '').toLowerCase().includes('unit') ? 'unit' : 'house',
    occupancy_status: normalizeOccupancy(row[17] || ''),
  })).filter(p => p.address && p.occupancy_status);
}

/**
 * Normalize occupancy status
 */
function normalizeOccupancy(status) {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized.includes('owner')) return 'owner_occupied';
  if (normalized.includes('rent')) return 'rented';
  return null;
}

/**
 * Main seeding function
 */
async function seed() {
  try {
    log.info('Starting Camp Hill occupancy data seeding...');
    log.info(`Supabase URL: ${SUPABASE_URL}`);

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    // Load occupancy data
    log.info(`Reading CSV from ${CSV_PATH}`);
    const properties = loadOccupancyData(CSV_PATH);
    log.info(`Loaded ${properties.length} properties with occupancy data`);

    if (properties.length === 0) {
      throw new Error('No valid properties found in CSV');
    }

    // Create occupancy snapshot
    const now = new Date();
    const occupancySnapshot = {
      snapshot_date: now.toISOString(),
      total_properties: properties.length,
      owner_occupied_count: properties.filter(p => p.occupancy_status === 'owner_occupied').length,
      rented_count: properties.filter(p => p.occupancy_status === 'rented').length,
      owner_occupied_pct: Math.round((properties.filter(p => p.occupancy_status === 'owner_occupied').length / properties.length) * 100),
      rented_pct: Math.round((properties.filter(p => p.occupancy_status === 'rented').length / properties.length) * 100),
    };

    // Clear and insert occupancy snapshot
    log.info('Clearing old occupancy snapshot...');
    await supabase.from('camp_hill_occupancy_snapshot').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    
    log.info('Inserting occupancy snapshot...');
    const { data: snapData, error: snapErr } = await supabase
      .from('camp_hill_occupancy_snapshot')
      .insert([occupancySnapshot])
      .select();

    if (snapErr) {
      log.error(`Failed to insert occupancy snapshot: ${snapErr.message}`);
      throw snapErr;
    }

    log.success(`Created occupancy snapshot: ${occupancySnapshot.owner_occupied_pct}% owner-occupied, ${occupancySnapshot.rented_pct}% rented`);

    // Upsert individual occupancy records
    log.info('Upserting individual occupancy records...');
    const batchSize = 100;
    let upsertedCount = 0;

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize).map(p => ({
        address: p.address,
        suburb: p.suburb,
        postcode: p.postcode,
        occupancy_status: p.occupancy_status,
        property_type: p.property_type,
      }));

      const { error } = await supabase
        .from('camp_hill_occupancy')
        .upsert(batch, { onConflict: 'address' });

      if (error) {
        log.error(`Failed to upsert batch starting at ${i}: ${error.message}`);
        throw error;
      }

      upsertedCount += batch.length;
      log.info(`Processed ${upsertedCount}/${properties.length} occupancy records`);
    }

    log.success(`✅ Occupancy data seeding completed successfully`);
    log.info(`Summary: ${properties.length} properties, ${occupancySnapshot.owner_occupied_pct}% owner-occupied`);

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

seed();
