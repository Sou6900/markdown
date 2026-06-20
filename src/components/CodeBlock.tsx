// src/components/CodeBlock.tsx
//
// Renders a fenced code block with:
//   • Syntax highlighting (already applied by rehype-highlight upstream —
//     this component just adds chrome around the already-tokenized HTML)
//   • Optional line-number gutter (overlay column, doesn't touch token markup)
//   • Copy-to-clipboard button
//   • Optional line wrapping
//
// Line numbers are implemented as a SEPARATE overlay column rather than
// interleaving numbers into the highlighted markup. This avoids fragile
// parsing of token spans and keeps highlight.js's output untouched.

import React, { useRef, useState, useMemo } from 'react';
import { components } from '@mscode/ui'; 

const { Icon } = components;

export interface CodeBlockProps {
  /** Language identifier (e.g. 'javascript', 'python') */
  language?:        string;
  /** Raw, unhighlighted source text — used for line counting & copy */
  rawCode:           string;
  /** Already-highlighted children (React nodes from rehype-highlight) */
  children:          React.ReactNode;
  showLineNumbers?:  boolean;
  copyButton?:       boolean;
  wrapLongLines?:    boolean;
  fontFamily?:       string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  rawCode,
  children,
  showLineNumbers = true,
  copyButton      = true,
  wrapLongLines   = false,
  fontFamily,
}) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const lineCount = useMemo(() => {
    const trimmed = rawCode.replace(/\n$/, ''); // ignore trailing newline
    return trimmed.split('\n').length;
  }, [rawCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail silently, button just won't confirm
    }
  };

  return (
    <div className="md-codeblock" style={{ position: 'relative', margin: '12px 0' }}>
      {/* Language badge */}
      {language && (
        <div className="md-codeblock__lang">{language}</div>
      )}

      {/* Copy button */}
      {copyButton && (
        <button
          className="md-codeblock__copy"
          onClick={handleCopy}
          title="Copy code"
          aria-label="Copy code"
        >
          <Icon name={copied ? 'check' : ('copy' as any)} size={13} />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      )}

      <div style={{ display: 'flex' }}>
        {/* Line-number gutter — separate column, doesn't touch highlighted markup */}
        {showLineNumbers && (
          <div className="md-codeblock__gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        )}

        <pre
          ref={preRef}
          className={`md-codeblock__pre${wrapLongLines ? ' md-codeblock__pre--wrap' : ''}`}
          style={fontFamily ? { fontFamily } : undefined}
        >
          {children}
        </pre>
      </div>
    </div>
  );
};