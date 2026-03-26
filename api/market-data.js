import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch for_sale listings
    const { data: forSale, error: saleErr } = await supabase
      .from('market_listings')
      .select('*')
      .eq('listing_type', 'for_sale')
      .order('scraped_at', { ascending: false });

    if (saleErr) throw saleErr;

    // Fetch recently sold (last 30 days)
    const { data: sold, error: soldErr } = await supabase
      .from('market_listings')
      .select('*')
      .eq('listing_type', 'sold')
      .gte('sold_date', cutoff)
      .order('sold_date', { ascending: false });

    if (soldErr) throw soldErr;

    // Calculate suburb stats from available data
    const allListings = [...(forSale || []), ...(sold || [])];
    const soldPrices = (sold || [])
      .map(l => {
        const match = l.price?.replace(/[$,]/g, '');
        return match ? parseInt(match) : null;
      })
      .filter(p => p && !isNaN(p));

    const medianPrice = soldPrices.length > 0
      ? `$${Math.round(soldPrices.sort((a, b) => a - b)[Math.floor(soldPrices.length / 2)] / 1000)}k`
      : 'N/A';

    const domValues = (sold || [])
      .map(l => l.days_on_market)
      .filter(d => d !== null && d !== undefined);

    const avgDOM = domValues.length > 0
      ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length)
      : null;

    res.status(200).json({
      for_sale: forSale || [],
      sold: sold || [],
      last_updated: new Date().toISOString(),
      suburb_stats: {
        median_price: medianPrice,
        avg_days_on_market: avgDOM !== null ? `${avgDOM} days` : 'N/A',
        total_listings: (forSale?.length || 0),
        total_sold_30d: (sold?.length || 0),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
