// src/utils/renderMarkdownToHtmlString.ts
//
// Standalone (non-React) rendering pipeline used by the export commands
// (Export as HTML, Copy as HTML). Produces a complete, self-contained
// HTML document string.
//
// This mirrors the plugin set used by the live React preview
// (MarkdownPreviewTab.tsx) so exported output visually matches what the
// user sees in the IDE, but runs through `unified` directly since no
// DOM/React tree is needed for a static export.
//
// Mermaid diagrams are NOT pre-rendered to SVG here — instead the exported
// HTML embeds the Mermaid CDN script and renders diagrams client-side when
// the exported file is opened in a browser. This is the standard approach
// for portable Mermaid exports and avoids a heavy server-side render step.

import { unified } from 'unified';
import remarkParse   from 'remark-parse';
import remarkGfm      from 'remark-gfm';
import remarkMath      from 'remark-math';
import remarkEmoji      from 'remark-emoji';
import remarkRehype      from 'remark-rehype';
import rehypeRaw          from 'rehype-raw';
import rehypeSanitize      from 'rehype-sanitize';
import rehypeSlug           from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight        from 'rehype-highlight';
import rehypeKatex              from 'rehype-katex';
import rehypeStringify           from 'rehype-stringify';

import { remarkSmartQuotes } from './remarkSmartQuotes';
import { parseFrontMatter }  from './frontmatter';

export interface ExportOptions {
  title?:           string;
  theme?:            'light' | 'dark' | 'github';
  includeStyles?:    boolean;
  enableMath?:       boolean;
  enableMermaid?:    boolean;
  enableEmoji?:      boolean;
  smartQuotes?:      boolean;
  breakOnSingleNewline?: boolean;
  allowRawHtml?:     boolean;
  sanitizeHtml?:     boolean;
  headingAnchors?:   boolean;
}

const DEFAULTS: Required<ExportOptions> = {
  title:                 'Document',
  theme:                  'github',
  includeStyles:          true,
  enableMath:             true,
  enableMermaid:          true,
  enableEmoji:            true,
  smartQuotes:            true,
  breakOnSingleNewline:   false,
  allowRawHtml:           true,
  sanitizeHtml:           true,
  headingAnchors:         true,
};

// ── Self-contained export stylesheet (kept separate from the live preview
//    CSS so the export pipeline has zero bundler/import-loader dependency) ──

const EXPORT_CSS: Record<'light' | 'dark' | 'github', string> = {
  github: `
    body{background:#fff;color:#1f2328;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.6;}
    h1,h2{border-bottom:1px solid #d1d9e0;padding-bottom:.3em;}
    a{color:#0969da;}
    pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto;}
    code{font-family:'JetBrains Mono',monospace;font-size:85%;}
    pre code{background:none;padding:0;}
    blockquote{margin:0;padding:0 1em;color:#59636e;border-left:.25em solid #d1d9e0;}
    table{border-collapse:collapse;width:100%;margin-bottom:16px;}
    th,td{border:1px solid #d1d9e0;padding:6px 13px;}
    th{background:#f6f8fa;}
    img{max-width:100%;}
    .heading-anchor{opacity:0;margin-left:6px;text-decoration:none;color:#59636e;}
    h1:hover .heading-anchor,h2:hover .heading-anchor,h3:hover .heading-anchor,
    h4:hover .heading-anchor,h5:hover .heading-anchor,h6:hover .heading-anchor{opacity:1;}
  `,
  light: `
    body{background:#ffffff;color:#1e1e1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.6;}
    pre{background:#f3f3f3;padding:16px;border-radius:6px;overflow-x:auto;}
    a{color:#0066cc;}
    blockquote{border-left:.25em solid #ddd;padding:0 1em;color:#666;margin:0;}
    table{border-collapse:collapse;width:100%;}
    th,td{border:1px solid #ddd;padding:6px 13px;}
  `,
  dark: `
    body{background:#1e1e1e;color:#cccccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.6;}
    pre{background:#252526;padding:16px;border-radius:6px;overflow-x:auto;}
    a{color:#3794ff;}
    blockquote{border-left:.25em solid #454545;padding:0 1em;color:#9d9d9d;margin:0;}
    table{border-collapse:collapse;width:100%;}
    th,td{border:1px solid #454545;padding:6px 13px;}
    th{background:#2d2d2d;}
  `,
};

// ── Mermaid block conversion (post-process step) ─────────────────────────────
// Converts highlighted-but-unrendered `language-mermaid` code blocks back
// into a plain `<pre class="mermaid">` element so client-side mermaid.js
// can pick it up and render it when the exported file is opened.

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g,  '<')
    .replace(/&gt;/g,  '>')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g, "'");
}

function convertMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="(?:hljs )?language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code: string) => `<pre class="mermaid">${decodeHtmlEntities(code)}</pre>`
  );
}

// ── Main export function ──────────────────────────────────────────────────────

export async function renderMarkdownToHtmlString(
  markdown: string,
  options: ExportOptions = {},
): Promise<string> {
  const opts = { ...DEFAULTS, ...options };

  // Strip front matter before processing body content
  const { content } = parseFrontMatter(markdown);

  // ── Build the unified pipeline ──────────────────────────────────────────────
  let processor = unified().use(remarkParse).use(remarkGfm);

  if (opts.breakOnSingleNewline) {
    // remark-gfm doesn't control this; handled via remark-breaks if desired.
    // Kept as a no-op placeholder for parity with the live preview's setting —
    // add `remark-breaks` as a dependency if hard line-break behaviour is required.
  }

  if (opts.smartQuotes) processor = processor.use(remarkSmartQuotes);
  if (opts.enableEmoji) processor = processor.use(remarkEmoji, { accessible: true });
  if (opts.enableMath)  processor = processor.use(remarkMath);

  processor = processor.use(remarkRehype, { allowDangerousHtml: opts.allowRawHtml });

  if (opts.allowRawHtml) {
    processor = processor.use(rehypeRaw);
    if (opts.sanitizeHtml) processor = processor.use(rehypeSanitize);
  }

  if (opts.headingAnchors) {
    processor = processor
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: ['heading-anchor'], ariaHidden: true, tabIndex: -1 },
        content: { type: 'text', value: '#' },
      });
  }

  processor = processor.use(rehypeHighlight, { detect: true, ignoreMissing: true });

  if (opts.enableMath) processor = processor.use(rehypeKatex);

  processor = processor.use(rehypeStringify, { allowDangerousHtml: opts.allowRawHtml });

  const file = await processor.process(content);
  let bodyHtml = String(file);

  if (opts.enableMermaid) {
    bodyHtml = convertMermaidBlocks(bodyHtml);
  }

  // ── Wrap into a full HTML document ───────────────────────────────────────────
  const styleBlock = opts.includeStyles
    ? `<style>${EXPORT_CSS[opts.theme]}</style>`
    : '';

  const katexCss = opts.enableMath
    ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">`
    : '';

  const mermaidScript = opts.enableMermaid
    ? `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
       <script>mermaid.initialize({ startOnLoad: true, theme: '${opts.theme === 'dark' ? 'dark' : 'default'}' });</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title}</title>
${katexCss}
${styleBlock}
</head>
<body>
${bodyHtml}
${mermaidScript}
</body>
</html>`;
}