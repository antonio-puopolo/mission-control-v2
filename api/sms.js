export default function handler(req, res) {
  const { to, body } = req.query;

  if (!to || !body) {
    return res.status(400).send('Missing to or body parameters');
  }

  const smsUrl = `sms:${to}?body=${encodeURIComponent(body)}`;

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
