import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  $isSearchOpen,
  closeSearch,
  hoverEntity,
  triggerTransition,
  type SearchItem,
} from '../../stores/universe';

interface SearchModalProps {
  items: SearchItem[];
}

const DOMAIN_COLORS: Record<string, string> = {
  tai: '#ffffff',
  projects: '#6ea8fe',
  research: '#93c5fd',
  life: '#a7f3d0',
  thoughts: '#e9d5ff',
  notes: '#fde68a',
};

export const SearchModal: React.FC<SearchModalProps> = ({ items }) => {
  const isOpen = useStore($isSearchOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut listener for `/` and `Escape`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea outside
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isInput && !isOpen) {
        e.preventDefault();
        $isSearchOpen.set(true);
      } else if (e.key === 'Escape' && isOpen) {
        closeSearch();
        hoverEntity(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show default top suggestions
      return items.slice(0, 8);
    }
    const terms = q.split(/\s+/);
    return items.filter((item) => {
      const targetText = `${item.title} ${item.summary} ${item.domain} ${item.tags.join(' ')} ${item.meta || ''}`.toLowerCase();
      return terms.every((term) => targetText.includes(term));
    });
  }, [items, query]);

  // Handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % filteredItems.length;
        if (filteredItems[next]) {
          hoverEntity(filteredItems[next].entityId);
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + filteredItems.length) % filteredItems.length;
        if (filteredItems[next]) {
          hoverEntity(filteredItems[next].entityId);
        }
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  const handleSelect = (item: SearchItem) => {
    closeSearch();
    hoverEntity(null);
    triggerTransition(item.entityId, item.path);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search the universe"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/80 backdrop-blur-md font-mono"
      onClick={() => {
        closeSearch();
        hoverEntity(null);
      }}
    >
      <div
        className="w-full max-w-xl bg-[#0a0a0a] border border-[#262626] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#262626] bg-[#0f0f0f]">
          <span className="text-[#6ea8fe] mr-3 font-bold">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search systems, research, notes, thoughts, tags..."
            className="w-full bg-transparent text-xs text-[#e8e8e8] placeholder-[#525252] focus:outline-none"
          />
          <kbd className="text-[10px] text-[#525252] border border-[#262626] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-[#1a1a1a]/50">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#525252]">
              No celestial artifacts matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const domainColor = DOMAIN_COLORS[item.domain] || '#e8e8e8';

              return (
                <button
                  type="button"
                  key={`search-item-${item.id}-${idx}`}
                  onMouseEnter={() => {
                    setSelectedIndex(idx);
                    hoverEntity(item.entityId);
                  }}
                  onMouseLeave={() => hoverEntity(null)}
                  onClick={() => handleSelect(item)}
                  className={`block w-full text-left p-3 rounded cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-[#171717] border border-[#333333]'
                      : 'hover:bg-[#121212] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: domainColor }}
                      />
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider"
                        style={{ color: domainColor }}
                      >
                        {item.domain}
                      </span>
                      {item.meta && (
                        <span className="text-[10px] text-[#525252]">
                          / {item.meta}
                        </span>
                      )}
                    </div>
                    {item.date && (
                      <span className="text-[10px] text-[#525252]">
                        {item.date}
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-[#e8e8e8] mb-1">
                    {item.title}
                  </div>

                  <p className="text-[11px] text-[#777777] line-clamp-1 mb-1.5">
                    {item.summary}
                  </p>

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={`tag-${tag}`}
                          className="text-[9px] bg-[#1a1a1a] text-[#777777] px-1 py-0.2 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#1f1f1f] bg-[#0d0d0d] text-[10px] text-[#525252]">
          <div className="flex items-center space-x-3">
            <span>↑↓ navigate</span>
            <span>·</span>
            <span>↵ select</span>
            <span>·</span>
            <span>esc close</span>
          </div>
          <div>
            <span>{filteredItems.length} matches</span>
          </div>
        </div>
      </div>
    </div>
  );
};
