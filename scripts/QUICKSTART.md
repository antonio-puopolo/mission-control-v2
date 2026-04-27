# Quick Start - Camp Hill Market Data Seeder

## TL;DR

```bash
cd /home/openclaw/.openclaw/workspace/mission-control-v2/scripts
npm install  # First time only
npm run seed
```

Done! 61 monthly snapshots + 1479 properties seeded to Supabase in ~3 seconds.

## What Just Happened?

✅ Parsed 1480 property records from CSV  
✅ Grouped into 61 months (Feb 2020 - Apr 2026)  
✅ Created monthly aggregates: median prices, avg DOM, occupancy %  
✅ Inserted all properties to `camp_hill_properties` table  
✅ Linked to snapshots via foreign key  

## Data Locations

- **Script**: `./seed-market-data.js` (executable)
- **CSV Input**: `../data/camp-hill-sales.csv` (1480 records, 426 KB)
- **Docs**: `./README.md` (detailed reference)

## Verify It Worked

```bash
# Check snapshots
curl -s "https://zjyrillpennxowntwebo.supabase.co/rest/v1/camp_hill_sales_snapshots?limit=1" \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq .

# Check properties
curl -s "https://zjyrillpennxowntwebo.supabase.co/rest/v1/camp_hill_properties?limit=5" \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq .
```

Or use Supabase dashboard: https://supabase.com/dashboard/project/zjyrillpennxowntwebo/editor

## Re-run Anytime

The script is safe to run multiple times:
- Snapshots are **upserted** (updated if month/year exists)
- New CSV data appended? Just run the script again

```bash
npm run seed
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find SUPABASE_SERVICE_ROLE_KEY" | Check `../../.env` has the key |
| "Column not found" error | Run `create-camp-hill-tables.js` first |
| Script hangs | Check internet connection to Supabase |
| Duplicate errors | Normal—script handles them gracefully |

## Next Steps

1. **Dashboard**: Use snapshot data in Mission Control market metrics
2. **Analysis**: Query properties to find trends, price ranges, DOM patterns
3. **Updates**: Add new sales to CSV, re-run `npm run seed`
4. **Exports**: Pull data for presentations, CRM sync, client reports

## Key Stats

- **Properties**: 1479 records
- **Date Range**: Feb 2020 - Apr 2026 (61 months)
- **Snapshot Metrics**: Median prices, avg DOM, occupancy %, totals
- **Run Time**: ~3 seconds

---

See `README.md` for full documentation.
