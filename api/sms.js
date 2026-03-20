const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing id parameter');
  }

  // Look up draft from Supabase
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sms_drafts?id=eq.${id}&select=to_number,body`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    }
  );

  const drafts = await response.json();

  if (!drafts || drafts.length === 0) {
    return res.status(404).send('Draft not found or expired');
  }

  const { to_number, body } = drafts[0];
  const smsUrl = `sms:${to_number}?body=${encodeURIComponent(body)}`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening Messages...</title>
  <style>
    body {
      font-family: -apple-system, sans-serif;
      background: #1a1a1a;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    a {
      display: inline-block;
      margin-top: 20px;
      background: #0a84ff;
      color: white;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 17px;
      font-weight: 600;
    }
  </style>
  <script>window.location = ${JSON.stringify(smsUrl)};</script>
</head>
<body>
  <p>Opening Messages...</p>
  <a href="${smsUrl}">Tap here if it doesn't open</a>
</body>
</html>`);
}
