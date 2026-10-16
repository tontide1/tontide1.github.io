/**
 * The five domains plus the identity page, in the order they appear in the
 * sidebar, the home directory listing, and the 404 page.
 *
 * Replaces ENTITY_MAP from the deleted gravity-universe store: same job
 * (navigation registry), minus every 3D field.
 */
export interface DomainInfo {
  /** Route segment under `~/`, e.g. `projects`. */
  id: string;
  label: string;
  path: string;
  blurb: string;
}

export const DOMAINS: DomainInfo[] = [
  { id: 'about', label: 'about', path: '/about', blurb: 'Identity & background' },
  { id: 'life', label: 'life', path: '/life', blurb: 'Timeline & journey' },
  { id: 'notes', label: 'notes', path: '/notes', blurb: 'Technical fragments' },
  { id: 'projects', label: 'projects', path: '/projects', blurb: 'Concrete systems' },
  { id: 'research', label: 'research', path: '/research', blurb: 'Studies & benchmarks' },
  { id: 'thoughts', label: 'thoughts', path: '/thoughts', blurb: 'Long-form essays' },
];
