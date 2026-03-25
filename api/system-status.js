const USD_TO_AUD = 1.55;
const MONTHLY_LIMIT_AUD = 100;
const DAILY_ALERT_AUD = 15;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // OpenRouter returns usage fields on the key object
    const daily_usd = data.usage_daily ?? data.data?.usage_daily ?? 0;
    const weekly_usd = data.usage_weekly ?? data.data?.usage_weekly ?? 0;
    const monthly_usd = data.usage_monthly ?? data.data?.usage_monthly ?? 0;

    const daily_aud = +(daily_usd * USD_TO_AUD).toFixed(2);
    const weekly_aud = +(weekly_usd * USD_TO_AUD).toFixed(2);
    const monthly_aud = +(monthly_usd * USD_TO_AUD).toFixed(2);

    const percent_used = +((monthly_aud / MONTHLY_LIMIT_AUD) * 100).toFixed(1);

    res.status(200).json({
      usage: {
        daily_usd: +daily_usd.toFixed(4),
        weekly_usd: +weekly_usd.toFixed(4),
        monthly_usd: +monthly_usd.toFixed(4),
        daily_aud,
        weekly_aud,
        monthly_aud,
      },
      budget: {
        monthly_limit_aud: MONTHLY_LIMIT_AUD,
        daily_alert_threshold_aud: DAILY_ALERT_AUD,
        percent_used,
      },
      _raw: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
