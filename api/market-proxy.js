/**
 * API proxy for market_listings data
 * Works around RLS issue by using service role key server-side
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co';
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY';

  try {
    // Build query URL with any query params passed through
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const url = `${SUPABASE_URL}/rest/v1/market_listings${queryString ? `?${queryString}` : '?select=*'}`;

    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();
    
    // Add response headers for range/count if present
    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      res.setHeader('content-range', contentRange);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Market proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch market data',
      details: error.message 
    });
  }
}