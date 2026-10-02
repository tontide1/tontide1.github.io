import { atom } from 'nanostores';

export interface EntityInfo {
  id: string;
  name: string;
  role: string;
  description: string;
  meta: string;
  path: string;
  type: 'core' | 'domain';
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  color: string;
}

export const ENTITY_MAP: Record<string, EntityInfo> = {
  tai: {
    id: 'tai',
    name: 'TÀI',
    role: 'Central Gravitational Anchor',
    description: 'Software developer, AI researcher, and builder. Center of mass of this digital system.',
    meta: 'STABLE CORE',
    path: '/about',
    type: 'core',
    orbitRadius: 0,
    orbitSpeed: 0,
    orbitAngle: 0,
    color: '#ffffff',
  },
  projects: {
    id: 'projects',
    name: 'PROJECTS',
    role: 'Structured Celestial Body',
    description: 'Concrete software systems, architecture, experiments, and technical artifacts.',
    meta: 'SYSTEMS / CODE',
    path: '/projects',
    type: 'domain',
    orbitRadius: 7.2,
    orbitSpeed: 0.12,
    orbitAngle: 0.4,
    color: '#6ea8fe',
  },
  research: {
    id: 'research',
    name: 'RESEARCH',
    role: 'Binary Clustered System',
    description: 'Hypothesis-driven investigations, legal QA retrieval benchmarks, and datasets.',
    meta: 'BENCHMARKS / PAPERS',
    path: '/research',
    type: 'domain',
    orbitRadius: 10.5,
    orbitSpeed: 0.08,
    orbitAngle: 2.1,
    color: '#93c5fd',
  },
  life: {
    id: 'life',
    name: 'LIFE',
    role: 'Organic Celestial Body',
    description: 'Public personal experiences, milestones, workspace, and technical journey.',
    meta: 'TIMELINE / ARCHIVE',
    path: '/life',
    type: 'domain',
    orbitRadius: 5.5,
    orbitSpeed: 0.16,
    orbitAngle: 3.8,
    color: '#a7f3d0',
  },
  thoughts: {
    id: 'thoughts',
    name: 'THOUGHTS',
    role: 'Connected Constellation',
    description: 'Reflections, software engineering perspectives, and long-form personal essays.',
    meta: 'ESSAYS / IDEAS',
    path: '/thoughts',
    type: 'domain',
    orbitRadius: 8.8,
    orbitSpeed: 0.10,
    orbitAngle: 5.0,
    color: '#e9d5ff',
  },
  notes: {
    id: 'notes',
    name: 'NOTES',
    role: 'Compact Asteroid Field',
    description: 'Concise technical fragments, tooling discoveries, and debugging references.',
    meta: 'KNOWLEDGE FRAGMENTS',
    path: '/notes',
    type: 'domain',
    orbitRadius: 4.0,
    orbitSpeed: 0.22,
    orbitAngle: 1.2,
    color: '#fde68a',
  },
};

export interface TransitionState {
  targetId: string;
  targetPath: string;
  startTime: number;
  duration: number;
}

export interface SearchItem {
  id: string;
  title: string;
  summary: string;
  domain: string;
  tags: string[];
  path: string;
  date?: string;
  meta?: string;
  entityId: string;
}

export const $selectedEntityId = atom<string | null>(null);
export const $hoveredEntityId = atom<string | null>(null);
/** Set while a body is being pulled, so camera orbit can stand down. */
export const $draggingEntityId = atom<string | null>(null);
export const $isSearchOpen = atom<boolean>(false);
export const $isMapOpen = atom<boolean>(false);
export const $isAsciiMode = atom<boolean>(false);
export const $transitionState = atom<TransitionState | null>(null);

export function toggleAsciiMode() {
  $isAsciiMode.set(!$isAsciiMode.get());
}

export function selectEntity(id: string | null) {
  $selectedEntityId.set(id);
  if (id) {
    $isSearchOpen.set(false);
    $isMapOpen.set(false);
  }
}

export function openSearch() {
  $isSearchOpen.set(true);
  $isMapOpen.set(false);
}

export function closeSearch() {
  $isSearchOpen.set(false);
}

export function openMap() {
  $isMapOpen.set(true);
  $isSearchOpen.set(false);
}

export function closeMap() {
  $isMapOpen.set(false);
}

export function toggleMap() {
  const current = $isMapOpen.get();
  $isMapOpen.set(!current);
  if (!current) {
    $isSearchOpen.set(false);
  }
}

export function hoverEntity(id: string | null) {
  $hoveredEntityId.set(id);
}

export const ENTITY_CURRENT_POSITIONS: Record<string, [number, number, number]> = {};

export function updateEntityPosition(id: string, x: number, y: number, z: number) {
  ENTITY_CURRENT_POSITIONS[id] = [x, y, z];
}

export function triggerTransition(targetId: string, targetPath: string) {
  $transitionState.set({
    targetId,
    targetPath,
    startTime: Date.now(),
    duration: 650,
  });
}
