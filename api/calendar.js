const ICS_URL = 'https://outlook.office365.com/owa/calendar/07f56935aa514c53a9b25c4cd91ab770@eplace.com.au/15298fe26beb432fa81e6a151d8ea95c8741059819679929176/S-1-8-4263074342-955477810-1291768194-2244477723/reachcalendar.ics'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache for 30 minutes at CDN/browser level
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300')
  try {
    const r = await fetch(ICS_URL)
    const text = await r.text()
    res.setHeader('Content-Type', 'text/calendar')
    res.status(200).send(text)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
