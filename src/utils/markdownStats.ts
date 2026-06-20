// src/utils/markdownStats.ts
//
// Computes word count and estimated reading time from raw markdown,
// stripping syntax noise (code fences, links, images, emphasis markers,
// heading hashes) so the count reflects actual prose.

export interface MarkdownStats {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
}

function stripMarkdownSyntax(markdown: string): string {
  return markdown
    // Remove fenced code blocks entirely (code isn't "reading" prose)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    // Inline code
    .replace(/`[^`]*`/g, ' ')
    // Images ![alt](url) — keep alt text, drop the rest
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links [text](url) — keep the visible text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Heading hashes
    .replace(/^#{1,6}\s+/gm, '')
    // Emphasis / strong markers
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    // Blockquote markers
    .replace(/^>\s?/gm, '')
    // List markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // HTML tags
    .replace(/<\/?[^>]+>/g, ' ')
    // Front matter fence markers (content itself already stripped upstream)
    .replace(/^---$/gm, '');
}

export function computeMarkdownStats(markdown: string, wordsPerMinute = 200): MarkdownStats {
  const cleaned = stripMarkdownSyntax(markdown);
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = cleaned.replace(/\s+/g, '').length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / Math.max(1, wordsPerMinute)));

  return { wordCount, charCount, readingTimeMinutes };
}