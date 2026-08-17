/* Karma Event compatibility + UI fixes.
   This file is loaded by both the public site and the hidden admin page. */
(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // ---- PUBLIC LUXURY GALLERY ----
  // Prefer real images stored by the Completed Events admin system.
  // This keeps the gallery live without duplicating uploaded image files.
  const style = document.createElement('style');
  style.textContent = `
    .gallery-img{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;position:relative;overflow:hidden;}
    .gallery-img.has-real-image .gallery-visual{display:none!important;}
    .gallery-img.has-real-image{height:260px!important;}
    .gallery-item.gallery-hidden{display:none!important;}
    .gallery-item .gallery-overlay{z-index:3;}
    .gallery-item .gallery-overlay span{position:relative;z-index:4;}
    @media(max-width:768px){.gallery-img.has-real-image{height:230px!important;}}
    @media(max-width:480px){.gallery-img.has-real-image{height:auto!important;aspect-ratio:4/3;}}
  `;
  document.head.appendChild(style);

  async function loadLuxuryGalleryLive() {
    const grid = document.querySelector('#gallery .gallery-grid');
    if (!grid) return;

    try {
      const response = await fetch('/api?action=events', { cache: 'no-store' });
      const data = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];
      if (!events.length) return;

      const images = [];
      for (const event of events) {
        if (event.cover) images.push({ src:event.cover, title:event.name || 'Completed Event' });
        if (Array.isArray(event.images)) {
          for (const src of event.images) {
            if (src) images.push({ src, title:event.name || 'Completed Event' });
          }
        }
      }

      const unique = [];
      const seen = new Set();
      for (const item of images) {
        if (!seen.has(item.src)) {
          seen.add(item.src);
          unique.push(item);
        }
        if (unique.length >= 8) break;
      }
      if (!unique.length) return;

      const cards = Array.from(grid.querySelectorAll('.gallery-item'));
      cards.forEach((card, index) => {
        if (index >= unique.length) {
          card.classList.add('gallery-hidden');
          return;
        }
        const img = card.querySelector('.gallery-img');
        const label = card.querySelector('.gallery-overlay span');
        if (!img) return;
        img.style.backgroundImage = `url("${unique[index].src}")`;
        img.classList.add('has-real-image');
        img.setAttribute('aria-label', unique[index].title);
        if (label) label.textContent = unique[index].title;
        card.classList.remove('gallery-hidden');
      });
    } catch (error) {
      // Keep the original luxury placeholders as a safe fallback.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLuxuryGalleryLive);
  } else {
    loadLuxuryGalleryLive();
  }
  window.addEventListener('load', loadLuxuryGalleryLive);

  // ---- DYNAMIC CURSOR / COMPLETED EVENT FIX ----
  // Completed events are injected after the original cursor listeners are
  // registered. Event delegation keeps hover behavior stable for dynamic cards.
  function cursorHover(active) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    dot.style.width = active ? '16px' : '8px';
    dot.style.height = active ? '16px' : '8px';
    ring.style.width = active ? '56px' : '36px';
    ring.style.height = active ? '56px' : '36px';
    ring.style.borderColor = active ? 'rgba(212,175,55,.8)' : 'rgba(212,175,55,.5)';
  }
  document.addEventListener('mouseover', (event) => {
    if (event.target && event.target.closest && event.target.closest('a,button,.service-card,.hosp-card,.gallery-item,.completed-event-card')) cursorHover(true);
  });
  document.addEventListener('mouseout', (event) => {
    const r = event.relatedTarget;
    if (!r || !r.closest || !r.closest('a,button,.service-card,.hosp-card,.gallery-item,.completed-event-card')) cursorHover(false);
  });
  window.addEventListener('blur', () => cursorHover(false));

  // When a completed-event gallery modal opens, let the browser cursor take
  // over so the custom cursor cannot fight with the fixed modal layer.
  function syncModalCursor() {
    const cursor = document.getElementById('cursor');
    const modal = document.getElementById('completedEventModal');
    if (!cursor || !modal) return;
    const open = modal.classList.contains('open');
    cursor.style.display = open ? 'none' : '';
    document.body.style.cursor = open ? 'auto' : '';
  }
  const observer = new MutationObserver(syncModalCursor);
  function initUiFixes() {
    const modal = document.getElementById('completedEventModal');
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    syncModalCursor();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUiFixes); else initUiFixes();

  // The completed-event renderer currently runs once before the reveal observer
  // is initialized. Run it again after the page is fully initialized so the
  // dynamically-added cards are observed correctly and do not remain in a bad
  // visual state.
  window.addEventListener('load', () => {
    if (typeof window.loadCompletedEventsLive === 'function') {
      try { window.loadCompletedEventsLive(); } catch (e) { /* keep site usable */ }
    }
    try { loadLuxuryGalleryLive(); } catch (e) { /* keep site usable */ }
  });

  // ---- ADMIN COMPLETED EVENTS RENDERER ----
  // admin.html calls renderEvents(), but completedEvents is a block-scoped
  // variable there. Fetch from the API instead so this helper always has the
  // authoritative server data and never depends on window.completedEvents.
  window.renderEvents = async function renderEvents() {
    const grid = document.getElementById('eventsAdminGrid');
    if (!grid) return;
    try {
      const response = await fetch('/api?action=events', { cache: 'no-store' });
      const data = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const count = document.getElementById('eventCount');
      if (count) count.textContent = String(events.length);
      if (!events.length) {
        grid.innerHTML = '<div class="event-empty">No completed events yet. Click “+ Add Completed Event” to add one.</div>';
        return;
      }
      grid.innerHTML = events.map(item => {
        const date = item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
        return `<article class="event-admin-card">
          ${item.cover ? `<img src="${esc(item.cover)}" alt="${esc(item.name)}" loading="lazy">` : '<div style="height:150px;display:flex;align-items:center;justify-content:center;color:#777">No image</div>'}
          <div class="event-admin-card-body">
            <h3>${esc(item.name || 'Completed Event')}</h3>
            <div class="event-meta">${[item.category || 'Completed Event', date].filter(Boolean).join(' · ')}</div>
            <div class="event-desc">${esc(item.location || '')}${item.location && item.description ? ' · ' : ''}${esc(item.description || '')}</div>
            <div class="event-actions">
              <button class="btn btn-outline btn-sm" type="button" onclick="openEventForm('${esc(item.id)}')">Edit</button>
              <button class="btn btn-danger btn-sm" type="button" onclick="deleteEvent('${esc(item.id)}')">Delete</button>
            </div>
          </div>
        </article>`;
      }).join('');
    } catch (error) {
      grid.innerHTML = '<div class="event-empty">Could not load completed events. Please refresh.</div>';
    }
  };
})();
