// The Phase 2 SVG badges (public/campus-art/tycoon/icons), picked by place id first, then by category.
import type { Category } from '../geo/types';

const BY_ID: Record<string, string> = {
  lake: 'lake', 'main-gate': 'gate', 'kalam-statue': 'statue', atm: 'atm', medical: 'medical', 'help-desk': 'help-desk',
};
const BY_CATEGORY: Partial<Record<Category, string>> = { venue: 'venue', food: 'food', hostel: 'hostel', sports: 'sports', help: 'help-desk' };

export const iconUrl = (name: string) => `/campus-art/tycoon/icons/${name}.svg`;
/** Icon for a place or building, or null when the set has none for it (a category dot is shown instead). */
export function iconFor(id: string, category: Category): string | null {
  const name = BY_ID[id] ?? BY_CATEGORY[category];
  return name ? iconUrl(name) : null;
}
