// Per-building look that the layout schema cannot express. Everything here comes from
// reference/generated/LOOKS_LIKE.md and is listed in reference/layout/LAYOUT_CHECK.md ("3D render details").
// Shapes, positions, floors, roof type and colours always come from campus-layout.json.
export interface BuildingStyle {
  /** Octagon roofs with a raised glazed lantern tier: 'all' parts or the listed part indexes. */
  lantern?: 'all' | number[];
  /** Low stone band round the base (metres high) where the data has no `stoneBase`. */
  stoneBand?: number;
  /** `stoneTowers` parts stay white and carry a rooftop pavilion with a green cap (NAB). */
  towerPavilions?: boolean;
  /** Stone-clad wall panels on both sides of the glass atrium (NAB). */
  stonePanels?: boolean;
  /** Flat roof ends in a thin projecting slab instead of a parapet (Hostel 1 · D Block). */
  eaveSlab?: boolean;
  /** Part index whose hip roof is drawn as a low hip with a raised centre pavilion under its own hip (Admin Block main wing). */
  pavilionRoof?: number;
  /** Balcony railing colour. */
  rail?: string;
}

export const STYLES: Record<string, BuildingStyle> = {
  admin: { pavilionRoof: 2 },
  'cafe-cloud': { lantern: 'all' },
  'octagon-hall': { lantern: 'all', stoneBand: 1.5 },
  mess: { lantern: [0] },
  nab: { towerPavilions: true, stonePanels: true },
  'hostel-1': { eaveSlab: true, rail: '#2A2F35' },
};
export const styleOf = (id: string): BuildingStyle => STYLES[id] ?? {};
