import type { XY } from './grid';
export type RoofType = 'hip' | 'gable' | 'flat' | 'shed' | 'octagon';
export type Category = 'venue' | 'food' | 'hostel' | 'sports' | 'service' | 'help' | 'landmark' | 'staff';
/** One box of a building: centre, size along its axis (w) and across (d), angle in degrees from east (CCW). */
export interface Part {
  cx: number; cy: number; w: number; d: number; angle: number; floors: number; roof: RoofType;
  wall?: string; roofColor?: string; glass?: 'stair' | 'atrium'; stoneBase?: boolean; stoneTowers?: boolean; balconies?: boolean;
  /** v2: true footprint polygon in local metres (extruded in 3D; the 2D engine uses the rectangle). */
  poly?: XY[];
  /** v2: provenance only. */
  src?: string;
}
export interface Building {
  id: string; name: string; short?: string; category: Category; parts: Part[];
  wall: string; roofColor: string; sprite?: string; labelPriority: 1 | 2 | 3; confirm?: string;
  /** v2: ground height above the lake surface (m). */
  groundElev?: number;
  /** v2: drawn plainly, never labelled, not searchable, not hit-tested. */
  unnamed?: boolean;
}
export interface PathLine { id: string; kind: 'road' | 'service' | 'track' | 'footpath' | 'covered'; pts: XY[]; steps?: boolean; name?: string; src?: string; surface?: string }
export interface Area { id: string; kind: 'water' | 'court' | 'ground' | 'lawn' | 'plaza' | 'parking' | 'garden'; pts: XY[]; sport?: string; name?: string; surface?: 'earth' | 'grass' }
export interface TreeCluster { c: XY; r: number; density: number }
export interface Entrance { id: string; buildingId: string; at: XY; main?: boolean; surveyed?: boolean }
export interface Landmark { id: string; name: string; kind: 'gate' | 'statue' | 'tank' | 'flag' | 'atm' | 'pin'; at: XY; confirm?: string }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }
export interface CampusLayout {
  origin: { lat: number; lon: number }; boundary: XY[]; buildings: Building[]; paths: PathLine[]; areas: Area[];
  trees: TreeCluster[]; entrances: Entrance[]; landmarks: Landmark[];
  version?: number; note?: string; attribution?: string;
}
