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
 * Builds a Map of slug -> tier and array of all pages for tier checking
 */
async function getPageTierInfo() {
  const slugToTier = new Map();
  let allPages = [];

  if (db.pool) {
    try {
      const res = await query('SELECT slug, title, tier FROM pages');
      allPages = res.rows;
      for (const r of res.rows) {
        slugToTier.set(r.slug, r.tier);
      }
      return { slugToTier, allPages };
    } catch (err) {
      console.warn('PostgreSQL getPageTierInfo failed, using fallback index:', err.message);
    }
  }

  const fallback = getFallbackData();
  allPages = fallback.pages;
  for (const p of fallback.pages) {
    slugToTier.set(p.slug, p.tier || 1);
  }
  return { slugToTier, allPages };
}

/**
 * Sanitizes markdown content by removing any references, wikilinks, lines, or mentions of pages
 * belonging to restricted access tiers for the current server instance.
 */
export function sanitizeContent(content, allowedTiers, slugToTier, allPages = []) {
  if (!content) return '';

  const restrictedSlugsAndTitles = [];
  for (const [slug, tier] of slugToTier.entries()) {
    if (!allowedTiers.includes(tier)) {
      restrictedSlugsAndTitles.push(slug);
      const pageObj = allPages.find(p => p.slug === slug);
      if (pageObj && pageObj.title) {
        restrictedSlugsAndTitles.push(pageObj.title.toLowerCase());
      }
    }
  }

  const lines = content.split('\n');
  const sanitizedLines = [];

  for (let line of lines) {
    let keepLine = true;

    // 1. Check for wikilinks [[Target]] or [[Target|Label]]
    const wikilinkMatches = line.match(/\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g);
    if (wikilinkMatches) {
      for (const match of wikilinkMatches) {
        const rawTarget = match.replace(/\[\[|\]\]/g, '').split('|')[0].trim();
        const targetSlug = slugify(rawTarget);
        const targetTier = slugToTier.get(targetSlug);

        if (targetTier !== undefined && !allowedTiers.includes(targetTier)) {
          if (line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('#')) {
            keepLine = false;
            break;
          } else {
            line = line.replace(match, '').trim();
          }
        }
      }
    }

    // 2. Check for markdown links [Label](target.md)
    const mdLinkMatches = line.match(/\[([^\]]+)\]\(([^)]+\.md)\)/g);
    if (mdLinkMatches && keepLine) {
      for (const match of mdLinkMatches) {
        const targetFileMatch = match.match(/\(([^)]+\.md)\)/);
        if (targetFileMatch) {
          const targetSlug = slugify(path.basename(targetFileMatch[1], '.md'));
          const targetTier = slugToTier.get(targetSlug);

          if (targetTier !== undefined && !allowedTiers.includes(targetTier)) {
            if (line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('#')) {
              keepLine = false;
              break;
            } else {
              line = line.replace(match, '').trim();
            }
          }
        }
      }
    }

    // 3. Strip lines or words referencing restricted titles/slugs explicitly in list items or headings
    if (keepLine && restrictedSlugsAndTitles.length > 0) {
      const lowerLine = line.toLowerCase();
      for (const resItem of restrictedSlugsAndTitles) {
        if (resItem.length > 2 && lowerLine.includes(resItem)) {
          if (line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('#')) {
            keepLine = false;
            break;
          } else {
            const regex = new RegExp(`\\b${resItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            line = line.replace(regex, '').trim();
          }
        }
      }
    }

    if (keepLine && line.trim().length > 0) {
      sanitizedLines.push(line);
    }
  }

  return sanitizedLines.join('\n');
}

/**
 * MCP Tool Handler: search_wiki (Tier-restricted, Query Guarded & Content Sanitized)
 */
export async function searchWiki({ query_text, limit = 10 }) {
  if (!query_text) {
    return { error: 'query_text parameter is required.' };
  }

  const allowedTiers = getAllowedTiers();
  const { slugToTier, allPages } = await getPageTierInfo();

  // Guard: If the query_text directly targets a restricted slug/title, return 0 results immediately
  const querySlug = slugify(query_text);
  const queryTier = slugToTier.get(querySlug);
  if (queryTier !== undefined && !allowedTiers.includes(queryTier)) {
    return {
      query: query_text,
      server_permitted_tiers: allowedTiers,
      results_count: 0,
      results: []
    };
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
          tier,
          content,
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
        const sanitizedResults = res.rows.map(r => ({
          slug: r.slug,
          title: r.title,
          summary: sanitizeContent(r.summary, allowedTiers, slugToTier, allPages),
          tier: r.tier,
          snippet: sanitizeContent(r.headline || r.summary, allowedTiers, slugToTier, allPages),
          tags: r.tags,
          rank: r.rank
        })).filter(r => r.summary.length > 0 || r.snippet.length > 0);

        return {
          query: query_text,
          server_permitted_tiers: allowedTiers,
          results_count: sanitizedResults.length,
          results: sanitizedResults
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
      summary: sanitizeContent(p.summary, allowedTiers, slugToTier, allPages),
      tier: p.tier || 1,
      snippet: sanitizeContent(p.summary || p.content.slice(0, 200) + '...', allowedTiers, slugToTier, allPages),
      tags: p.tags
    }))
    .filter(p => p.summary.length > 0 || p.snippet.length > 0);

  return {
    query: query_text,
    server_permitted_tiers: allowedTiers,
    results_count: matched.length,
    results: matched
  };
}

/**
 * MCP Tool Handler: get_page (Strict Tier Boundary & Fully Sanitized Content)
 */
export async function getPage({ slug_or_title }) {
  if (!slug_or_title) {
    return { error: 'slug_or_title parameter is required.' };
  }

  const allowedTiers = getAllowedTiers();
  const targetSlug = slugify(slug_or_title);
  const { slugToTier, allPages } = await getPageTierInfo();

  // 1. PostgreSQL Lookup
  if (db.pool) {
    try {
      const pageRes = await query('SELECT * FROM pages WHERE slug = $1 OR title ILIKE $2', [targetSlug, slug_or_title]);
      if (pageRes.rows.length > 0) {
        const page = pageRes.rows[0];

        // Access boundary check - Return standard 404 error if tier is restricted so no metadata leaks!
        if (!allowedTiers.includes(page.tier)) {
          return {
            found: false,
            error: `Page '${slug_or_title}' not found in travel wiki.`
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
          summary: sanitizeContent(page.summary, allowedTiers, slugToTier, allPages),
          tier: page.tier,
          tags: page.tags,
          content: sanitizeContent(page.content, allowedTiers, slugToTier, allPages),
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

    // Silent restriction: Return standard 404 if tier is restricted
    if (!allowedTiers.includes(pageTier)) {
      return {
        found: false,
        error: `Page '${slug_or_title}' not found in travel wiki.`
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
      summary: sanitizeContent(page.summary, allowedTiers, slugToTier, allPages),
      tier: pageTier,
      tags: page.tags,
      content: sanitizeContent(page.content, allowedTiers, slugToTier, allPages),
      links: {
        outgoing,
        backlinks
      }
    };
  }

  return {
    found: false,
    error: `Page '${slug_or_title}' not found in travel wiki.`
  };
}

/**
 * MCP Tool Handler: get_link_graph (Strict Tier Boundary)
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

  // Full Graph Topology (Strictly Filtered by Allowed Tiers)
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
 * MCP Tool Handler: list_pages (Strict Tier Boundary & Sanitized Summaries)
 */
export async function listPages({ tag }) {
  const allowedTiers = getAllowedTiers();
  const { slugToTier, allPages } = await getPageTierInfo();

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
        pages: res.rows.map(r => ({
          ...r,
          summary: sanitizeContent(r.summary, allowedTiers, slugToTier, allPages)
        }))
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
      summary: sanitizeContent(p.summary, allowedTiers, slugToTier, allPages),
      tier: p.tier || 1,
      tags: p.tags
    }))
  };
}
