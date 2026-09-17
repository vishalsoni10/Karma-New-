const SITE = 'https://karmaevent.in';

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'event';
}

function eventUrl(event) {
  return `${SITE}/events/${slugify(event.name)}-${String(event.id).slice(0, 8)}/`;
}

export async function onRequestGet(context) {
  const { env } = context;
  const staticUrls = [
    { loc: '/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '1.0' },
    { loc: '/jain-event-organizer/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/jain-event-management/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/jain-sangh-management/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/jain-chaturmas-management/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/jain-hospitality-management/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/jain-event-logistics/', lastmod: '2026-09-15', changefreq: 'weekly', priority: '0.8' },
    { loc: '/partnership/shieldtech-services/', lastmod: '2026-09-15', changefreq: 'monthly', priority: '0.6' }
  ];

  let events = [];
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, date, updated_at
      FROM events
      ORDER BY date DESC, created_at DESC
    `).all();
    events = result.results || [];
  } catch (error) {
    console.error('Dynamic sitemap event query failed:', error);
  }

  const urls = [
    ...staticUrls,
    ...events.map(event => ({
      loc: new URL(eventUrl(event)).pathname,
      lastmod: String(event.updated_at || event.date || '').slice(0, 10),
      changefreq: 'monthly',
      priority: '0.7'
    }))
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(url => `  <url>\n    <loc>${xmlEscape(SITE + url.loc)}</loc>\n    <lastmod>${xmlEscape(url.lastmod)}</lastmod>\n    <changefreq>${xmlEscape(url.changefreq)}</changefreq>\n    <priority>${xmlEscape(url.priority)}</priority>\n  </url>`).join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
