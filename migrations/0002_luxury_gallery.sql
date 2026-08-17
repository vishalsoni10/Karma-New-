CREATE TABLE IF NOT EXISTS luxury_gallery_images (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  data BLOB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_luxury_gallery_sort
ON luxury_gallery_images(sort_order, created_at);
