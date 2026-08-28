import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { query } from './db.js';
import { slugify } from './parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_INDEX_PATH = path.join(__dirname, '..', 'wiki-index.json');

/**
 * Gets the list of permitted tier levels for this MCP server instance from process.env.ALLOWED_TIERS.
 * Default: [1, 2, 3] (All Tiers permitted)
 */
export function getAllowedTiers() {
  const envVal = process.env.ALLOWED_TIERS;
  if (!envVal) return [1, 2, 3];
  const tiers = envVal.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
  return tiers.length > 0 ? tiers : [1, 2, 3];
}

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
 * MCP Tool Handler: search_wiki (Tier-restricted)
 */
export async function searchWiki({ query_text, limit = 10 }) {
  if (!query_text) {
    return { error: 'query_text parameter is required.' };
  }

  const allowedTiers = getAllowedTiers();

  // 1. PostgreSQL Search
  if (db.pool) {
    try {
      const sql = `
        SELECT 
          slug, 
          title, 
          summary, 
          tags,
          tier,
          ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) AS rank,
          ts_headline('english', content, websearch_to_tsquery('english', $1), 'StartSel=**, StopSel=**, MaxWords=35, MinWords=15') AS headline
        FROM pages
        WHERE (tier = ANY($2::int[]))
          AND (
            search_vector @@ websearch_to_tsquery('english', $1)
            OR title ILIKE '%' || $1 || '%'
            OR summary ILIKE '%' || $1 || '%'
            OR $1 = ANY(tags)
          )
        ORDER BY rank DESC
        LIMIT $3;
      `;
      const res = await query(sql, [query_text, allowedTiers, limit]);
      
      if (res.rows.length > 0) {
        return {
          query: query_text,
          server_permitted_tiers: allowedTiers,
          results_count: res.rows.length,
          results: res.rows.map(r => ({
            slug: r.slug,
            title: r.title,
            summary: r.summary,
            tier: r.tier,
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
    .filter(p => allowedTiers.includes(p.tier || 1))
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
      tier: p.tier || 1,
      snippet: p.summary || p.content.slice(0, 200) + '...',
      tags: p.tags
    }));

  return {
    query: query_text,
    server_permitted_tiers: allowedTiers,
    results_count: matched.length,
    results: matched
  };
}

/**
 * MCP Tool Handler: get_page (Tier-restricted)
 */
export async function getPage({ slug_or_title }) {
  if (!slug_or_title) {
    return { error: 'slug_or_title parameter is required.' };
  }

  const allowedTiers = getAllowedTiers();
  const targetSlug = slugify(slug_or_title);

  // 1. PostgreSQL Lookup
  if (db.pool) {
    try {
      const pageRes = await query('SELECT * FROM pages WHERE slug = $1 OR title ILIKE $2', [targetSlug, slug_or_title]);
      if (pageRes.rows.length > 0) {
        const page = pageRes.rows[0];

        // Access boundary check
        if (!allowedTiers.includes(page.tier)) {
          return {
            found: false,
            access_denied: true,
            error: `Access Denied: Page '${page.slug}' is categorized as Tier ${page.tier}. This MCP server instance only permits Tiers: [${allowedTiers.join(', ')}].`
          };
        }

        // Fetch outgoing & incoming links filtered by allowed tiers
        const outRes = await query(`
          SELECT l.target_slug 
          FROM links l
          JOIN pages p ON l.target_slug = p.slug
          WHERE l.source_slug = $1 AND p.tier = ANY($2::int[])
        `, [page.slug, allowedTiers]);

        const inRes = await query(`
          SELECT l.source_slug 
          FROM links l
          JOIN pages p ON l.source_slug = p.slug
          WHERE l.target_slug = $1 AND p.tier = ANY($2::int[])
        `, [page.slug, allowedTiers]);

        return {
          found: true,
          slug: page.slug,
          title: page.title,
          summary: page.summary,
          tier: page.tier,
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
    const pageTier = page.tier || 1;
    if (!allowedTiers.includes(pageTier)) {
      return {
        found: false,
        access_denied: true,
        error: `Access Denied: Page '${page.slug}' is categorized as Tier ${pageTier}. This MCP server instance only permits Tiers: [${allowedTiers.join(', ')}].`
      };
    }

    const permittedSlugs = new Set(fallback.pages.filter(p => allowedTiers.includes(p.tier || 1)).map(p => p.slug));

    const outgoing = fallback.links
      .filter(l => l.source_slug === page.slug && permittedSlugs.has(l.target_slug))
      .map(l => l.target_slug);

    const backlinks = fallback.links
      .filter(l => l.target_slug === page.slug && permittedSlugs.has(l.source_slug))
      .map(l => l.source_slug);

    return {
      found: true,
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      tier: pageTier,
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
 * MCP Tool Handler: get_link_graph (Tier-restricted)
 */
export async function getLinkGraph({ slug }) {
  const allowedTiers = getAllowedTiers();

  if (slug) {
    const targetSlug = slugify(slug);
    const pageDetails = await getPage({ slug_or_title: targetSlug });
    
    if (!pageDetails.found) {
      return { error: pageDetails.error || `Page '${slug}' not found.` };
    }

    return {
      slug: pageDetails.slug,
      title: pageDetails.title,
      tier: pageDetails.tier,
      server_permitted_tiers: allowedTiers,
      graph: {
        outgoing_links: pageDetails.links.outgoing,
        incoming_backlinks: pageDetails.links.backlinks,
        total_connections: pageDetails.links.outgoing.length + pageDetails.links.backlinks.length
      }
    };
  }

  // Full Graph Topology (Filtered by Allowed Tiers)
  if (db.pool) {
    try {
      const res = await query(`
        SELECT l.source_slug, l.target_slug 
        FROM links l
        JOIN pages p1 ON l.source_slug = p1.slug
        JOIN pages p2 ON l.target_slug = p2.slug
        WHERE p1.tier = ANY($1::int[]) AND p2.tier = ANY($1::int[])
      `, [allowedTiers]);

      return {
        server_permitted_tiers: allowedTiers,
        total_edges: res.rows.length,
        edges: res.rows
      };
    } catch (err) {
      console.warn('PostgreSQL graph fetch failed, using fallback:', err.message);
    }
  }

  const fallback = getFallbackData();
  const permittedSlugs = new Set(fallback.pages.filter(p => allowedTiers.includes(p.tier || 1)).map(p => p.slug));
  const filteredEdges = fallback.links.filter(l => permittedSlugs.has(l.source_slug) && permittedSlugs.has(l.target_slug));

  return {
    server_permitted_tiers: allowedTiers,
    total_edges: filteredEdges.length,
    edges: filteredEdges
  };
}

/**
 * MCP Tool Handler: list_pages (Tier-restricted)
 */
export async function listPages({ tag }) {
  const allowedTiers = getAllowedTiers();

  if (db.pool) {
    try {
      let sql = 'SELECT slug, title, summary, tags, tier, updated_at FROM pages WHERE tier = ANY($1::int[])';
      let params = [allowedTiers];

      if (tag) {
        sql += ' AND $2 = ANY(tags)';
        params.push(slugify(tag));
      }
      sql += ' ORDER BY title ASC';
      const res = await query(sql, params);
      return {
        server_permitted_tiers: allowedTiers,
        total_pages: res.rows.length,
        filter_tag: tag || null,
        pages: res.rows
      };
    } catch (err) {
      console.warn('PostgreSQL list_pages failed, using fallback:', err.message);
    }
  }

  const fallback = getFallbackData();
  let pages = fallback.pages.filter(p => allowedTiers.includes(p.tier || 1));
  if (tag) {
    const targetTag = slugify(tag);
    pages = pages.filter(p => p.tags.includes(targetTag));
  }

  return {
    server_permitted_tiers: allowedTiers,
    total_pages: pages.length,
    filter_tag: tag || null,
    pages: pages.map(p => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      tier: p.tier || 1,
      tags: p.tags
    }))
  };
}
