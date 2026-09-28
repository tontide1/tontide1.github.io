import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  ENTITY_MAP,
  $selectedEntityId,
  $isInspectOpen,
  closeInspect,
} from '../../stores/universe';

export const IdentityDrawer: React.FC = () => {
  const selectedId = useStore($selectedEntityId);
  const isOpen = useStore($isInspectOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeInspect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!isOpen || !selectedId) return null;

  const entity = ENTITY_MAP[selectedId];
  if (!entity) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-20 w-full sm:w-96 bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-[#262626] p-6 flex flex-col justify-between font-mono shadow-2xl transition-transform duration-300">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entity.color }}
            />
            <span className="text-[#e8e8e8] font-bold tracking-wider text-sm">
              {entity.name}
            </span>
          </div>
          <button
            onClick={closeInspect}
            className="text-[#777777] hover:text-[#e8e8e8] p-1 text-sm border border-[#262626] rounded px-2 hover:bg-[#1f1f1f] transition-colors"
            title="Press Escape to close"
          >
            ✕ ESC
          </button>
        </div>

        {/* Content Details */}
        <div className="space-y-5 text-xs text-[#a3a3a3]">
          <div>
            <span className="text-[#525252] uppercase tracking-wider text-[10px] block mb-1">
              ROLE / ARCHETYPE
            </span>
            <p className="text-[#e8e8e8] font-medium">{entity.role}</p>
          </div>

          <div>
            <span className="text-[#525252] uppercase tracking-wider text-[10px] block mb-1">
              SYSTEM PROFILE
            </span>
            <p className="leading-relaxed">{entity.description}</p>
          </div>

          <div>
            <span className="text-[#525252] uppercase tracking-wider text-[10px] block mb-1">
              ORBITAL METADATA
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#111111] p-3 rounded border border-[#1f1f1f]">
              <div>
                <span className="text-[#525252] block text-[9px]">RADIUS</span>
                <span className="text-[#e8e8e8]">{entity.orbitRadius} AU</span>
              </div>
              <div>
                <span className="text-[#525252] block text-[9px]">VELOCITY</span>
                <span className="text-[#e8e8e8]">{entity.orbitSpeed} rad/s</span>
              </div>
              <div>
                <span className="text-[#525252] block text-[9px]">CLASSIFICATION</span>
                <span className="text-[#6ea8fe]">{entity.meta}</span>
              </div>
              <div>
                <span className="text-[#525252] block text-[9px]">STATE</span>
                <span className="text-[#a7f3d0]">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Specific Domain Teaser */}
          {entity.id === 'tai' && (
            <div className="pt-2">
              <span className="text-[#525252] uppercase tracking-wider text-[10px] block mb-2">
                CORE ATTRIBUTES
              </span>
              <ul className="space-y-1.5 text-[11px] text-[#e8e8e8]">
                <li>• Senior AI / Backend Engineer</li>
                <li>• Focus: RAG Pipelines & High-Performance Services</li>
                <li>• Location: Ho Chi Minh City, Vietnam</li>
              </ul>
            </div>
          )}

          {entity.id === 'projects' && (
            <div className="pt-2">
              <span className="text-[#525252] uppercase tracking-wider text-[10px] block mb-2">
                PRIMARY SYSTEMS
              </span>
              <ul className="space-y-1.5 text-[11px] text-[#e8e8e8]">
                <li>• DriveBook (High-scale operations)</li>
                <li>• Legal-RAG (Vietnamese Legal QA)</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="border-t border-[#262626] pt-4 mt-6">
        <a
          href={entity.path}
          className="w-full flex items-center justify-center space-x-2 bg-[#e8e8e8] hover:bg-[#ffffff] text-[#050505] font-semibold text-xs py-2.5 px-4 rounded transition-colors tracking-wider"
        >
          <span>ENTER {entity.name}</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
};
