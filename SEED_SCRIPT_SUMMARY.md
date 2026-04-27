# Camp Hill Market Data Seeder - Summary

## 🎯 Mission Accomplished

Built a complete Node.js script that parses Camp Hill real estate sales CSV and seeds Supabase with monthly market snapshots and property records.

## 📦 Deliverables

### Script
**Location**: `/home/openclaw/.openclaw/workspace/mission-control-v2/scripts/seed-market-data.js`

- **Language**: JavaScript (ES modules)
- **Size**: ~10.7 KB
- **Dependencies**: @supabase/supabase-js, csv-parse, dotenv
- **Runtime**: ~3 seconds for 1480 records
- **Status**: ✅ Tested & working

### Data
**Location**: `/home/openclaw/.openclaw/workspace/mission-control-v2/data/camp-hill-sales.csv`

- **Records**: 1480 property sales
- **Columns**: 26 (Address, Suburb, State, Postcode, Property Type, Beds, Baths, Parking, Land Size, Year Built, Days on Market, Price, Sale Date, Settlement Date, Sale Type, Agency, Agent, Zoning, Lot/Section, Buyer Names ×3, Occupancy Status, Seller Names ×3)
- **Format**: CSV with no header row (data starts immediately)
- **Date Range**: 61 months (Feb 2020 - Apr 2026)

### Configuration
**Location**: `/home/openclaw/.openclaw/workspace/mission-control-v2/scripts/package.json`

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.98.0",
    "csv-parse": "^5.5.2",
    "dotenv": "^16.3.1"
  }
}
```

### Documentation
**Location**: `/home/openclaw/.openclaw/workspace/mission-control-v2/scripts/README.md`

Complete guide with: usage, CSV format specs, schema definitions, error handling, troubleshooting.

## ✨ Features

### CSV Parsing
- Handles no-header CSV with 26 columns
- Parses dates in "01 Apr 2026" format → ISO 8601
- Handles currency ($1,520,000) → numeric
- Skips "Not Disclosed" prices
- Normalizes property types (House/Unit/Townhouse → house/unit)

### Monthly Aggregation
Groups 1480 properties into **61 monthly snapshots** with:
- **Median house price** - calculated from disclosed prices only
- **Median unit price** - calculated from disclosed prices only
- **Average Days on Market (DOM)** - by property type
- **Owner-occupied %** - from Occupancy Status field
- **Rented %** - from Occupancy Status field
- **Total property count** - per month

### Supabase Integration
- **Snapshots table**: Upserts on month/year (handles re-runs)
- **Properties table**: Batch inserts (100 per batch)
- **Foreign keys**: Properties.snapshot_id → Snapshots.id
- **Error handling**: Graceful duplicate handling, clear error messages

### Data Validation
- Skips properties with invalid sale dates
- Normalizes occupancy status to enum values
- Coerces numeric fields to null if invalid
- Defaults property type to 'house' if unrecognized

## 🚀 Usage

### Install & Run
```bash
cd /home/openclaw/.openclaw/workspace/mission-control-v2/scripts
npm install
npm run seed
```

### Expected Output
```
[INFO] Starting Camp Hill market data seeding...
[INFO] Parsed 1480 records from CSV
[INFO] Loaded 1480 properties from CSV
[INFO] Grouped into 61 months
[SUCCESS] Created/updated 61 snapshots
[INFO] Inserting 1479 properties in batches...
[INFO] Processed 100/1479 properties
[INFO] Processed 200/1479 properties
... (batches continue) ...
[SUCCESS] Successfully processed 1479 properties
[SUCCESS] ✅ Market data seeding completed successfully
[INFO] Summary: 61 snapshots, 1479 properties
```

## 🗄️ Database

### Tables Required

**camp_hill_sales_snapshots** (monthly aggregates)
- Unique constraint on (month, year)
- Upsert-safe

**camp_hill_properties** (individual records)
- Foreign key to snapshots
- Check constraint: property_type IN ('house', 'unit')
- Check constraint: occupancy_status IN ('owner_occupied', 'rented') [nullable]

Run `/scripts/create-camp-hill-tables.js` if tables don't exist.

## 🔧 Configuration

Loads Supabase credentials from (in order):
1. `/home/openclaw/.openclaw/workspace/.env` (workspace root)
2. `../backend/.env` (backend config)

Required env vars:
- `VITE_SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key

## 📊 Results

- **1480 properties parsed** from CSV
- **61 monthly snapshots created** (Feb 2020 → Apr 2026)
- **1479 properties inserted** (1 skipped for invalid date)
- **Execution time**: ~3 seconds
- **All batches successful** ✅

## 🔄 Idempotency

- **Snapshots**: Upserted (safe to re-run)
- **Properties**: Insert-only (duplicates logged, script continues)
- **Safe for repeated execution** with proper error handling

## 📝 Notes

1. CSV has **no header row** — columns are positionally mapped
2. Property type normalized: Any "House" variant → `house`, any "Unit/Townhouse" variant → `unit`
3. Prices with "Not Disclosed" → NULL (excluded from median)
4. Dates parsed flexible (handles "01 Apr 2026", invalid dates skipped)
5. Batch insert size: 100 properties (Supabase payload safety)
6. All timestamps in UTC (ISO 8601)

## 🎓 What You Can Do Next

1. **Query snapshots** - Get market trends: `SELECT * FROM camp_hill_sales_snapshots ORDER BY year, month`
2. **Property analysis** - Find median price trends, average DOM by month
3. **Dashboard metrics** - Use snapshot data to populate MC market pulse tabs
4. **Re-seed** - Add new sales by appending to CSV and re-running script (upsert handles updates)
5. **Export reports** - Use property data for analysis, presentations, CRM sync

---

**Script ready for production use.** Run `npm run seed` anytime to update market data.
