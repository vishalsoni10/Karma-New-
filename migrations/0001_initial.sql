CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT,
  location TEXT,
  category TEXT,
  description TEXT,
  cover_image TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_images (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  image_data TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_created_at
ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_event_images_event_id
ON event_images(event_id);
