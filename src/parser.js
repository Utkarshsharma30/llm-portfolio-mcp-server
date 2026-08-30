import matter from 'gray-matter';
import path from 'path';

/**
 * List of unnecessary graph link targets to filter out (e.g. readme, licence, index, etc.)
 */
const IGNORED_LINK_SLUGS = new Set([
  'readme',
  'license',
  'licence',
  'index',
  'quick-start',
  'log',
  'changelog',
  'contributing'
]);

/**
 * Converts a page title or filename to a standardized slug format (e.g. "AI/ML" -> "ai-ml")
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_\/]+/g, '-')     // Replace spaces, underscores, slashes with -
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

/**
 * Parses a markdown document and extracts title, summary, content, tags, and wikilinks
 */
export function parseMarkdownFile(fileContent, filePath) {
  const parsed = matter(fileContent);
  const data = parsed.data || {};
  const content = parsed.content || fileContent;
  
  const filename = path.basename(filePath, '.md');
  const slug = slugify(data.title || filename);
  
  // Extract Title
  let title = data.title;
  if (!title) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    title = titleMatch ? titleMatch[1].trim() : filename;
  }
  
  // Extract Summary
  let summary = data.description || data.summary;
  if (!summary) {
    const summaryMatch = content.match(/\*\*Summary\*\*:\s*(.+)$/m);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // First non-heading paragraph fallback
      const paragraphMatch = content.split('\n\n').find(p => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('---'));
      summary = paragraphMatch ? paragraphMatch.trim().slice(0, 300) : '';
    }
  }
  
  // Extract Tags
  const tagsSet = new Set();
  if (Array.isArray(data.tags)) {
    data.tags.forEach(t => tagsSet.add(slugify(t)));
  } else if (typeof data.tags === 'string') {
    data.tags.split(',').forEach(t => tagsSet.add(slugify(t)));
  }
  
  // Inline hashtags search
  const inlineHashtags = content.match(/#([a-zA-Z0-9\-_]+)/g);
  if (inlineHashtags) {
    inlineHashtags.forEach(tag => {
      const cleanTag = slugify(tag.replace('#', ''));
      if (cleanTag && cleanTag.length > 1) {
        tagsSet.add(cleanTag);
      }
    });
  }
  
  // Extract Wikilinks: [[target-page]] or [[target-page|Label]], filtering out ignored links (readme, index, licence)
  const linksSet = new Set();
  const wikilinkRegex = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    const targetSlug = slugify(rawTarget);
    if (targetSlug && targetSlug !== slug && !IGNORED_LINK_SLUGS.has(targetSlug)) {
      linksSet.add(targetSlug);
    }
  }
  
  // Extract Markdown relative links: [label](page-name.md), filtering out ignored links
  const mdLinkRegex = /\[[^\]]+\]\(([^)]+\.md)\)/g;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const targetFile = path.basename(match[1], '.md');
    const targetSlug = slugify(targetFile);
    if (targetSlug && targetSlug !== slug && !IGNORED_LINK_SLUGS.has(targetSlug)) {
      linksSet.add(targetSlug);
    }
  }
  
  // Determine Access Tier:
  // Tier 1: Asia countries excluding India (Asia, Dubai, Japan, Singapore)
  // Tier 2: India and states excluding Delhi (India, Goa, Kerala, Maharashtra, Manali, Mumbai, Agra, Top Indian Places)
  // Tier 3: Delhi & Full Access (Delhi, Things to Do in Delhi)
  let tier = parseInt(data.tier, 10);
  if (isNaN(tier)) {
    const tier3Slugs = ['delhi', 'things-to-do-in-delhi'];
    const tier2Slugs = [
      'india', 'goa', 'kerala', 'maharashtra', 'manali', 'mumbai', 
      'top-indian-places-to-visit', 'agra', 'explore-manali', 
      'goa-india', 'places-to-visit-in-india'
    ];
    
    if (tier3Slugs.includes(slug)) {
      tier = 3;
    } else if (tier2Slugs.includes(slug)) {
      tier = 2;
    } else {
      tier = 1; // Asia countries (Asia, Dubai, Japan, Singapore)
    }
  }

  return {
    slug,
    title,
    summary,
    content,
    tags: Array.from(tagsSet),
    links: Array.from(linksSet),
    tier,
    filepath: filePath
  };
}
