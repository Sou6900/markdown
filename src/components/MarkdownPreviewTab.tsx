// src/components/MarkdownPreviewTab.tsx
//
// Full-featured Markdown preview tab.
// Reads every setting under markdown.preview.* / markdown.security.* via
// workspace.getConfiguration() and assembles the remark/rehype pipeline
// accordingly. See README.md for the complete feature list.

import * as React from 'react';
import { fs, workspace, window as msWindow } from '@mscode/api';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { visit } from 'unist-util-visit';

import remarkGfm        from 'remark-gfm';
import remarkMath        from 'remark-math';
import remarkEmoji        from 'remark-emoji';
import rehypeRaw            from 'rehype-raw';
import rehypeSanitize        from 'rehype-sanitize';
import rehypeSlug             from 'rehype-slug';
import rehypeAutolinkHeadings  from 'rehype-autolink-headings';
import rehypeHighlight          from 'rehype-highlight';
import rehypeKatex                from 'rehype-katex';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css'; 

import { remarkSmartQuotes }   from '../utils/remarkSmartQuotes';
import { parseFrontMatter }    from '../utils/frontmatter';
import { computeMarkdownStats } from '../utils/markdownStats';

import { CodeBlock }        from './CodeBlock';
import { MermaidDiagram }   from './MermaidDiagram';
import { TableOfContents }  from './TableOfContents';
import { FrontMatterTable } from './FrontMatterTable';

import '../styles/preview.css';

const rehypeInlineCodeProperty = () => (tree: any) => {
  visit(tree, 'element', (node: any, index: any, parent: any) => {
    if (node.tagName === 'code' && parent && parent.tagName !== 'pre') {
      node.properties = node.properties || {};
      node.properties['data-inline'] = 'true';
    }
  });
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MarkdownPreviewTabProps {
  filePath: string;
}

// ── Config helper ─────────────────────────────────────────────────────────────

function getConfig() {
  const preview  = workspace.getConfiguration('markdown.preview');
  const security = workspace.getConfiguration('markdown.security');

  return {
    theme:                 preview.get<string>('theme', 'auto'),
    fontFamily:            preview.get<string>('fontFamily', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"),
    fontSize:              preview.get<number>('fontSize', 16),
    lineHeight:            preview.get<number>('lineHeight', 1.6),
    maxWidth:              preview.get<number>('maxWidth', 850),
    codeFontFamily:        preview.get<string>('codeFontFamily', "'JetBrains Mono', 'Fira Code', monospace"),
    codeTheme:             preview.get<string>('codeTheme', 'github-dark'),

    autoRefresh:           preview.get<boolean>('autoRefresh', true),
    refreshDelay:          preview.get<number>('refreshDelay', 400),
    syncScroll:            preview.get<boolean>('syncScroll', true),

    breakOnSingleNewline:  preview.get<boolean>('breakOnSingleNewline', false),
    enableTaskLists:       preview.get<boolean>('enableTaskLists', true),
    taskListsReadonly:     preview.get<boolean>('taskListsReadonly', false),
    enableEmoji:           preview.get<boolean>('enableEmoji', true),
    enableMath:            preview.get<boolean>('enableMath', true),
    enableMermaid:         preview.get<boolean>('enableMermaid', true),
    headingAnchors:        preview.get<boolean>('headingAnchors', true),
    smartQuotes:           preview.get<boolean>('smartQuotes', true),

    showLineNumbers:       preview.get<boolean>('showLineNumbers', true),
    copyCodeButton:        preview.get<boolean>('copyCodeButton', true),
    wrapLongLines:         preview.get<boolean>('wrapLongLines', false),

    showTableOfContents:   preview.get<boolean>('showTableOfContents', false),
    tocPosition:           preview.get<'right' | 'left' | 'floating'>('tocPosition', 'right'),
    tocMinDepth:           preview.get<number>('tocMinDepth', 1),
    tocMaxDepth:           preview.get<number>('tocMaxDepth', 3),

    imageMaxWidth:         preview.get<string>('imageMaxWidth', '100%'),
    lazyLoadImages:        preview.get<boolean>('lazyLoadImages', true),
    openLinksExternally:   preview.get<boolean>('openLinksExternally', true),

    frontmatterStyle:      preview.get<'table' | 'raw' | 'hidden'>('frontmatter.style', 'table'),

    showWordCount:         preview.get<boolean>('showWordCount', true),
    showReadingTime:       preview.get<boolean>('showReadingTime', true),
    wordsPerMinute:        preview.get<number>('wordsPerMinute', 200),

    allowRawHtml:          security.get<boolean>('allowRawHtml', true),
    sanitizeHtml:          security.get<boolean>('sanitizeHtml', true),
    allowScripts:          security.get<boolean>('allowScripts', false),
  };
}

// ── Task-list line mapping ────────────────────────────────────────────────────

const TASK_LINE_RE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/;

function buildTaskLineMap(markdown: string): number[] {
  const lines = markdown.split('\n');
  const map: number[] = [];
  lines.forEach((line, i) => {
    if (TASK_LINE_RE.test(line)) map.push(i);
  });
  return map;
}

function toggleTaskLine(markdown: string, lineIndex: number): string {
  const lines = markdown.split('\n');
  const line = lines[lineIndex];
  if (!line) return markdown;
  const match = line.match(TASK_LINE_RE);
  if (!match) return markdown;
  const isChecked = match[2].toLowerCase() === 'x';
  lines[lineIndex] = line.replace(TASK_LINE_RE, `$1[${isChecked ? ' ' : 'x'}]`);
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────

export const MarkdownPreviewTab: React.FC<MarkdownPreviewTabProps> = ({ filePath }) => {
  const [content, setContent]   = React.useState<string | null>(null);
  const [config, setConfig]     = React.useState(getConfig);
  const [renderTick, setRenderTick] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const pollRef       = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContentRef = React.useRef<string | null>(null);

  // ── Load file content ─────────────────────────────────────────────────────
  const loadContent = React.useCallback(async () => {
    try {
      const text = await fs.readFile(filePath);
      if (text !== lastContentRef.current) {
        lastContentRef.current = text;
        setContent(text);
        setRenderTick(t => t + 1);
      }
    } catch {
      setContent('# Error loading file!\n\nThe file could not be read. It may have been moved or deleted.');
    }
  }, [filePath]);

  React.useEffect(() => {
    loadContent();
  }, [loadContent]);

  // ── Auto-refresh: poll for content changes ───────────────────────────────
  React.useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!config.autoRefresh) return;

    pollRef.current = setInterval(loadContent, Math.max(300, config.refreshDelay));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [config.autoRefresh, config.refreshDelay, loadContent]);

  // ── Re-read config when settings change ──
  React.useEffect(() => {
    const onFocus = () => setConfig(getConfig());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ── Best-effort scroll sync from editor ───────────────
  React.useEffect(() => {
    if (!config.syncScroll) return;
    const editor: any = (msWindow as any).activeTextEditor;
    if (!editor?.onDidChangeVisibleRanges) return;

    const disposable = editor.onDidChangeVisibleRanges((ranges: any[]) => {
      const root = containerRef.current;
      if (!root || !ranges?.[0]) return;
      const totalLines = editor.document?.lineCount ?? 1;
      const currentLine = ranges[0].start?.line ?? 0;
      const ratio = Math.min(1, currentLine / Math.max(1, totalLines));
      root.scrollTop = ratio * (root.scrollHeight - root.clientHeight);
    });

    return () => disposable?.dispose?.();
  }, [config.syncScroll]);

  const frontMatter = React.useMemo(() => parseFrontMatter(content ?? ''), [content]);
  const stats = React.useMemo(() => computeMarkdownStats(content ?? '', config.wordsPerMinute), [content, config.wordsPerMinute]);
  const taskLineMap = React.useMemo(() => buildTaskLineMap(content ?? ''), [content]);

  // ── Task checkbox toggle handler ──────────────────────────────────────────
  const taskCheckboxCounter = React.useRef(0);
  taskCheckboxCounter.current = 0; 

  const handleTaskToggle = React.useCallback(async (taskIndex: number) => {
    if (config.taskListsReadonly || content === null) return;
    const lineIndex = taskLineMap[taskIndex];
    if (lineIndex === undefined) return;

    const updated = toggleTaskLine(content, lineIndex);
    lastContentRef.current = updated;
    setContent(updated);

    try {
      await (fs as any).writeFile(filePath, updated);
    } catch {
      msWindow.showErrorMessage?.('Could not save task list change to file.');
    }
  }, [config.taskListsReadonly, content, taskLineMap, filePath]);

  // ── Build remark/rehype plugin arrays from settings ───────────────────────
  const remarkPlugins = React.useMemo(() => {
    const plugins: any[] = [remarkGfm];
    if (config.smartQuotes) plugins.push(remarkSmartQuotes);
    if (config.enableEmoji) plugins.push([remarkEmoji, { accessible: true }]);
    if (config.enableMath)  plugins.push(remarkMath);
    return plugins;
  }, [config.smartQuotes, config.enableEmoji, config.enableMath]);

  const rehypePlugins = React.useMemo(() => {
    const plugins: any[] = [];
    if (config.allowRawHtml && !config.allowScripts) {
      plugins.push(rehypeRaw);
      if (config.sanitizeHtml) plugins.push(rehypeSanitize);
    } else if (config.allowRawHtml && config.allowScripts) {
      plugins.push(rehypeRaw);
    }
    if (config.headingAnchors) {
      plugins.push(rehypeSlug);
      plugins.push([rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: ['heading-anchor'], ariaHidden: true, tabIndex: -1 },
        content: { type: 'text', value: ' #' },
      }]);
    }
    
    plugins.push(rehypeInlineCodeProperty);
    
    plugins.push([rehypeHighlight, { detect: true, ignoreMissing: true }]);
    if (config.enableMath) plugins.push(rehypeKatex);
    return plugins;
  }, [config.allowRawHtml, config.allowScripts, config.sanitizeHtml, config.headingAnchors, config.enableMath]);

  
  // ── Custom component renderers ────────────────────────────────────────────
  const components: Components = React.useMemo(() => ({
    code({ node, className, children, ...props }: any) {
      
      const isInline = node?.properties?.['data-inline'] === 'true' || props['data-inline'] === 'true';

      if (isInline) {
        const cleanProps = { ...props };
        delete cleanProps['data-inline']; // Strip the custom prop so it doesn't pollute the HTML DOM
        return <code className={`md-inline-code ${className || ''}`.trim()} {...cleanProps}>{children}</code>;
      }

      // ── Block code logic starts here ──
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      // Block-level mermaid diagram
      if (lang === 'mermaid' && config.enableMermaid) {
        const extractText = (n: any): string => {
            if (n.type === 'text') return n.value;
            if (n.children) return n.children.map(extractText).join('');
            return '';
        };
        const rawCode = node ? extractText(node).replace(/\n$/, '') : String(children).replace(/\n$/, '');
        return <MermaidDiagram code={rawCode} theme={config.theme === 'dark' ? 'dark' : 'default'} />;
      }

      const extractText = (n: any): string => {
          if (n.type === 'text') return n.value;
          if (n.children) return n.children.map(extractText).join('');
          return '';
      };
      const rawCode = node ? extractText(node).replace(/\n$/, '') : String(children).replace(/\n$/, '');

      return (
        <CodeBlock
          language={lang}
          rawCode={rawCode}
          showLineNumbers={config.showLineNumbers}
          copyButton={config.copyCodeButton}
          wrapLongLines={config.wrapLongLines}
          fontFamily={config.codeFontFamily}
        >
          <code className={className} {...props}>{children}</code>
        </CodeBlock>
      );
    },

    pre({ node, children, ...props }: any) {
      return <>{children}</>;
    },

    a({ node, href, children, ...props }: any) {
      const isExternal = /^https?:\/\//.test(href ?? '');
      return (
        <a
          href={href}
          target={isExternal && config.openLinksExternally ? '_blank' : undefined}
          rel={isExternal && config.openLinksExternally ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      );
    },

    img({ node, src, alt, ...props }: any) {
      return (
        <img
          src={src}
          alt={alt}
          loading={config.lazyLoadImages ? 'lazy' : undefined}
          style={{ maxWidth: config.imageMaxWidth }}
          {...props}
        />
      );
    },

    input({ node, type, checked, ...props }: any) {
      if (type === 'checkbox' && config.enableTaskLists) {
        const myIndex = taskCheckboxCounter.current++;
        return (
          <input
            type="checkbox"
            checked={!!checked}
            disabled={config.taskListsReadonly}
            onChange={() => handleTaskToggle(myIndex)}
            className="md-task-checkbox"
          />
        );
      }
      return <input type={type} checked={checked} readOnly {...props} />;
    },

    table({ node, children, ...props }: any) {
      return <div className="md-table-wrapper"><table {...props}>{children}</table></div>;
    },
  }), [config, handleTaskToggle]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (content === null) {
    return <div className="md-preview-loading">Loading preview…</div>;
  }

  const previewBody = (
    <div
      ref={containerRef}
      className="md-preview-print-target md-preview-scroll-root"
      style={{
        fontFamily: config.fontFamily,
        fontSize:   config.fontSize,
        lineHeight: config.lineHeight,
      }}
      data-theme={config.theme}
      data-code-theme={config.codeTheme}
    >
      <div className="md-preview-content" style={{ maxWidth: config.maxWidth || undefined }}>

        <FrontMatterTable frontMatter={frontMatter} style={config.frontmatterStyle} />

        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
          {frontMatter.content}
        </ReactMarkdown>

        {(config.showWordCount || config.showReadingTime) && (
          <div className="md-preview-stats">
            {config.showWordCount && <span>{stats.wordCount.toLocaleString()} words</span>}
            {config.showWordCount && config.showReadingTime && <span className="md-stats-sep">·</span>}
            {config.showReadingTime && <span>{stats.readingTimeMinutes} min read</span>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`md-preview-root md-toc-layout--${config.showTableOfContents ? config.tocPosition : 'none'}`}>
      {config.showTableOfContents && config.tocPosition === 'left' && (
        <TableOfContents
          containerRef={containerRef}
          minDepth={config.tocMinDepth}
          maxDepth={config.tocMaxDepth}
          position="left"
          refreshKey={renderTick}
        />
      )}

      {previewBody}

      {config.showTableOfContents && (config.tocPosition === 'right' || config.tocPosition === 'floating') && (
        <TableOfContents
          containerRef={containerRef}
          minDepth={config.tocMinDepth}
          maxDepth={config.tocMaxDepth}
          position={config.tocPosition}
          refreshKey={renderTick}
        />
      )}
    </div>
  );
};