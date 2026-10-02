import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  $isMapOpen,
  closeMap,
  hoverEntity,
  triggerTransition,
  type SearchItem,
} from '../../stores/universe';

interface OrientationMapProps {
  items: SearchItem[];
}

const DOMAINS = [
  { id: 'life', name: 'LIFE', symbol: '🌍', role: 'TIMELINE / ARCHIVE', orbit: '5.5 AU', path: '/life', color: '#a7f3d0' },
  { id: 'projects', name: 'PROJECTS', symbol: '🪐', role: 'SYSTEMS / CODE', orbit: '7.2 AU', path: '/projects', color: '#6ea8fe' },
  { id: 'research', name: 'RESEARCH', symbol: '✦', role: 'BENCHMARKS / PAPERS', orbit: '10.5 AU', path: '/research', color: '#93c5fd' },
  { id: 'thoughts', name: 'THOUGHTS', symbol: '✦', role: 'ESSAYS / IDEAS', orbit: '8.8 AU', path: '/thoughts', color: '#e9d5ff' },
  { id: 'notes', name: 'NOTES', symbol: '·', role: 'KNOWLEDGE FRAGMENTS', orbit: '4.0 AU', path: '/notes', color: '#fde68a' },
];

export const OrientationMap: React.FC<OrientationMapProps> = ({ items }) => {
  const isOpen = useStore($isMapOpen);

  // Keyboard shortcut listener for `M` / `m` and `Escape`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.key === 'm' || e.key === 'M') && !isInput) {
        e.preventDefault();
        $isMapOpen.set(!$isMapOpen.get());
      } else if (e.key === 'Escape' && isOpen) {
        closeMap();
        hoverEntity(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (entityId: string, path: string) => {
    closeMap();
    hoverEntity(null);
    triggerTransition(entityId, path);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="System orientation map"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-mono"
      onClick={() => {
        closeMap();
        hoverEntity(null);
      }}
    >
      <div
        className="w-full max-w-5xl bg-[#0a0a0a] border border-[#262626] rounded-lg shadow-2xl p-5 sm:p-6 flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-3 mb-6">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#6ea8fe] animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold text-[#e8e8e8] tracking-wider">
              SYSTEM ORIENTATION MAP // 2D TOPOLOGY
            </h2>
            <span className="text-[10px] text-[#525252] border border-[#262626] px-1.5 py-0.5 rounded hidden sm:inline">
              SPEC §8.2
            </span>
          </div>

          <button
            onClick={closeMap}
            className="text-[#777777] hover:text-[#e8e8e8] text-xs border border-[#262626] rounded px-2 py-1 hover:bg-[#1a1a1a] transition-colors"
          >
            ✕ ESC
          </button>
        </div>

        {/* Central Core: TONTIDE1 */}
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onMouseEnter={() => hoverEntity('tai')}
            onMouseLeave={() => hoverEntity(null)}
            onClick={() => handleNavigate('tai', '/about')}
            className="cursor-pointer group border border-[#3a3a3a] hover:border-[#ffffff] bg-[#141414] hover:bg-[#1c1c1c] px-5 py-2.5 rounded text-center transition-all shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm">☀</span>
              <span className="text-xs font-bold text-[#ffffff] tracking-wider">
                TONTIDE1
              </span>
            </div>
            <div className="text-[10px] text-[#777777] group-hover:text-[#a3a3a3] mt-0.5">
              CENTRAL GRAVITATIONAL ANCHOR · STABLE CORE (0 AU)
            </div>
          </button>

          {/* ASCII Tree Connector */}
          <div className="text-[#3a3a3a] select-none text-[11px] leading-none my-2 hidden md:block">
            │
            <br />
            ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
            <br />
            ▼                   ▼                   ▼                   ▼                   ▼
          </div>
        </div>

        {/* 5 Domain Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 flex-1">
          {DOMAINS.map((domain) => {
            const domainItems = items.filter((item) => item.domain === domain.id);

            return (
              <div
                key={`map-domain-${domain.id}`}
                className="flex flex-col border border-[#1f1f1f] bg-[#0d0d0d]/80 rounded p-3 text-xs"
              >
                {/* Domain Header Card */}
                <button
                  type="button"
                  onMouseEnter={() => hoverEntity(domain.id)}
                  onMouseLeave={() => hoverEntity(null)}
                  onClick={() => handleNavigate(domain.id, domain.path)}
                  className="block w-full text-left cursor-pointer pb-2.5 mb-2.5 border-b border-[#1f1f1f] hover:border-[#333333] transition-colors"
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: domain.color }}
                    />
                    <span
                      className="font-bold tracking-wider text-[11px]"
                      style={{ color: domain.color }}
                    >
                      {domain.name}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#525252]">
                    {domain.role}
                  </div>
                  <div className="text-[9px] text-[#3a3a3a] mt-0.5">
                    ORBIT: {domain.orbit}
                  </div>
                </button>

                {/* Domain Content Nodes */}
                <div className="space-y-2 flex-1">
                  {domainItems.length === 0 ? (
                    <div className="text-[10px] text-[#3a3a3a] italic py-2">
                      No published entries
                    </div>
                  ) : (
                    domainItems.map((item) => (
                      <button
                        type="button"
                        key={`map-item-${item.id}`}
                        onMouseEnter={() => hoverEntity(domain.id)}
                        onMouseLeave={() => hoverEntity(null)}
                        onClick={() => handleNavigate(domain.id, item.path)}
                        className="block w-full text-left cursor-pointer p-2 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#444444] transition-all group"
                      >
                        <div className="font-medium text-[#d4d4d4] group-hover:text-[#ffffff] text-[11px] leading-tight mb-1">
                          {item.title}
                        </div>
                        {item.date && (
                          <div className="text-[9px] text-[#525252]">
                            {item.date}
                          </div>
                        )}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 2).map((t) => (
                              <span
                                key={`map-tag-${t}`}
                                className="text-[8px] bg-[#1a1a1a] text-[#777777] px-1 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#525252] border-t border-[#1f1f1f] pt-3 mt-5 gap-2">
          <div>
            <span>CLICK NODE TO ENTER OR ZOOM</span> · <span>HOVER TO SPOTLIGHT IN UNIVERSE</span>
          </div>
          <div>
            <span>[M] TOGGLE MAP</span> · <span>[/] SEARCH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
