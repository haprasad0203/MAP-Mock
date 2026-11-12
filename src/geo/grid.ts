// Local metric grid (x = east, y = north, metres) around one lat/lon origin.
// Equirectangular approximation: < 1 m error across the 2 km campus window.
export const ORIGIN = { lat: 25.6176, lon: 91.9522 };
const KX = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
const KY = 110574;
export type XY = [number, number];
export function toLocal(lat: number, lon: number): XY {
  return [(lon - ORIGIN.lon) * KX, (lat - ORIGIN.lat) * KY];
}
export function toLatLon([x, y]: XY): { lat: number; lon: number } {
  return { lat: ORIGIN.lat + y / KY, lon: ORIGIN.lon + x / KX };
}
