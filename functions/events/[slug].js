const SITE = 'https://karmaevent.in';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const routeSlug = String(params.slug || '');
  const idPrefix = routeSlug.match(/-([a-f0-9]{8})\/?$/i)?.[1];

  if (!idPrefix) return new Response('Event not found', { status: 404 });

  try {
    const event = await env.DB.prepare(`
      SELECT id, name, date, location, category, description, cover_image_id, created_at, updated_at
      FROM events
      WHERE substr(id, 1, 8) = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(idPrefix).first();

    if (!event) return new Response('Event not found', { status: 404 });

    const imageRows = await env.DB.prepare(`
      SELECT id
      FROM event_images
      WHERE event_id = ?
      ORDER BY sort_order ASC
    `).bind(event.id).all();

    const images = (imageRows.results || []).map(row => `/api?action=image&id=${encodeURIComponent(row.id)}`);
    const cover = event.cover_image_id ? `/api?action=image&id=${encodeURIComponent(event.cover_image_id)}` : images[0] || '';
    const canonical = eventUrl(event);
    const title = `${event.name} | Jain Event Management by Karma`;
    const description = `${event.name}${event.location ? ` in ${event.location}` : ''} — completed Jain event managed by Karma Event Management & Hospitality, including administration, hospitality, logistics and on-ground coordination.`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.name,
      startDate: event.date,
      eventStatus: 'https://schema.org/EventCompleted',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.location || 'India',
        address: event.location || 'India'
      },
      organizer: {
        '@type': 'Organization',
        name: 'Karma Event Management & Hospitality',
        url: SITE
      },
      image: cover ? [new URL(cover, SITE).href] : [],
      description
    };

    const gallery = images.map((src, index) => `
      <figure class="photo">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(event.name)} — event photo ${index + 1}" loading="lazy">
      </figure>`).join('');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 160))}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description.slice(0, 200))}">
<meta property="og:url" content="${escapeHtml(canonical)}">
${cover ? `<meta property="og:image" content="${escapeHtml(new URL(cover, SITE).href)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>
:root{--black:#0A0A0A;--panel:#111;--gold:#D4AF37;--gold2:#F5D67B;--white:#F8F5EE;--muted:rgba(248,245,238,.62);--line:rgba(212,175,55,.18)}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,rgba(212,175,55,.08),transparent 36%),var(--black);color:var(--white);font-family:Montserrat,sans-serif;font-weight:300}a{color:inherit}.wrap{width:min(1120px,92%);margin:auto}.nav{padding:26px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}.brand{font-family:Cinzel,serif;letter-spacing:.16em;color:var(--gold);font-weight:700}.back{font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);text-decoration:none}.hero{padding:72px 0 46px}.eyebrow{font-size:.62rem;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}h1{font-family:Cormorant Garamond,serif;font-size:clamp(2.5rem,6vw,5.4rem);line-height:.95;margin:14px 0 24px;font-weight:600;max-width:900px}.meta{display:flex;gap:14px;flex-wrap:wrap}.pill{border:1px solid var(--line);padding:9px 13px;border-radius:999px;color:var(--muted);font-size:.68rem}.lead{max-width:820px;font-size:1rem;line-height:1.9;color:var(--muted);margin-top:30px}.cover{margin:20px 0 48px;border:1px solid var(--line);background:#080808;padding:7px}.cover img{display:block;width:100%;max-height:650px;object-fit:cover}.content{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:60px}.photo{margin:0;background:var(--panel);border:1px solid var(--line);padding:6px}.photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.footer{border-top:1px solid var(--line);padding:32px 0 50px;color:var(--muted);font-size:.68rem;line-height:1.8}.footer strong{color:var(--gold)}@media(max-width:700px){.hero{padding-top:48px}.content{grid-template-columns:1fr}h1{font-size:3rem}}
</style>
</head>
<body>
<div class="wrap">
  <nav class="nav"><div class="brand">KARMA</div><a class="back" href="/">← Back to Karma</a></nav>
  <main>
    <section class="hero">
      <div class="eyebrow">Completed Jain Event</div>
      <h1>${escapeHtml(event.name)}</h1>
      <div class="meta">
        ${event.date ? `<span class="pill">📅 ${escapeHtml(formatDate(event.date))}</span>` : ''}
        ${event.location ? `<span class="pill">📍 ${escapeHtml(event.location)}</span>` : ''}
        ${event.category ? `<span class="pill">✦ ${escapeHtml(event.category)}</span>` : ''}
      </div>
      ${event.description ? `<p class="lead">${escapeHtml(event.description)}</p>` : ''}
    </section>
    ${cover ? `<div class="cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(event.name)} cover photo"></div>` : ''}
    ${images.length > 1 ? `<section class="content" aria-label="${escapeHtml(event.name)} event gallery">${gallery}</section>` : ''}
  </main>
  <footer class="footer"><strong>Karma Event Management &amp; Hospitality</strong><br>Jain Event Organizer · Jain Sangh · Bus Sangh · Chaturmas · Paryushan · Upadhan Tap · Pratishtha · Hospitality · Logistics · Complete Event Administration</footer>
</div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300'
      }
    });
  } catch (error) {
    console.error('Event page failed:', error);
    return new Response('Event unavailable', { status: 500 });
  }
}
