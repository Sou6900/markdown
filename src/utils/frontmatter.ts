// src/utils/frontmatter.ts
//
// Lightweight front-matter extractor.
// Handles the common 80% case: flat key: value pairs, inline arrays
// [a, b, c], quoted strings, booleans, and numbers.
//
// Does NOT support nested YAML objects/multi-line block scalars — for
// anything beyond a flat key/value map, the raw block is preserved as-is
// and surfaced via `raw` so the "raw" display mode still works correctly.

export interface FrontMatterResult {
  /** True if a --- ... --- block was found at the very top of the file. */
  hasFrontMatter: boolean;
  /** Parsed flat key/value pairs (best effort). */
  data: Record<string, string | number | boolean | string[]>;
  /** The raw YAML text between the fences (without the --- markers). */
  raw: string;
  /** The markdown content AFTER the front-matter block has been stripped. */
  content: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseValue(raw: string): string | number | boolean | string[] {
  const trimmed = raw.trim();

  // Inline array: [a, b, "c d"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map(s => stripQuotes(s.trim()))
      .filter(Boolean);
  }

  // Quoted string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return stripQuotes(trimmed);
  }

  // Boolean
  if (trimmed === 'true')  return true;
  if (trimmed === 'false') return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  return trimmed;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseFrontMatter(markdown: string): FrontMatterResult {
  const match = markdown.match(FRONTMATTER_RE);

  if (!match) {
    return { hasFrontMatter: false, data: {}, raw: '', content: markdown };
  }

  const raw = match[1];
  const content = markdown.slice(match[0].length);
  const data: FrontMatterResult['data'] = {};

  raw.split(/\r?\n/).forEach(line => {
    // Skip blank lines, comments, and nested/list lines we can't parse flatly
    if (!line.trim() || line.trim().startsWith('#')) return;
    if (/^\s+/.test(line)) return; // indented = nested structure, skip (handled via raw fallback)

    const idx = line.indexOf(':');
    if (idx === -1) return;

    const key = line.slice(0, idx).trim();
    const valueStr = line.slice(idx + 1);
    if (!key) return;

    data[key] = parseValue(valueStr);
  });

  return { hasFrontMatter: true, data, raw, content };
}