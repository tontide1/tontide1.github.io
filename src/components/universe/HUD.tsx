import React from 'react';
import { useStore } from '@nanostores/react';
import {
  ENTITY_MAP,
  $hoveredEntityId,
  $selectedEntityId,
  $isInspectOpen,
  $isAsciiMode,
  selectEntity,
  triggerTransition,
  openSearch,
  toggleMap,
  toggleAsciiMode,
} from '../../stores/universe';

export const HUD: React.FC = () => {
  const hoveredId = useStore($hoveredEntityId);
  const selectedId = useStore($selectedEntityId);
  const isInspectOpen = useStore($isInspectOpen);
  const isAscii = useStore($isAsciiMode);

  const activeEntity = hoveredId
    ? ENTITY_MAP[hoveredId]
    : !isInspectOpen && selectedId
    ? ENTITY_MAP[selectedId]
    : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-6 text-xs text-[#777777] font-mono">
      {/* Top Bar */}
      <header className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => selectEntity('tai')}
            className="flex items-center space-x-2 text-[#e8e8e8] hover:text-[#6ea8fe] transition-colors focus:outline-none"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#e8e8e8] animate-pulse" />
            <span className="font-semibold tracking-wider">TÀI</span>
          </button>
          <span className="text-[#3a3a3a]">/</span>
          <span className="hidden sm:inline tracking-wider">GRAVITY SYSTEM</span>
          <span className="text-[#3a3a3a] hidden sm:inline">·</span>
          <span className="hidden sm:inline text-[10px] text-[#3a3a3a] border border-[#262626] px-1.5 py-0.5 rounded">
            v1.1 MVP
          </span>
        </div>

        <nav className="flex items-center space-x-2 sm:space-x-4 text-[11px]">
          <button
            onClick={toggleAsciiMode}
            className={`transition-colors border px-2 py-1 rounded backdrop-blur-sm flex items-center space-x-1.5 ${
              isAscii
                ? 'border-[#6ea8fe]/50 text-[#6ea8fe] bg-[#6ea8fe]/10'
                : 'border-[#262626] text-[#777777] hover:text-[#e8e8e8] bg-[#050505]/70'
            }`}
            title="Toggle GPU Fragment Shader ASCII Pipeline"
          >
            <span>ASCII</span>
            <span
              className={`text-[9px] px-1 rounded ${
                isAscii ? 'bg-[#6ea8fe]/25 text-[#6ea8fe]' : 'bg-[#1a1a1a] text-[#525252]'
              }`}
            >
              {isAscii ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            onClick={() => triggerTransition('tai', '/about')}
            className="hover:text-[#e8e8e8] transition-colors border border-[#262626] px-2 py-1 rounded bg-[#050505]/70 backdrop-blur-sm"
          >
            ABOUT
          </button>
          <button
            onClick={openSearch}
            className="hover:text-[#e8e8e8] transition-colors border border-[#262626] px-2 py-1 rounded bg-[#050505]/70 backdrop-blur-sm flex items-center space-x-1"
          >
            <span>SEARCH</span>
            <kbd className="text-[9px] bg-[#1a1a1a] text-[#777777] px-1 rounded">/</kbd>
          </button>
          <button
            onClick={toggleMap}
            className="hover:text-[#e8e8e8] transition-colors border border-[#262626] px-2 py-1 rounded bg-[#050505]/70 backdrop-blur-sm flex items-center space-x-1"
          >
            <span>MAP</span>
            <kbd className="text-[9px] bg-[#1a1a1a] text-[#777777] px-1 rounded">M</kbd>
          </button>
        </nav>
      </header>

      {/* Telemetry / Hover Inspector Panel (pointer-events-none to prevent flicker loops) */}
      {activeEntity && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/90 backdrop-blur-md border border-[#262626] rounded px-4 py-2.5 shadow-2xl text-center max-w-sm transition-all duration-200">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: activeEntity.color }}
            />
            <span className="text-[#e8e8e8] font-bold tracking-wider">
              {activeEntity.name}
            </span>
            <span className="text-[#3a3a3a]">|</span>
            <span className="text-[10px] text-[#6ea8fe]">
              {activeEntity.meta}
            </span>
          </div>
          <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
            {activeEntity.description}
          </p>
          <div className="mt-2 text-[10px] text-[#6ea8fe] tracking-wider font-medium">
            [CLICK TO INSPECT OR ENTER DOMAIN]
          </div>
        </div>
      )}

      {/* Bottom Bar: Telemetry & Domain Switcher */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        <div className="text-[9px] sm:text-[11px] text-[#525252] text-center sm:text-left">
          <span>DRAG TO ROTATE</span> ·{' '}
          <span className="hidden sm:inline">SCROLL TO ZOOM</span>
          <span className="sm:hidden">PINCH TO ZOOM</span> ·{' '}
          <span className="hidden sm:inline">CLICK TO ENTER</span>
          <span className="sm:hidden">TAP TO ENTER</span>
        </div>

        {/* Domain Navigation Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#262626] p-1 rounded">
          {Object.values(ENTITY_MAP).map((entity) => {
            const isSelected = selectedId === entity.id;
            return (
              <button
                key={`btn-${entity.id}`}
                onClick={() => selectEntity(entity.id)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#1f1f1f] text-[#ffffff] font-semibold border border-[#3a3a3a]'
                    : 'text-[#777777] hover:text-[#e8e8e8] hover:bg-[#141414]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: entity.color }}
                />
                <span>{entity.name}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
