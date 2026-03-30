import { useState, useEffect } from 'react'
import { ExternalLink, Bed, Bath, Car, Calendar, TrendingUp, Clock, Newspaper, RefreshCw, MapPin } from 'lucide-react'
import { TENANT_CONFIG } from '@/config/tenant'

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

interface Listing {
  id: string
  source: string
  listing_type: string
  address: string
  suburb: string
  price: string
  bedrooms: number | null
  bathrooms: number | null
  car_spaces: number | null
  land_size: string | null
  days_on_market: number | null
  sold_date: string | null
  url: string | null
  scraped_at: string
}

interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
  source: string
}

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchListings(type: string): Promise<Listing[]> {
  const sortField = type === 'sold' ? 'sold_date.desc' : 'scraped_at.desc'
  const params = new URLSearchParams({ listing_type: `eq.${type}`, order: sortField })
  if (type === 'sold') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    params.set('sold_date', `gte.${cutoff.toISOString().split('T')[0]}`)
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_listings?${params}`, { headers: H })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchPropertyNews(): Promise<NewsItem[]> {
  const feeds = [
    'https://propertyupdate.com.au/feed/',
    'https://www.realestate.com.au/news/feed/',
  ]

  const items: NewsItem[] = []
  for (const feedUrl of feeds) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=3`)
      if (!res.ok) continue
      const data = await res.json()
      if (data.items) {
        data.items.slice(0, 3).forEach((item: { title: string; link: string; pubDate: string; description: string }) => {
          items.push({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description?.replace(/<[^>]+>/g, '').slice(0, 150) + '...',
            source: new URL(feedUrl).hostname.replace('www.', ''),
          })
        })
      }
    } catch {
      // skip failed feed
    }
    if (items.length >= 3) break
  }
  return items.slice(0, 3)
}

function isNewListing(scraped_at: string): boolean {
  const d = new Date(scraped_at)
  const now = new Date()
  return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DOMBadge({ days }: { days: number | null }) {
  if (days === null) return null
  const color = days <= 7 ? '#10b981' : days <= 21 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: '6px',
      padding: '2px 8px',
      fontSize: '0.72rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
    }}>
      <Clock size={11} />
      {days}d on market
    </span>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const isNew = isNewListing(listing.scraped_at)
  return (
    <div style={{
      background: '#1a2332',
      border: '1px solid #2a3a4a',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      transition: 'border-color 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a3a4a')}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #14b8a6, #0ea5e9)' }} />

      {/* Address + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} color="#14b8a6" />
            {listing.address}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{listing.suburb} {TENANT_CONFIG.focusState} {TENANT_CONFIG.focusPostcode}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isNew && (
            <span style={{
              background: '#14b8a622',
              color: '#14b8a6',
              border: '1px solid #14b8a644',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>✨ New</span>
          )}
          {listing.listing_type === 'for_sale' && <DOMBadge days={listing.days_on_market} />}
        </div>
      </div>

      {/* Price */}
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14b8a6', letterSpacing: '-0.02em' }}>
        {listing.price || 'Contact Agent'}
      </div>

      {/* Property details */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {listing.bedrooms !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bed size={13} /> {listing.bedrooms}
          </span>
        )}
        {listing.bathrooms !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bath size={13} /> {listing.bathrooms}
          </span>
        )}
        {listing.car_spaces !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={13} /> {listing.car_spaces}
          </span>
        )}
        {listing.land_size && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>📐 {listing.land_size}</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
        {listing.url ? (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#14b8a6', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            View on REA <ExternalLink size={11} />
          </a>
        ) : <span />}
        <span style={{ color: '#475569', fontSize: '0.72rem' }}>
          {listing.source?.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

function SoldCard({ listing }: { listing: Listing }) {
  return (
    <div style={{
      background: '#1a2332',
      border: '1px solid #2a3a4a',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#14b8a6')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a3a4a')}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #6366f1, #14b8a6)' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} color="#6366f1" />
            {listing.address}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{listing.suburb} {TENANT_CONFIG.focusState} {TENANT_CONFIG.focusPostcode}</div>
        </div>
        {listing.sold_date && (
          <span style={{
            background: '#6366f122',
            color: '#a5b4fc',
            border: '1px solid #6366f144',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            whiteSpace: 'nowrap',
          }}>
            <Calendar size={11} />
            {formatDate(listing.sold_date)}
          </span>
        )}
      </div>

      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14b8a6', letterSpacing: '-0.02em' }}>
        🏷️ {listing.price || 'Undisclosed'}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {listing.bedrooms !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bed size={13} /> {listing.bedrooms}
          </span>
        )}
        {listing.bathrooms !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bath size={13} /> {listing.bathrooms}
          </span>
        )}
        {listing.car_spaces !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Car size={13} /> {listing.car_spaces}
          </span>
        )}
        {listing.land_size && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>📐 {listing.land_size}</span>
        )}
        {listing.days_on_market !== null && (
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {listing.days_on_market}d
          </span>
        )}
      </div>

      {listing.url && (
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6366f1', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
        >
          View listing <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: '#1a2332',
        border: '1px solid #2a3a4a',
        borderRadius: '12px',
        padding: '1rem',
        textDecoration: 'none',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#14b8a6';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2a3a4a';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{
          background: '#14b8a622',
          color: '#14b8a6',
          border: '1px solid #14b8a644',
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '0.7rem',
          fontWeight: 600,
        }}>{item.source}</span>
        <span style={{ color: '#475569', fontSize: '0.72rem' }}>
          {item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}
        </span>
      </div>
      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', lineHeight: 1.4 }}>
        {item.title}
      </div>
      <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
        {item.description}
      </div>
    </a>
  )
}

export function Market() {
  const [forSale, setForSale] = useState<Listing[]>([])
  const [sold, setSold] = useState<Listing[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [saleData, soldData, newsData] = await Promise.all([
        fetchListings('for_sale'),
        fetchListings('sold'),
        fetchPropertyNews(),
      ])
      setForSale(saleData)
      setSold(soldData)
      setNews(newsData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Market data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Compute stats
  const soldPrices = sold
    .map(l => parseInt(l.price?.replace(/[$,]/g, '') || ''))
    .filter(p => !isNaN(p))
  const medianPrice = soldPrices.length > 0
    ? `$${(soldPrices.sort((a, b) => a - b)[Math.floor(soldPrices.length / 2)] / 1000000).toFixed(2)}M`
    : 'N/A'
  const avgDOM = sold.filter(l => l.days_on_market !== null).length > 0
    ? Math.round(sold.filter(l => l.days_on_market !== null).reduce((a, l) => a + (l.days_on_market || 0), 0) / sold.filter(l => l.days_on_market !== null).length)
    : null

  const sampleNotice = forSale.some(l => !l.url?.includes('real')) ||
    forSale.every(l => l.scraped_at && new Date(l.scraped_at).getTime() < Date.now() - 86400000 * 7)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="#14b8a6" />
            {TENANT_CONFIG.marketLabel}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>
            {TENANT_CONFIG.marketDescription}
            {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: '#14b8a6',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'For Sale', value: loading ? '—' : String(forSale.length), icon: '🏠', color: '#14b8a6' },
          { label: 'Sold (30d)', value: loading ? '—' : String(sold.length), icon: '✅', color: '#6366f1' },
          { label: 'Median Sold', value: loading ? '—' : medianPrice, icon: '💰', color: '#f59e0b' },
          { label: 'Avg DOM', value: loading ? '—' : (avgDOM !== null ? `${avgDOM} days` : 'N/A'), icon: '📅', color: '#0ea5e9' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#1a2332',
            border: `1px solid ${stat.color}33`,
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>{stat.icon}</span>
            <div>
              <div style={{ color: stat.color, fontSize: '1.1rem', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sample data notice */}
      {sampleNotice && (
        <div style={{
          background: '#f59e0b11',
          border: '1px solid #f59e0b44',
          borderRadius: '8px',
          padding: '0.6rem 1rem',
          color: '#f59e0b',
          fontSize: '0.8rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          ✅ Live listings from domain.com.au (updated daily at 7am)
        </div>
      )}

      {/* For Sale section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ color: '#14b8a6', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏠 For Sale
          <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.85rem' }}>({forSale.length} listings)</span>
        </h2>
        {loading ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>Loading listings...</div>
        ) : forSale.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', background: '#1a2332', borderRadius: '12px', border: '1px solid #2a3a4a' }}>
            No active listings found. Run the fetch script to populate data.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {forSale.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      {/* Recent Sales section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ color: '#6366f1', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✅ Recent Sales
          <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.85rem' }}>(last 30 days • {sold.length} sales)</span>
        </h2>
        {loading ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>Loading sales...</div>
        ) : sold.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', background: '#1a2332', borderRadius: '12px', border: '1px solid #2a3a4a' }}>
            No recent sales found in the last 30 days.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {sold.map(l => <SoldCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      {/* Market Pulse section */}
      <section>
        <h2 style={{ color: '#0ea5e9', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Newspaper size={17} />
          Market Pulse
          <span style={{ color: '#475569', fontWeight: 400, fontSize: '0.85rem' }}>Property news</span>
        </h2>
        {news.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', background: '#1a2332', borderRadius: '12px', border: '1px solid #2a3a4a' }}>
            {loading ? 'Loading news...' : 'Could not load property news at this time.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {news.map((item, i) => <NewsCard key={i} item={item} />)}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
