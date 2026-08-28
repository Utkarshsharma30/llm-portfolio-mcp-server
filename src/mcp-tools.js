import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { query } from './db.js';
import { slugify } from './parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_INDEX_PATH = path.join(__dirname, '..', 'wiki-index.json');

/**
 * Loads JSON fallback index if PostgreSQL is unavailable
 */
function getFallbackData() {
  if (fs.existsSync(FALLBACK_INDEX_PATH)) {
    try {
      const content = fs.readFileSync(FALLBACK_INDEX_PATH, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading fallback index:', err.message);
    }
  }
  return { pages: [], links: [] };
}

/**
 * MCP Tool Handler: search_wiki
 */
export async function searchWiki({ query_text, limit = 10 }) {
  if (!query_text) {
    return { error: 'query_text parameter is required.' };
  }

  // 1. PostgreSQL Search
  if (db.pool) {
    try {
      const sql = `
        SELECT 
          slug, 
          title, 
          summary, 
          tags,
          ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) AS rank,
          ts_headline('english', content, websearch_to_tsquery('english', $1), 'StartSel=**, StopSel=**, MaxWords=35, MinWords=15') AS headline
        FROM pages
        WHERE search_vector @@ websearch_to_tsquery('english', $1)
           OR title ILIKE '%' || $1 || '%'
           OR summary ILIKE '%' || $1 || '%'
           OR $1 = ANY(tags)
        ORDER BY rank DESC
        LIMIT $2;
      `;
      const res = await query(sql, [query_text, limit]);
      
      if (res.rows.length > 0) {
        return {
          query: query_text,
          results_count: res.rows.length,
          results: res.rows.map(r => ({
            slug: r.slug,
            title: r.title,
            summary: r.summary,
            snippet: r.headline || r.summary,
            tags: r.tags,
            rank: r.rank
          }))
        };
      }
    } catch (err) {
      console.warn('PostgreSQL search failed, falling back to JSON index:', err.message);
    }
  }

  // 2. JSON Fallback Search
  const fallback = getFallbackData();
  const q = query_text.toLowerCase();
  const matched = fallback.pages
    .filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
    .slice(0, limit)
    .map(p => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      snippet: p.summary || p.content.slice(0, 200) + '...',
      tags: p.tags
    }));

  return {
    query: query_text,
    results_count: matched.length,
    results: matched
  };
}

/**
 * MCP Tool Handler: get_page
 */
export async function getPage({ slug_or_title }) {
  if (!slug_or_title) {
    return { error: 'slug_or_title parameter is required.' };
  }

  const targetSlug = slugify(slug_or_title);

  // 1. PostgreSQL Lookup
  if (db.pool) {
    try {
      const pageRes = await query('SELECT * FROM pages WHERE slug = $1 OR title ILIKE $2', [targetSlug, slug_or_title]);
      if (pageRes.rows.length > 0) {
        const page = pageRes.rows[0];

        // Fetch outgoing & incoming links
        const outRes = await query('SELECT target_slug FROM links WHERE source_slug = $1', [page.slug]);
        const inRes = await query('SELECT source_slug FROM links WHERE target_slug = $1', [page.slug]);

        return {
          found: true,
          slug: page.slug,
          title: page.title,
          summary: page.summary,
          tags: page.tags,
          content: page.content,
          updated_at: page.updated_at,
          links: {
            outgoing: outRes.rows.map(r => r.target_slug),
            backlinks: inRes.rows.map(r => r.source_slug)
          }
        };
      }
    } catch (err) {
      console.warn('PostgreSQL page lookup failed, using fallback:', err.message);
    }
  }

  // 2. JSON Fallback Lookup
  const fallback = getFallbackData();
  const page = fallback.pages.find(p => p.slug === targetSlug || p.title.toLowerCase() === slug_or_title.toLowerCase());
  
  if (page) {
    const outgoing = fallback.links.filter(l => l.source_slug === page.slug).map(l => l.target_slug);
    const backlinks = fallback.links.filter(l => l.target_slug === page.slug).map(l => l.source_slug);

    return {
      found: true,
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      tags: page.tags,
      content: page.content,
      links: {
        outgoing,
        backlinks
      }
    };
  }

  return {
    found: false,
    error: `Page '${slug_or_title}' not found in portfolio wiki.`
  };
}

/**
 * MCP Tool Handler: get_link_graph
 */
export async function getLinkGraph({ slug }) {
  if (slug) {
    const targetSlug = slugify(slug);
    const pageDetails = await getPage({ slug_or_title: targetSlug });
    
    if (!pageDetails.found) {
      return { error: `Page '${slug}' not found.` };
    }

    return {
      slug: pageDetails.slug,
      title: pageDetails.title,
      graph: {
        outgoing_links: pageDetails.links.outgoing,
        incoming_backlinks: pageDetails.links.backlinks,
        total_connections: pageDetails.links.outgoing.length + pageDetails.links.backlinks.length
      }
    };
  }

  // Full Graph Topology
  if (db.pool) {
    try {
      const res = await query('SELECT source_slug, target_slug FROM links');
      return {
        total_edges: res.rows.length,
        edges: res.rows
      };
    } catch (err) {
      console.warn('PostgreSQL graph fetch failed, using fallback:', err.message);
    }
  }

  const fallback = getFallbackData();
  return {
    total_edges: fallback.links.length,
    edges: fallback.links
  };
}

/**
 * MCP Tool Handler: list_pages
 */
export async function listPages({ tag }) {
  if (db.pool) {
    try {
      let sql = 'SELECT slug, title, summary, tags, updated_at FROM pages';
      let params = [];
      if (tag) {
        sql += ' WHERE $1 = ANY(tags)';
        params.push(slugify(tag));
      }
      sql += ' ORDER BY title ASC';
      const res = await query(sql, params);
      return {
        total_pages: res.rows.length,
        filter_tag: tag || null,
        pages: res.rows
      };
    } catch (err) {
      console.warn('PostgreSQL list_pages failed, using fallback:', err.message);
    }
  }

  const fallback = getFallbackData();
  let pages = fallback.pages;
  if (tag) {
    const targetTag = slugify(tag);
    pages = pages.filter(p => p.tags.includes(targetTag));
  }

  return {
    total_pages: pages.length,
    filter_tag: tag || null,
    pages: pages.map(p => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      tags: p.tags
    }))
  };
}
