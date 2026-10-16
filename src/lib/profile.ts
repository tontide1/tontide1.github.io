/**
 * The fastfetch panel: one identity, one machine.
 *
 * Every value here is owner-supplied — do not invent rows. Adding a row is a
 * line in ROWS or in a SECTIONS entry; the home page renders whatever is here.
 */
export interface ProfileRow {
  label: string;
  value: string;
  /** Rendered as a link when present. */
  href?: string;
}

export interface ProfileSection {
  title: string;
  rows: ProfileRow[];
}

export const HANDLE = 'tontide1@github';

export const ROWS: ProfileRow[] = [
  { label: 'OS:', value: 'Omarchy, Hackintosh, Windows' },
  { label: 'Host:', value: 'Ho Chi Minh City, Vietnam' },
  { label: 'Kernel:', value: 'Software Developer & AI Engineer' },
  { label: 'IDE:', value: 'Zed' },
  { label: 'Coding Agents:', value: 'pi, opencode, omp, Claude Code' },
  { label: 'Languages.Programming:', value: 'Python, C, TypeScript' },
  { label: 'Languages.Real:', value: 'Vietnamese, English' },
  { label: 'Hobbies:', value: 'Cars, food, walks' },
];

export const SECTIONS: ProfileSection[] = [
  {
    title: 'Contact',
    rows: [
      { label: 'Email:', value: 'phantantaiforwork@gmail.com', href: 'mailto:phantantaiforwork@gmail.com' },
      { label: 'LinkedIn:', value: 'in/tontide1', href: 'https://www.linkedin.com/in/tontide1' },
      { label: 'GitHub:', value: 'github.com/tontide1', href: 'https://github.com/tontide1' },
    ],
  },
];
