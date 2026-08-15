/* Karma Event admin compatibility helper.
   admin.html already loads /analytics.js. This file supplies the missing
   renderEvents() function used by the completed-events admin panel. */
(function () {
  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  window.renderEvents = function renderEvents() {
    const grid = document.getElementById('eventsAdminGrid');
    if (!grid) return;

    // completedEvents is declared with `let` in admin.html, so read the
    // global lexical binding rather than window.completedEvents.
    const events = (typeof completedEvents !== 'undefined' && Array.isArray(completedEvents))
      ? completedEvents : [];
    const count = document.getElementById('eventCount');
    if (count) count.textContent = String(events.length);

    if (!events.length) {
      grid.innerHTML = '<div class="event-empty">No completed events yet. Click “+ Add Completed Event” to add one.</div>';
      if (typeof updateStats === 'function') updateStats();
      return;
    }

    grid.innerHTML = events.map((event) => {
      const cover = event.cover || '';
      const image = cover
        ? `<img src="${esc(cover)}" alt="${esc(event.name)}" loading="lazy">`
        : '<div style="height:150px;display:flex;align-items:center;justify-content:center;color:#777">No image</div>';
      const date = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString(undefined, {day:'2-digit', month:'short', year:'numeric'}) : '';
      const meta = [date, event.location, event.category].filter(Boolean).map(esc).join(' • ');

      return `<article class="event-admin-card">
        ${image}
        <div class="event-admin-card-body">
          <h3>${esc(event.name)}</h3>
          <div class="event-meta">${meta || 'Completed Event'}</div>
          <div class="event-desc">${esc(event.description || '')}</div>
          <div class="event-actions">
            <button class="btn btn-outline btn-sm" type="button" onclick="openEventForm('${esc(event.id)}')">Edit</button>
            <button class="btn btn-danger btn-sm" type="button" onclick="deleteEvent('${esc(event.id)}')">Delete</button>
          </div>
        </div>
      </article>`;
    }).join('');

    if (typeof updateStats === 'function') updateStats();
  };
})();
