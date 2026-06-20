// src/components/MermaidDiagram.tsx
//
// Renders a ```mermaid``` code fence as an SVG diagram using the `mermaid`
// package. Falls back to a visible error box + the raw source if the
// diagram syntax is invalid, so a typo never breaks the whole preview.

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

export interface MermaidDiagramProps {
  code: string;
  theme?: 'default' | 'dark';
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, theme = 'default' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const rawId = useId().replace(/:/g, '');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme,
          securityLevel: 'strict',
        });

        const { svg } = await mermaid.render(`mermaid-${rawId}`, code);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to render diagram.');
      }
    })();

    return () => { cancelled = true; };
  }, [code, theme, rawId]);

  if (error) {
    return (
      <div className="md-mermaid-error">
        <div className="md-mermaid-error__title">⚠ Mermaid diagram error</div>
        <div className="md-mermaid-error__message">{error}</div>
        <pre className="md-mermaid-error__source">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="md-mermaid-diagram"
      aria-label="Mermaid diagram"
    >
      <div className="md-mermaid-loading">Rendering diagram…</div>
    </div>
  );
};