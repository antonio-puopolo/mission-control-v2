# Supabase Migration Required: Add first_seen_date Column

## What's Needed
Add a `first_seen_date` column to the `market_listings` table to track when properties were first seen in scrapes. This enables accurate Days On Market (DOM) calculation.

## SQL Migration
Run this in the Supabase SQL Editor:

```sql
-- Add the first_seen_date column
ALTER TABLE market_listings 
ADD COLUMN IF NOT EXISTS first_seen_date DATE;

-- Set first_seen_date for existing records to their scraped_at date
UPDATE market_listings 
SET first_seen_date = DATE(scraped_at) 
WHERE first_seen_date IS NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_market_listings_first_seen 
ON market_listings(first_seen_date);
```

## How it Works
1. The scraper (`scripts/scrape-market.js`) now tracks `first_seen_date`
2. For NEW properties: sets `first_seen_date` to today
3. For EXISTING properties: preserves the original `first_seen_date`
4. Frontend calculates DOM as: `Math.floor((today - first_seen_date) / 86400000)`

## Testing
After running the migration:
1. Run the scraper: `node /home/openclaw/.openclaw/workspace/scripts/scrape-market.js`
2. Check Mission Control Market tab: http://localhost:5173/#market
3. Verify DOM displays correctly on listing cards
4. Test sorting: "Newest First" vs "Highest DOM"

## Current Status
✅ Scraper updated to handle first_seen_date
✅ Frontend updated to calculate and display DOM
✅ Sorting functionality added
⏳ Awaiting column creation in Supabase dashboard