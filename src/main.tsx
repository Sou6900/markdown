import * as React from 'react';
import { window, workspace, commands, menus, fs, ExtensionContext } from '@mscode/api';
import { MarkdownPreviewTab } from './components/MarkdownPreviewTab';
import { renderMarkdownToHtmlString } from './utils/renderMarkdownToHtmlString';
import manifest from '../manifest.json';


export async function activate(context: ExtensionContext) {
  console.log(`[${manifest.name}] Activating…`);

  const tabType = `${manifest.id}.preview`;

  const tabDisposer = window.tabs.registerCustomTab(tabType, MarkdownPreviewTab);

  // ── 4. Open Preview Command ──
  const openCmdDisposer = commands.registerCommand('markdown.preview', () => {
    const activeTab = window.tabs.activeTab;
    if (!activeTab || !activeTab.filePath) return;

    window.tabs.openTab({
      id: `preview-${activeTab.filePath}`,
      title: `Preview: ${activeTab.title}`,
      type: tabType,
      filePath: activeTab.filePath,
    });
  });

  // ── 5. Refresh Command ────────────────────────────────────────────────────
  const refreshCmdDisposer = commands.registerCommand(
    'markdown.preview.refresh',
    () => {
      window.showInformationMessage(
        'Preview refreshes automatically — manual refresh is rarely needed.'
      );
    }
  );

  // ── helper: active markdown source ───────────────────────────────────────
  const getActiveMarkdownSource = async (): Promise<{
    filePath: string;
    markdown: string;
  } | null> => {
    const activeTab = window.tabs.activeTab;

    if (!activeTab?.filePath) {
      window.showErrorMessage('No active markdown file.');
      return null;
    }

    try {
      const markdown = await fs.readFile(activeTab.filePath);
      return { filePath: activeTab.filePath, markdown };
    } catch {
      window.showErrorMessage('Could not read the active file.');
      return null;
    }
  };

  const buildExportOptions = () => {
    const preview = workspace.getConfiguration('markdown.preview');
    const security = workspace.getConfiguration('markdown.security');
    const exportCfg = workspace.getConfiguration('markdown.export');

    const theme = exportCfg.get<string>('theme', 'match-preview');

    const resolvedTheme =
      theme === 'match-preview'
        ? (preview.get<string>('theme', 'auto') === 'dark' ? 'dark' : 'github')
        : (theme as 'light' | 'dark' | 'github');

    return {
      theme: resolvedTheme,
      includeStyles: exportCfg.get<boolean>('includeStyles', true),
      enableMath: preview.get<boolean>('enableMath', true),
      enableMermaid: preview.get<boolean>('enableMermaid', true),
      enableEmoji: preview.get<boolean>('enableEmoji', true),
      smartQuotes: preview.get<boolean>('smartQuotes', true),
      breakOnSingleNewline: preview.get<boolean>('breakOnSingleNewline', false),
      allowRawHtml: security.get<boolean>('allowRawHtml', true),
      sanitizeHtml: security.get<boolean>('sanitizeHtml', true),
      headingAnchors: preview.get<boolean>('headingAnchors', true),
    };
  };

  // ── 6. Export HTML ────────────────────────────────────────────────────────
  const exportHtmlCmdDisposer = commands.registerCommand(
    'markdown.preview.exportHtml',
    async () => {
      const source = await getActiveMarkdownSource();
      if (!source) return;

      const html = await renderMarkdownToHtmlString(source.markdown, {
        ...buildExportOptions(),
        title:
          source.filePath.split('/').pop()?.replace(/\.(md|markdown)$/i, '') ??
          'Document',
      });

      const exportDir = workspace
        .getConfiguration('markdown.export')
        .get<string>('outputDirectory', '');

      const baseName = source.filePath.replace(/\.(md|markdown)$/i, '');
      const fileName = baseName.split('/').pop();

      const targetPath = exportDir
        ? `${exportDir.replace(/\/$/, '')}/${fileName}.html`
        : `${baseName}.html`;

      try {
        await (fs as any).writeFile(targetPath, html);
        window.showInformationMessage(`Exported: ${targetPath}`);
      } catch {
        window.showErrorMessage('Failed to write the exported HTML file.');
      }
    }
  );

  // ── 7. Copy HTML ──────────────────────────────────────────────────────────
  const copyHtmlCmdDisposer = commands.registerCommand(
    'markdown.preview.copyAsHtml',
    async () => {
      const source = await getActiveMarkdownSource();
      if (!source) return;

      const html = await renderMarkdownToHtmlString(source.markdown, {
        ...buildExportOptions(),
        includeStyles: false,
      });

      try {
        await navigator.clipboard.writeText(html);
        window.showInformationMessage('Rendered HTML copied to clipboard.');
      } catch {
        window.showErrorMessage('Clipboard write failed.');
      }
    }
  );

  // ── 8. Export PDF ─────────────────────────────────────────────────────────
  const exportPdfCmdDisposer = commands.registerCommand(
    'markdown.preview.exportPdf',
    () => {
      if (typeof window.print === 'function') {
        window.print();
      } else {
        window.showErrorMessage(
          'Printing is not available in this environment. Use HTML export instead.'
        );
      }
    }
  );

  // ── 9. Menu ───────────────────────────────────────────────────────────────
  const menuDisposer = menus.registerItem('editor/title', {
    id: 'markdown-preview-btn',
    label: 'Preview Markdown',
    icon: 'open-preview',
    order: -1000,
    when: "editorLangId == 'markdown' || editorLangId == 'md'",
    showOnlyWhenSubOptionAvailable: true,
    children: [
      {
        id: 'markdown.preview-action',
        label: 'Open Markdown Preview',
        icon: 'open-preview',
        onClick: () => commands.executeCommand('markdown.preview'),
      },
      { id: 'sep-export', type: 'separator', order: 50 },
      {
        id: 'markdown.export-html-action',
        label: 'Export as HTML…',
        icon: 'export',
        onClick: () =>
          commands.executeCommand('markdown.preview.exportHtml'),
      },
      {
        id: 'markdown.copy-html-action',
        label: 'Copy Rendered as HTML',
        icon: 'copy',
        onClick: () =>
          commands.executeCommand('markdown.preview.copyAsHtml'),
      },
      {
        id: 'markdown.export-pdf-action',
        label: 'Print / Export as PDF…',
        icon: 'file-pdf',
        onClick: () =>
          commands.executeCommand('markdown.preview.exportPdf'),
      },
      { id: 'sep-refresh', type: 'separator' },
      {
        id: 'markdown.refresh-action',
        label: 'Refresh Preview',
        icon: 'refresh',
        onClick: () =>
          commands.executeCommand('markdown.preview.refresh'),
      },
    ],
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  context.subscriptions.push({
    dispose: () => {
      tabDisposer.dispose();
      openCmdDisposer.dispose();
      refreshCmdDisposer.dispose();
      exportHtmlCmdDisposer.dispose();
      copyHtmlCmdDisposer.dispose();
      exportPdfCmdDisposer.dispose();
      menuDisposer.dispose();
    },
  });
}

export function deactivate() {}