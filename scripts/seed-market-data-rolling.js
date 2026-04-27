#!/usr/bin/env node
/**
 * Camp Hill Market Data Seeder (Rolling 30-Day Windows)
 * Instead of monthly snapshots, calculates rolling 30-day medians
 * Useful for showing current market conditions (not all-time averages)
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { parse as parseCsv } from 'csv-parse/sync';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_PATH = './data/camp-hill-sales.csv';

// Logger
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CSV column headers (must match your export)
const COLUMN_HEADERS = [
  'address', 'suburb', 'state', 'postcode', 'property_type', 'beds', 'baths', 'parking',
  'land_size', 'year_built', 'days_on_market', 'price', 'sale_date', 'settlement_date',
  'sale_type', 'agency', 'agent', 'zoning', 'lot_section', 'buyer_1', 'buyer_2', 'buyer_3',
  'occupancy_status', 'seller_1', 'seller_2', 'seller_3'
];

/**
 * Parse CSV and return records
 */
function loadCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const records = parseCsv(fileContent, {
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
 * Parse date string (various formats)
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse price, handling "Not Disclosed" and empty values
 */
function parsePrice(priceStr) {
  if (!priceStr || priceStr === 'Not Disclosed' || priceStr.trim() === '') {
    return null;
  }
  const price = parseFloat(priceStr.toString().replace(/[^\d.]/g, ''));
  return isNaN(price) ? null : price;
}

/**
 * Normalize property type
 */
function normalizePropertyType(typeStr) {
  const normalized = typeStr?.toLowerCase().trim();
  if (normalized?.includes('house')) return 'house';
  if (normalized?.includes('unit') || normalized?.includes('apartment') || normalized?.includes('townhouse') || normalized?.includes('villa')) return 'unit';
  return 'house'; // Default to house if unclear
}

/**
 * Calculate median from array
 */
function calculateMedian(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average DOM
 */
function calculateAvgDOM(properties) {
  const doms = properties
    .map(p => parseInt(p.days_on_market, 10))
    .filter(d => !isNaN(d) && d > 0);
  if (doms.length === 0) return null;
  return Math.round(doms.reduce((a, b) => a + b, 0) / doms.length);
}

/**
 * Calculate rolling 30-day snapshots
 * Each snapshot = all sales in the 30 days ending on that date
 */
function calculateRollingSnapshots(properties) {
  // Filter properties with valid dates and parsed dates
  const validProps = properties
    .map(p => ({
      ...p,
      parsed_date: parseDate(p.sale_date),
      property_type: normalizePropertyType(p.property_type)
    }))
    .filter(p => p.parsed_date && p.property_type);

  if (validProps.length === 0) {
    log.error('No valid properties with dates found');
    return [];
  }

  // Find date range
  const dates = validProps.map(p => p.parsed_date);
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  log.info(`Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);

  // Generate snapshots for the last 30 days of data
  // (or every month if you prefer monthly snapshots)
  const snapshots = [];
  const snapshotDates = new Set();

  // Add snapshot for end of each month in the range
  const current = new Date(minDate);
  while (current <= maxDate) {
    // Last day of current month
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    if (lastDay <= maxDate) {
      snapshotDates.add(new Date(lastDay));
    }
    current.setMonth(current.getMonth() + 1);
  }

  // Also add the max date (current/today)
  snapshotDates.add(new Date(maxDate));

  // Calculate stats for each snapshot date
  for (const snapshotDate of Array.from(snapshotDates).sort()) {
    const thirtyDaysAgo = new Date(snapshotDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Properties sold in the 30 days ending on snapshotDate
    const salesInWindow = validProps.filter(p => 
      p.parsed_date > thirtyDaysAgo && p.parsed_date <= snapshotDate
    );

    if (salesInWindow.length === 0) continue;

    // Calculate stats
    const houses = salesInWindow.filter(p => p.property_type === 'house');
    const units = salesInWindow.filter(p => p.property_type === 'unit');

    const housePrices = houses
      .map(p => parsePrice(p.price))
      .filter(p => p !== null);
    
    const unitPrices = units
      .map(p => parsePrice(p.price))
      .filter(p => p !== null);

    const ownerOccupied = salesInWindow.filter(p => 
      p.occupancy_status?.toLowerCase().includes('owner')
    ).length;
    const rented = salesInWindow.filter(p =>
      p.occupancy_status?.toLowerCase().includes('rented')
    ).length;

    const totalOccupancy = ownerOccupied + rented;

    snapshots.push({
      snapshot_date: snapshotDate,
      month: snapshotDate.getMonth() + 1,
      year: snapshotDate.getFullYear(),
      total_properties: salesInWindow.length,
      median_house_price: housePrices.length > 0 ? calculateMedian(housePrices) : null,
      median_unit_price: unitPrices.length > 0 ? calculateMedian(unitPrices) : null,
      avg_days_on_market_houses: houses.length > 0 ? calculateAvgDOM(houses) : null,
      avg_days_on_market_units: units.length > 0 ? calculateAvgDOM(units) : null,
      owner_occupied_pct: totalOccupancy > 0 ? Math.round((ownerOccupied / totalOccupancy) * 100) : null,
      rented_pct: totalOccupancy > 0 ? Math.round((rented / totalOccupancy) * 100) : null
    });
  }

  return snapshots;
}

/**
 * Main seeding function
 */
async function seed() {
  try {
    log.info('Starting Camp Hill market data seeding (rolling 30-day windows)...');
    log.info(`Supabase URL: ${SUPABASE_URL}`);

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    // Load CSV
    log.info(`Reading CSV from ${CSV_PATH}`);
    const properties = loadCSV(CSV_PATH);
    log.info(`Loaded ${properties.length} properties from CSV`);

    // Calculate rolling snapshots
    const snapshots = calculateRollingSnapshots(properties);
    log.info(`Calculated ${snapshots.length} rolling snapshots`);

    if (snapshots.length === 0) {
      throw new Error('No valid snapshots calculated');
    }

    // Delete old snapshots and insert fresh ones
    log.info('Clearing old snapshots...');
    await supabase.from('camp_hill_sales_snapshots').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    
    log.info('Inserting fresh snapshots...');
    const { data, error } = await supabase
      .from('camp_hill_sales_snapshots')
      .insert(snapshots.map(s => ({
        month: s.month,
        year: s.year,
        total_properties: s.total_properties,
        median_house_price: s.median_house_price,
        median_unit_price: s.median_unit_price,
        avg_days_on_market_houses: s.avg_days_on_market_houses,
        avg_days_on_market_units: s.avg_days_on_market_units,
        owner_occupied_pct: s.owner_occupied_pct,
        rented_pct: s.rented_pct
      })))
      .select('id, month, year');

    if (error) {
      log.error(`Failed to upsert snapshots: ${error.message}`);
      throw error;
    }

    log.success(`Upserted ${data.length} snapshots`);

    // Display sample
    const latest = snapshots.sort((a, b) => b.snapshot_date - a.snapshot_date)[0];
    if (latest) {
      log.info(`\nLatest snapshot (${latest.year}-${String(latest.month).padStart(2, '0')}):`);
      log.info(`  Median house: $${latest.median_house_price?.toLocaleString()}`);
      log.info(`  Median unit: $${latest.median_unit_price?.toLocaleString()}`);
      log.info(`  Avg DOM (houses): ${latest.avg_days_on_market_houses} days`);
      log.info(`  Total sales (30d): ${latest.total_properties}`);
    }

    log.success('✅ Market data seeding completed successfully');
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

seed();
