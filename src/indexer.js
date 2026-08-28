import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { parseMarkdownFile } from './parser.js';
import db, { initDbSchema, query } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIKI_DIR = process.env.WIKI_DIR || path.join(__dirname, '..', 'wiki');
const FALLBACK_INDEX_PATH = path.join(__dirname, '..', 'wiki-index.json');

export async function runIndexer() {
  console.log('🚀 Starting Portfolio Knowledge Graph Indexer...');
  console.log(`📂 Scanning wiki directory: ${WIKI_DIR}`);

  const hasDb = Boolean(db.pool);
  if (hasDb) {
    console.log('🔌 PostgreSQL database connection detected. Initializing schema...');
    await initDbSchema();
  } else {
    console.log('⚠️ No DATABASE_URL found. Running in JSON file indexer fallback mode.');
  }

  // Find all .md files in wiki directory
  const files = await glob('**/*.md', { cwd: WIKI_DIR, absolute: true });
  console.log(`📄 Found ${files.length} markdown documents.`);

  const parsedPages = [];
  const allLinks = [];

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMarkdownFile(content, filePath);
      parsedPages.push(parsed);

      parsed.links.forEach(targetSlug => {
        allLinks.push({
          source_slug: parsed.slug,
          target_slug: targetSlug
        });
      });
    } catch (err) {
      console.error(`❌ Error parsing file ${filePath}:`, err.message);
    }
  }

  console.log(`📊 Extracted ${parsedPages.length} structured pages and ${allLinks.length} graph link edges.`);

  // 1. Save to PostgreSQL if available
  if (hasDb) {
    try {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Upsert pages
        for (const page of parsedPages) {
          await client.query(`
            INSERT INTO pages (slug, title, summary, content, tags, filepath, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (slug) DO UPDATE SET
              title = EXCLUDED.title,
              summary = EXCLUDED.summary,
              content = EXCLUDED.content,
              tags = EXCLUDED.tags,
              filepath = EXCLUDED.filepath,
              updated_at = NOW()
          `, [page.slug, page.title, page.summary, page.content, page.tags, page.filepath]);
        }

        // Clear & Rebuild Links graph table
        await client.query('DELETE FROM links');
        for (const link of allLinks) {
          await client.query(`
            INSERT INTO links (source_slug, target_slug)
            VALUES ($1, $2)
            ON CONFLICT (source_slug, target_slug) DO NOTHING
          `, [link.source_slug, link.target_slug]);
        }

        await client.query('COMMIT');
        console.log('✅ Successfully indexed wiki into PostgreSQL database!');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ PostgreSQL indexing transaction failed:', err.message);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('❌ Failed to connect to PostgreSQL:', err.message);
    }
  }

  // 2. Save JSON Fallback Index
  const fallbackData = {
    indexed_at: new Date().toISOString(),
    pages_count: parsedPages.length,
    links_count: allLinks.length,
    pages: parsedPages,
    links: allLinks
  };

  fs.writeFileSync(FALLBACK_INDEX_PATH, JSON.stringify(fallbackData, null, 2), 'utf8');
  console.log(`💾 Saved local JSON fallback index to ${FALLBACK_INDEX_PATH}`);
  console.log('🎉 Indexing complete!');
}

// Run directly if invoked from command line
if (process.argv[1] && process.argv[1].endsWith('indexer.js')) {
  runIndexer().then(() => process.exit(0)).catch(err => {
    console.error('Fatal Indexer Error:', err);
    process.exit(1);
  });
}
