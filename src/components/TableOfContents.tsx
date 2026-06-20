// src/components/TableOfContents.tsx
import React, { useEffect, useState, useRef } from 'react';

export interface TocEntry {
  id:    string;
  text:  string;
  depth: number; // 1-6
}

export interface TableOfContentsProps {
  containerRef: React.RefObject<HTMLElement>;
  minDepth?: number;
  maxDepth?: number;
  position?: 'right' | 'left' | 'floating';
  collapsible?: boolean;
  refreshKey?: string | number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  containerRef,
  minDepth = 1,
  maxDepth = 3,
  position = 'right',
  collapsible = true,
  refreshKey,
}) => {
  const [entries, setEntries]   = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [collapsed, setCollapsed] = useState(false); 
  const [isScrolling, setIsScrolling] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const headings = Array.from(
      root.querySelectorAll('h1,h2,h3,h4,h5,h6')
    ) as HTMLElement[];

    const found: TocEntry[] = headings
      .map(el => ({
        id:    el.id,
        text:  el.textContent?.replace(/#$/, '').trim() ?? '',
        depth: Number(el.tagName[1]),
      }))
      .filter(e => e.id && e.depth >= minDepth && e.depth <= maxDepth);

    setEntries(found);

    observerRef.current?.disconnect();
    if (found.length === 0) return;

    const observer = new IntersectionObserver(
      (intersections) => {
        const visible = intersections
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { root, threshold: 0, rootMargin: '0px 0px -70% 0px' }
    );

    headings.forEach(h => {
      if (h.id && found.some(f => f.id === h.id)) observer.observe(h);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [refreshKey, minDepth, maxDepth]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !collapsed) return; // Only listen to scroll if collapsed

    const handleScroll = () => {
      setIsScrolling(true); // Hide button immediately
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      
      // Bring button back 600ms after scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false); 
      }, 600);
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [collapsed, containerRef]);

  const handleClick = (id: string) => {
    const target = containerRef.current?.querySelector(`#${CSS.escape(id)}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (entries.length === 0) return null;

  // Collapsed State
  if (collapsed) {
    return (
      <button
        className={`md-toc-floating-btn md-toc-floating-btn--${position} ${isScrolling ? 'md-toc-floating-btn--hidden' : ''}`}
        onClick={() => setCollapsed(false)}
        title="Open Table of Contents"
        aria-label="Open Table of Contents"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
    );
  }

  // Expanded State
  return (
    <nav className={`md-toc md-toc--${position}`}>
      <div className="md-toc__header">
        <span>Contents</span>
        {collapsible && (
          <button
            className="md-toc__collapse-btn"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse table of contents"
          >
            ›
          </button>
        )}
      </div>

      <ul className="md-toc__list">
        {entries.map(entry => (
          <li
            key={entry.id}
            className={`md-toc__item md-toc__item--depth-${entry.depth}${activeId === entry.id ? ' active' : ''}`}
          >
            <a
              href={`#${entry.id}`}
              onClick={(e) => { e.preventDefault(); handleClick(entry.id); }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};