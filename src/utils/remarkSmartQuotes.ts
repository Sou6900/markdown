// src/utils/remarkSmartQuotes.ts
//
// A tiny, dependency-light remark plugin that converts straight quotes,
// double-hyphens, and triple-dots into their typographic equivalents.
// Operates only on `text` nodes, so it never touches code spans/blocks,
// links, or HTML — safe by construction.

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text } from 'mdast';

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Double quotes: opening vs closing based on preceding context
  [/(^|[\s(\[{])"/g,  '$1\u201C'],   // “
  [/"/g,               '\u201D'],     // ”

  // Single quotes / apostrophes
  [/(^|[\s(\[{])'/g,  '$1\u2018'],   // ‘
  [/'/g,               '\u2019'],     // ’

  // Em dash / en dash
  [/---/g, '\u2014'],  // —
  [/--/g,  '\u2013'],  // –

  // Ellipsis
  [/\.\.\./g, '\u2026'], // …
];

export const remarkSmartQuotes: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text) => {
      let value = node.value;
      for (const [pattern, replacement] of REPLACEMENTS) {
        value = value.replace(pattern, replacement);
      }
      node.value = value;
    });
  };
};