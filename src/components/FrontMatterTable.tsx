// src/components/FrontMatterTable.tsx
//
// Displays parsed YAML front matter as a small styled key/value table,
// or as a raw collapsed code block, depending on the
// `markdown.preview.frontmatter.style` setting.

import React from 'react';
import type { FrontMatterResult } from '../utils/frontmatter';

export interface FrontMatterTableProps {
  frontMatter: FrontMatterResult;
  style: 'table' | 'raw' | 'hidden';
}

const formatValue = (v: string | number | boolean | string[]): string => {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
};

export const FrontMatterTable: React.FC<FrontMatterTableProps> = ({ frontMatter, style }) => {
  if (!frontMatter.hasFrontMatter || style === 'hidden') return null;

  if (style === 'raw') {
    return (
      <details className="md-frontmatter md-frontmatter--raw">
        <summary>Front Matter</summary>
        <pre>{frontMatter.raw}</pre>
      </details>
    );
  }

  const keys = Object.keys(frontMatter.data);
  if (keys.length === 0) return null;

  return (
    <table className="md-frontmatter md-frontmatter--table">
      <tbody>
        {keys.map(key => (
          <tr key={key}>
            <td className="md-frontmatter__key">{key}</td>
            <td className="md-frontmatter__value">{formatValue(frontMatter.data[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};