# Camp Hill Market Data Seeder

A Node.js script that parses Camp Hill real estate sales CSV data and seeds Supabase with monthly market snapshots and individual property records.

## What It Does

1. **Parses CSV**: Reads the Camp Hill sales export with 1480+ property records
2. **Groups by Month**: Organizes properties by sale month/year
3. **Calculates Snapshots**: Creates monthly aggregates with:
   - Median house and unit prices
   - Average Days on Market (DOM) by property type
   - Owner-occupied and rented percentages
   - Total property counts
4. **Seeds Supabase**: 
   - Upserts monthly snapshots to `camp_hill_sales_snapshots`
   - Inserts properties to `camp_hill_properties` with foreign key references
   - Handles duplicates gracefully

## Prerequisites

- Node.js v18+
- `.env` file with `SUPABASE_SERVICE_ROLE_KEY` set
- CSV file at `/data/camp-hill-sales.csv`
- Supabase tables already created (run `create-camp-hill-tables.js` first if needed)

## Installation

```bash
npm install
```

Installs: `@supabase/supabase-js`, `csv-parse`, `dotenv`

## Usage

### Direct Run

```bash
node seed-market-data.js
```

### Via npm

```bash
npm run seed
```

### Output

The script logs progress with timestamps:

```
[INFO] 2026-04-09T00:41:19.439Z Starting Camp Hill market data seeding...
[INFO] 2026-04-09T00:41:19.522Z Parsed 1480 records from CSV
[INFO] 2026-04-09T00:41:19.534Z Loaded 1480 properties from CSV
[INFO] 2026-04-09T00:41:19.566Z Grouped into 61 months
[SUCCESS] 2026-04-09T00:41:19.747Z Created/updated 61 snapshots
[INFO] 2026-04-09T00:41:25.395Z Inserting 1479 properties in batches...
[SUCCESS] 2026-04-09T00:41:26.304Z ✅ Market data seeding completed successfully
[INFO] 2026-04-09T00:41:26.304Z Summary: 61 snapshots, 1479 properties
```

## CSV Format

The input CSV has **no header row**. Columns are (in order):

| Column | Type | Notes |
|--------|------|-------|
| address | string | Property address |
| suburb | string | Suburb (always "Camp Hill") |
| state | string | State (always "QLD") |
| postcode | number | 4-digit postcode |
| property_type | string | "House", "Unit", etc. → normalized to `house` or `unit` |
| beds | number | Bedrooms |
| baths | number | Bathrooms |
| parking | number | Parking spaces |
| land_size | number | Land size in sqm |
| year_built | number | Year built |
| days_on_market | number | DOM (Days on Market) |
| price | string | "$1,520,000" or "Not Disclosed" |
| sale_date | string | "01 Apr 2026" format |
| settlement_date | string | Settlement date or "-" |
| sale_type | string | "Pending Settlement Advice", etc. |
| agency | string | Real estate agency name |
| agent | string | Agent name or "-" |
| zoning | string | Zoning classification |
| lot_section | string | Lot/section reference |
| buyer_name_1,2,3 | string | Buyer names |
| occupancy_status | string | "Owner Occupied" or "Rented" |
| seller_name_1,2,3 | string | Seller names |

## Database Schema

### camp_hill_sales_snapshots

Stores aggregated monthly market data:

```sql
- id (UUID, PK)
- month (INT)
- year (INT)
- total_properties (INT)
- median_house_price (NUMERIC, nullable)
- median_unit_price (NUMERIC, nullable)
- avg_days_on_market_houses (INT, nullable)
- avg_days_on_market_units (INT, nullable)
- owner_occupied_pct (NUMERIC, nullable)
- rented_pct (NUMERIC, nullable)
- created_at (TIMESTAMP)
- UNIQUE(month, year)
```

### camp_hill_properties

Individual property records:

```sql
- id (UUID, PK)
- snapshot_id (UUID, FK → camp_hill_sales_snapshots)
- address (TEXT)
- price (NUMERIC, nullable)
- sale_date (DATE)
- days_on_market (INT, nullable)
- property_type (TEXT) CHECK IN ('house', 'unit')
- occupancy_status (TEXT) CHECK IN ('owner_occupied', 'rented', NULL)
- beds (INT, nullable)
- baths (INT, nullable)
- land_size (NUMERIC, nullable)
- sold_year (INT, nullable)
- created_at (TIMESTAMP)
```

## Key Features

### Data Normalization

- **Property Type**: "House: One Storey" → `house`, "Unit/Apartment" → `unit`
- **Prices**: Removes `$` and commas; skips "Not Disclosed"
- **Occupancy**: "Owner Occupied" → `owner_occupied`, "Rented" → `rented`
- **Dates**: Parses "01 Apr 2026" → ISO 8601 format
- **Numbers**: Coerces to integers/nulls for missing/invalid values

### Batch Processing

- Inserts properties in batches of 100 to avoid payload limits
- Handles duplicate key errors gracefully (logs warning, continues)

### Environment Variables

Loads from (in order of precedence):
1. `/../../.env` (workspace root)
2. `../.env` (project root)
3. `../backend/.env` (backend config)

Uses:
- `VITE_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key for writes

## Error Handling

- **Parsing errors**: Logs warnings, skips invalid dates
- **Network errors**: Throws with message (requires retry)
- **Constraint violations**: For unique conflicts on month/year, upserts; for property duplicates, logs and continues
- **Schema mismatches**: Clear error messages with column details

## Performance

- ~1.5s to parse 1480 CSV records
- ~0.2s to create/update 61 snapshots
- ~0.9s to insert 1479 properties (15 batches of 100)
- **Total runtime**: ~3 seconds

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"

Check that `.env` exists in workspace root with valid key:
```bash
cat /home/openclaw/.openclaw/workspace/.env | grep SUPABASE_SERVICE_ROLE_KEY
```

### "Could not find the X column"

Table schema mismatch. Verify tables exist with `create-camp-hill-tables.js`:
```bash
node create-camp-hill-tables.js
```

### "duplicate key value violates unique constraint"

Tables already have data for that month/year. Script handles this via upsert—existing records are updated.

### CSV parsing errors

Verify CSV format (no header row, 26 columns per record):
```bash
head -1 data/camp-hill-sales.csv | tr ',' '\n' | wc -l
# Should output: 26
```

## Running Again

The script is idempotent (mostly):
- **Snapshots** are upserted (updated if month/year exists)
- **Properties** batch insert will fail on duplicates but continues with next batch

To fully replace data, delete table rows first:
```sql
DELETE FROM camp_hill_properties;
DELETE FROM camp_hill_sales_snapshots;
```

Then run `node seed-market-data.js`.

## License

Part of Mission Control v2. Use within Antonio's real estate operations.
