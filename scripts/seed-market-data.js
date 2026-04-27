#!/usr/bin/env node

/**
 * Camp Hill Market Data Seeder
 * Parses Camp Hill real estate sales CSV, creates monthly snapshots,
 * and inserts property data into Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parse as parseCsv } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const backendEnvPath = path.join(__dirname, '../backend/.env');
const rootEnvPath = path.join(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_PATH = path.join(__dirname, '../data/camp-hill-sales.csv');

// Column mapping for the CSV (no header row)
const COLUMN_HEADERS = [
  'address', 'suburb', 'state', 'postcode', 'property_type', 'beds', 'baths', 'parking',
  'land_size', 'year_built', 'days_on_market', 'price', 'sale_date', 'settlement_date',
  'sale_type', 'agency', 'agent', 'zoning', 'lot_section', 'buyer_name_1', 'buyer_name_2',
  'buyer_name_3', 'occupancy_status', 'seller_name_1', 'seller_name_2', 'seller_name_3'
];

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Logging utilities
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`)
};

/**
 * Parse date string (format: "01 Apr 2026")
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extract month and year from date (format: "2026-04")
 */
function getMonthYear(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse price, handling "Not Disclosed" and currency formatting
 */
function parsePrice(priceStr) {
  if (!priceStr || priceStr === '-' || priceStr.includes('Not Disclosed')) return null;
  const cleaned = priceStr.replace(/[$,]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Normalize property type to match schema
 */
function normalizePropertyType(typeStr) {
  if (!typeStr) return 'house';
  const lower = typeStr.toLowerCase();
  if (lower.includes('house')) return 'house';
  if (lower.includes('unit') || lower.includes('apartment') || lower.includes('townhouse')) return 'unit';
  return 'house'; // Default to house
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV() {
  log.info(`Reading CSV from ${CSV_PATH}`);
  const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
  
  const records = parseCsv(fileContent, {
    columns: false,
    skip_empty_lines: true
  });

  log.info(`Parsed ${records.length} records from CSV`);
  
  // Convert to objects using column headers
  return records.map((row) => {
    const obj = {};
    COLUMN_HEADERS.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

/**
 * Calculate statistics for a group of properties
 */
function calculateStats(properties) {
  const houses = properties.filter(p => p.property_type === 'house');
  const units = properties.filter(p => p.property_type === 'unit');

  // Extract prices for median calculation
  const housePrices = houses
    .map(p => parsePrice(p.price))
    .filter(p => p !== null)
    .sort((a, b) => a - b);

  const unitPrices = units
    .map(p => parsePrice(p.price))
    .filter(p => p !== null)
    .sort((a, b) => a - b);

  // Calculate median
  const median = (arr) => {
    if (arr.length === 0) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  // Calculate average DOM
  const avgDOM = (arr) => {
    const doms = arr.map(p => parseInt(p.days_on_market, 10)).filter(d => !isNaN(d));
    return doms.length > 0 ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null;
  };

  // Calculate occupancy percentages
  const ownerOccupied = properties.filter(p => p.occupancy_status === 'Owner Occupied').length;
  const rented = properties.filter(p => p.occupancy_status === 'Rented').length;
  const totalOccupancy = ownerOccupied + rented;
  
  const ownerOccupiedPct = totalOccupancy > 0 ? (ownerOccupied / totalOccupancy) * 100 : null;
  const rentedPct = totalOccupancy > 0 ? (rented / totalOccupancy) * 100 : null;

  return {
    median_house_price: median(housePrices),
    median_unit_price: median(unitPrices),
    avg_days_on_market_houses: avgDOM(houses),
    avg_days_on_market_units: avgDOM(units),
    owner_occupied_pct: ownerOccupiedPct,
    rented_pct: rentedPct,
    total_count: properties.length
  };
}

/**
 * Group properties by month/year
 */
function groupByMonth(properties) {
  const grouped = {};
  
  properties.forEach(prop => {
    const date = parseDate(prop.sale_date);
    if (!date) {
      return; // Skip invalid dates
    }

    const monthYear = getMonthYear(date);
    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }
    grouped[monthYear].push({
      ...prop,
      property_type: normalizePropertyType(prop.property_type),
      parsed_date: date
    });
  });

  return grouped;
}

/**
 * Create snapshots in Supabase
 */
async function createSnapshots(groupedProperties) {
  log.info('Creating/updating monthly snapshots...');
  
  const snapshots = [];
  const snapshotMap = {};

  for (const [monthYear, properties] of Object.entries(groupedProperties)) {
    const stats = calculateStats(properties);
    const [year, month] = monthYear.split('-');

    const snapshot = {
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      total_properties: stats.total_count,
      median_house_price: stats.median_house_price,
      median_unit_price: stats.median_unit_price,
      avg_days_on_market_houses: stats.avg_days_on_market_houses,
      avg_days_on_market_units: stats.avg_days_on_market_units,
      owner_occupied_pct: stats.owner_occupied_pct ? Math.round(stats.owner_occupied_pct * 100) / 100 : null,
      rented_pct: stats.rented_pct ? Math.round(stats.rented_pct * 100) / 100 : null
    };

    snapshots.push(snapshot);
  }

  // Upsert snapshots — update if exists, insert if new
  const { data, error } = await supabase
    .from('camp_hill_sales_snapshots')
    .upsert(snapshots)
    .select('id, month, year');

  if (error) {
    log.error(`Failed to create snapshots: ${error.message}`);
    throw error;
  }

  log.success(`Created/updated ${data.length} snapshots`);

  // Map snapshot IDs back to month_year
  data.forEach(snap => {
    const monthYearKey = `${snap.year}-${String(snap.month).padStart(2, '0')}`;
    snapshotMap[monthYearKey] = snap.id;
  });

  return snapshotMap;
}

/**
 * Insert properties into Supabase
 */
async function insertProperties(groupedProperties, snapshotMap) {
  log.info('Preparing properties for insertion...');
  
  const properties = [];

  for (const [monthYear, props] of Object.entries(groupedProperties)) {
    const snapshotId = snapshotMap[monthYear];
    if (!snapshotId) {
      log.warn(`No snapshot ID found for ${monthYear}`);
      continue;
    }

    props.forEach(prop => {
      let occupancyStatus = null;
      const occTrim = prop.occupancy_status.trim();
      if (occTrim === 'Owner Occupied') occupancyStatus = 'owner_occupied';
      else if (occTrim === 'Rented') occupancyStatus = 'rented';

      properties.push({
        snapshot_id: snapshotId,
        address: prop.address.trim(),
        price: parsePrice(prop.price),
        sale_date: prop.parsed_date.toISOString().split('T')[0],
        days_on_market: parseInt(prop.days_on_market, 10) || null,
        property_type: prop.property_type,
        occupancy_status: occupancyStatus,
        beds: parseInt(prop.beds, 10) || null,
        baths: parseInt(prop.baths, 10) || null,
        land_size: parseInt(prop.land_size, 10) || null,
        sold_year: prop.parsed_date.getFullYear()
      });
    });
  }

  log.info(`Inserting ${properties.length} properties in batches...`);

  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    const { error } = await supabase
      .from('camp_hill_properties')
      .insert(batch);

    if (error) {
      // Log but continue if it's a duplicate key error
      if (error.code === '23505') {
        log.warn(`Batch ${i / batchSize + 1}: Some records already exist`);
      } else {
        log.error(`Failed to insert batch starting at ${i}: ${error.message}`);
        throw error;
      }
    }

    insertedCount += batch.length;
    log.info(`Processed ${insertedCount}/${properties.length} properties`);
  }

  log.success(`Successfully processed ${insertedCount} properties`);
  return insertedCount;
}

/**
 * Main execution
 */
async function main() {
  try {
    log.info('Starting Camp Hill market data seeding...');
    log.info(`Supabase URL: ${SUPABASE_URL}`);

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    // Parse CSV
    const rawProperties = parseCSV();
    log.info(`Loaded ${rawProperties.length} properties from CSV`);

    // Group by month/year
    const groupedProperties = groupByMonth(rawProperties);
    const monthCount = Object.keys(groupedProperties).length;
    log.info(`Grouped into ${monthCount} months`);

    // Clear old data
    log.info('Clearing old snapshots and properties...');
    await supabase.from('camp_hill_properties').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('camp_hill_sales_snapshots').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    // Create snapshots
    const snapshotMap = await createSnapshots(groupedProperties);

    // Insert properties
    const propertiesProcessed = await insertProperties(groupedProperties, snapshotMap);

    log.success('✅ Market data seeding completed successfully');
    log.info(`Summary: ${monthCount} snapshots, ${propertiesProcessed} properties`);
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
