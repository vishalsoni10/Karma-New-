CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  cover_image_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);

CREATE TABLE IF NOT EXISTS event_images (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  mime_type TEXT NOT NULL,
  data BLOB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_images_event ON event_images(event_id, sort_order);

CREATE TABLE IF NOT EXISTS luxury_gallery_images (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  data BLOB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_luxury_gallery_sort ON luxury_gallery_images(sort_order, created_at);
