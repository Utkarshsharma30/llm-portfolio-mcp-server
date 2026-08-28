-- Database Schema for Portfolio Knowledge Graph & MCP Server

-- 1. Enable UUID Extension (if available)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Pages Table (Stores Markdown Wiki Pages & Content Metadata)
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    tier INT DEFAULT 1,
    filepath VARCHAR(512),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector
);

-- Auto-migrate existing pages table if tier column is missing
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tier INT DEFAULT 1;

-- 3. Links Table (Stores Bidirectional Graph Edges)
CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    source_slug VARCHAR(255) NOT NULL,
    target_slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_slug, target_slug)
);

-- 4. Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_tier ON pages(tier);
CREATE INDEX IF NOT EXISTS idx_pages_tags ON pages USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_pages_search_vector ON pages USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_slug);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_slug);

-- 5. Trigger Function to Keep Full-Text Search Vector Updated
CREATE OR REPLACE FUNCTION update_pages_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pages_search_vector ON pages;
CREATE TRIGGER trg_update_pages_search_vector
BEFORE INSERT OR UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION update_pages_search_vector();
