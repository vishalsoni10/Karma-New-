const SITE = 'https://karmaevent.in';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'event';
}
function eventUrl(event) { return `${SITE}/events/${slugify(event.name)}-${String(event.id).slice(0, 8)}/`; }
function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
}

export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare(`
      SELECT e.id,e.name,e.date,e.location,e.category,e.description,e.cover_image_id
      FROM events e ORDER BY e.date DESC,e.created_at DESC
    `).all();
    const events = result.results || [];
    const cards = events.map(event => {
      const cover = event.cover_image_id ? `/api?action=image&id=${encodeURIComponent(event.cover_image_id)}` : '';
      return `<article class="card">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(event.name)}" loading="lazy">` : '<div class="no-image">KARMA</div>'}<div class="body"><div class="eyebrow">Completed Jain Event</div><h2>${escapeHtml(event.name)}</h2><div class="meta">${event.date ? `📅 ${escapeHtml(formatDate(event.date))}` : ''}${event.location ? ` · 📍 ${escapeHtml(event.location)}` : ''}</div>${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}<a href="${escapeHtml(eventUrl(event))}">View Event →</a></div></article>`;
    }).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Completed Jain Events | Karma Event Management & Hospitality</title><meta name="description" content="Completed Jain events managed by Karma Event Management & Hospitality, including Sangh, Chaturmas, Pratishtha, hospitality, logistics and on-ground administration."><link rel="canonical" href="${SITE}/events/"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Cinzel:wght@500;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"><style>:root{--b:#0a0a0a;--p:#121212;--g:#d4af37;--w:#f8f5ee;--m:rgba(248,245,238,.6);--l:rgba(212,175,55,.18)}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--w);font-family:Montserrat,sans-serif;font-weight:300}.wrap{width:min(1180px,92%);margin:auto}.nav{padding:26px 0;border-bottom:1px solid var(--l);display:flex;justify-content:space-between}.brand{font-family:Cinzel,serif;letter-spacing:.16em;color:var(--g);font-weight:700}.back{color:var(--m);font-size:.68rem;text-decoration:none;text-transform:uppercase;letter-spacing:.15em}.hero{padding:70px 0 45px;text-align:center}.eyebrow{color:var(--g);font-size:.6rem;letter-spacing:.28em;text-transform:uppercase}.hero h1{font-family:Cormorant Garamond,serif;font-size:clamp(2.8rem,6vw,5rem);margin:12px 0}.hero p{color:var(--m);max-width:750px;margin:auto;line-height:1.8}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding-bottom:70px}.card{background:var(--p);border:1px solid var(--l);overflow:hidden}.card img,.no-image{width:100%;height:230px;object-fit:cover;display:block}.no-image{display:grid;place-items:center;font-family:Cinzel,serif;color:var(--g);font-size:1.4rem}.body{padding:22px}.body h2{font-family:Cormorant Garamond,serif;font-size:1.8rem;margin:10px 0}.meta{font-size:.68rem;color:var(--g);line-height:1.7}.body p{font-size:.72rem;color:var(--m);line-height:1.7;min-height:38px}.body a{display:inline-block;margin-top:10px;color:var(--g);font-size:.65rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none}@media(max-width:850px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><nav class="nav"><div class="brand">KARMA</div><a class="back" href="/">← Back to Karma</a></nav><main><section class="hero"><div class="eyebrow">Karma Event Portfolio</div><h1>Completed Jain Events</h1><p>Explore completed Jain events managed by Karma Event Management & Hospitality, with event details, locations, photographs and on-ground execution highlights.</p></section><section class="grid" aria-label="Completed Jain events">${cards || '<p style="color:var(--m);grid-column:1/-1;text-align:center">No completed events published yet.</p>'}</section></main></div></body></html>`;
    return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=300,s-maxage=300'}});
  } catch (error) {
    console.error('Completed events archive failed:', error);
    return new Response('Events unavailable',{status:500});
  }
}
