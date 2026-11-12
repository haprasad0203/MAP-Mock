// Authoring script for public/data/campus-layout.json (the schematic layout).
// Positions are local metres (x east, y north) from origin 25.6176, 91.9522, placed BY EYE
// relative to the OSM roads and the satellite arrangement (never traced). Survey mode corrects them on campus.
// Run: node scripts/build-layout.mjs
import fs from 'node:fs';

const TEAL = '#3E8A6E', CREAM = '#F1EBDC', WHITE = '#F4F2EA', PEACH = '#EDCDA6', GREEN = '#3E8A4E', SLATE = '#4B525A', GREY = '#77808A';
const P = (cx, cy, w, d, angle, floors, roof, extra = {}) => ({ cx, cy, w, d, angle, floors, roof, ...extra });

const buildings = [
  // ---- Academic & admin (south) ----
  { id: 'admin', name: 'Admin Block', short: 'Admin', category: 'venue', wall: WHITE, roofColor: GREEN, sprite: 'admin-block', labelPriority: 1,
    parts: [P(195, -170, 86, 18, 30, 4, 'hip'), P(195, -170, 30, 30, 30, 4, 'hip', { glass: 'atrium' })] },
  { id: 'auditorium', name: 'IIM Shillong Auditorium', short: 'Auditorium', category: 'venue', wall: CREAM, roofColor: SLATE, sprite: 'auditorium', labelPriority: 1,
    parts: [P(130, -205, 36, 30, 30, 3, 'shed', { glass: 'atrium' })], confirm: 'Separate building (confirmed); exact footprint to survey' },
  { id: 'nab', name: 'New Academic Block (NAB)', short: 'NAB', category: 'venue', wall: WHITE, roofColor: GREEN, sprite: 'nab', labelPriority: 1,
    parts: [P(72, -92, 80, 20, 111, 4, 'flat', { glass: 'atrium', stoneTowers: true })] },
  { id: 'library', name: 'Knowledge Centre (Library)', short: 'Library', category: 'venue', wall: WHITE, roofColor: GREEN, labelPriority: 1,
    parts: [P(240, -128, 42, 22, 30, 3, 'hip', { glass: 'stair' })], confirm: 'Position assumed next to Admin Block' },
  { id: 'kalam-centre', name: 'Dr. Kalam Centre', short: 'Kalam Centre', category: 'venue', wall: WHITE, roofColor: GREEN, labelPriority: 1,
    parts: [P(-48, 78, 40, 18, -40, 3, 'hip', { glass: 'stair' })] },
  { id: 'kalam-building', name: 'Kalam Building', category: 'venue', wall: WHITE, roofColor: GREEN, labelPriority: 2,
    parts: [P(-10, 104, 30, 16, -40, 3, 'hip')], confirm: 'Position to confirm' },
  // Drone video (9QBtbam1G5Q @2s, 11s, 49s): large octagonal green-roof hall right beside the main road, two small octagonal ponds behind it,
  // paved plaza + parking; a flat-roofed block with a green roof panel directly across the road.
  // Small two-tier octagonal pavilion west of the road by the Admin Block (official drone photo; YT drone @19s).
  { id: 'cafe-cloud', name: 'Cafe Cloud Campus', short: 'Cafe Cloud', category: 'food', wall: WHITE, roofColor: GREEN, sprite: 'cafe-pavilion', labelPriority: 2,
    parts: [P(28, -178, 20, 20, 0, 1, 'octagon', { glass: 'atrium' })], confirm: 'Name of the small octagonal pavilion' },
  // LARGE single-tier octagonal hall beside a road at the sand-pit end of the court strip, two octagonal ponds and the covered walkway beside it (YT drone @11s, 49s, 54s).
  { id: 'octagon-hall', name: 'Octagonal Hall', category: 'venue', wall: WHITE, roofColor: GREEN, labelPriority: 2,
    parts: [P(-122, 126, 27, 27, 0, 1, 'octagon', { glass: 'atrium' })], confirm: 'What this hall is used for, and its exact spot' },
  { id: 'road-block', name: 'Service block (across from the Octagonal Hall)', short: 'Service block', category: 'service', wall: '#E4DAC4', roofColor: GREEN, labelPriority: 3,
    parts: [P(-62, 126, 18, 13, 20, 1, 'flat'), P(-58, 112, 9, 7, 20, 1, 'gable')], confirm: 'Use of this building to confirm' },
  { id: 'tin-cafe', name: 'Worth The Taste (Tin Café)', short: 'Tin Café', category: 'food', wall: '#C9B48A', roofColor: GREY, labelPriority: 3,
    parts: [P(58, -212, 12, 8, 30, 1, 'gable')] },
  // ---- Residential ----
  { id: 'hostel-1', name: 'Hostel 1', category: 'hostel', wall: CREAM, roofColor: GREEN, labelPriority: 1, confirm: 'Lowest hostel (by elevation); block letters to confirm',
    parts: [P(-280, 58, 30, 12, 25, 3, 'hip', { balconies: true }), P(-243, 44, 30, 12, 25, 3, 'hip', { balconies: true }), P(-258, 82, 28, 12, 25, 3, 'hip', { balconies: true })] },
  { id: 'hostel-2', name: 'Hostel 2 · D Block', short: 'D Block', category: 'hostel', wall: WHITE, roofColor: GREEN, labelPriority: 1, confirm: 'D Block assumed to be Hostel 2 (middle elevation)',
    parts: [P(-200, 262, 56, 15, 28, 4, 'hip', { balconies: true, glass: 'stair' }), P(-150, 290, 40, 15, 28, 4, 'hip', { balconies: true })] },
  { id: 'hostel-3', name: 'Hostel 3 · F Block (U Tirot Sing Student Residence)', short: 'F Block', category: 'hostel', wall: PEACH, roofColor: GREEN, labelPriority: 1,
    confirm: 'F Block / New Hostel assumed to be U Tirot Sing (highest hostel)',
    parts: [P(-300, 378, 42, 14, 20, 5, 'hip', { stoneBase: true, glass: 'stair', balconies: true }), P(-248, 400, 42, 14, -12, 5, 'hip', { stoneBase: true, glass: 'stair', balconies: true }),
      P(-212, 356, 38, 14, 62, 5, 'hip', { stoneBase: true, glass: 'stair', balconies: true }), P(-258, 360, 20, 16, 10, 2, 'hip', { stoneBase: true })] },
  { id: 'hostel-4', name: 'Hostel 4 (new, under construction)', short: 'Hostel 4', category: 'hostel', wall: PEACH, roofColor: GREEN, sprite: 'hostel', labelPriority: 2,
    parts: [P(-330, 255, 36, 14, 35, 4, 'hip', { stoneBase: true, glass: 'stair' })], confirm: 'Which building is Hostel 4 — to confirm' },
  { id: 'mess', name: "Students' Mess", short: 'Mess', category: 'food', wall: CREAM, roofColor: GREEN, labelPriority: 1,
    parts: [P(-262, 288, 34, 18, 28, 2, 'gable')], confirm: 'Google pin is beside D Block, to its west; exact spot to confirm' },
  { id: 'commercial', name: 'Commercial Complex', short: 'Shops', category: 'food', wall: '#E9DCC0', roofColor: GREY, labelPriority: 2,
    parts: [P(-292, 236, 38, 12, 40, 1, 'flat')], confirm: 'Mithaas pin is just west of the football ground near the mess; exact spot to confirm' },
  { id: 'type2', name: 'Type 2 Quarters (staff housing)', short: 'Type 2 Quarters', category: 'staff', wall: WHITE, roofColor: TEAL, labelPriority: 3,
    // Drone video (7JbrpxrsLSw @145s): ~9 small 3-storey white blocks with teal-green roofs, terraced along a hairpin road.
    parts: [[-470, 138], [-448, 165], [-426, 190], [-404, 215], [-382, 240], [-497, 168], [-475, 196], [-453, 222], [-431, 248]].map(([x, y]) => P(x, y, 20, 12, 50, 3, 'hip')) },
  { id: 'type3', name: 'Faculty Quarters Type 3', short: 'Type 3 Quarters', category: 'staff', wall: WHITE, roofColor: TEAL, labelPriority: 3,
    parts: [P(-430, 318, 22, 12, 40, 3, 'hip'), P(-410, 340, 22, 12, 40, 3, 'hip')], confirm: 'Google lists it; exact position to confirm' },
  // ---- Sports ----
  // Drone videos (@54s / @156s): teal-roof pavilion at the end of the court strip: tennis (blue) · 2 basketball · sand pit, wrapped by a covered walkway.
  { id: 'gym', name: 'Sports Pavilion & Gym', short: 'Gym', category: 'sports', wall: WHITE, roofColor: TEAL, labelPriority: 2,
    parts: [P(-262, 138, 18, 12, 0, 1, 'gable')], confirm: 'Whether the gym is inside this pavilion — to confirm' },
  // ---- Services ----
  { id: 'substation', name: 'IIM Substation', category: 'service', wall: '#D9D4C8', roofColor: GREY, labelPriority: 3,
    parts: [P(470, -180, 30, 18, 20, 1, 'flat')] },
  { id: 'guard-room', name: 'Main Gate Security', short: 'Security', category: 'help', wall: CREAM, roofColor: GREEN, labelPriority: 3,
    parts: [P(200, -300, 7, 5, 30, 1, 'hip')], confirm: 'Gate position to confirm' },
];

const areas = [
  // Drone videos: fenced EARTH ground with floodlights (not grass yet), north-east of the courts.
  { id: 'football', kind: 'ground', surface: 'earth', name: 'Football Ground', pts: rect(-150, 205, 84, 56, 30) },
  { id: 'tennis', kind: 'court', sport: 'tennis', name: 'Tennis court', pts: rect(-241, 137, 14, 30, 0) },
  { id: 'octagon-pond-1', kind: 'water', pts: circle(-142, 146, 5, 8) },
  { id: 'octagon-pond-2', kind: 'water', pts: circle(-126, 152, 4.5, 8) },
  { id: 'octagon-plaza', kind: 'plaza', pts: rect(-98, 120, 22, 34, 0) },
  { id: 'kalam-lawn', kind: 'lawn', pts: rect(-48, 78, 62, 40, -40) },
  { id: 'admin-forecourt', kind: 'garden', name: 'Admin forecourt', pts: circle(200, -222, 17, 16) },
  { id: 'admin-plaza', kind: 'plaza', pts: rect(195, -195, 90, 18, 30) },
  { id: 'admin-parking', kind: 'parking', name: 'Admin Block Parking', pts: rect(262, -200, 40, 26, 30) },
  { id: 'nab-lawn', kind: 'lawn', pts: rect(108, -100, 40, 70, 111) },
  // Drone video @19s/24s: big terraced garden with winding paths in front (south) of the Admin forecourt.
  { id: 'terrace-garden', kind: 'garden', name: 'Terraced garden', pts: rect(168, -252, 84, 36, 30) },
  { id: 'aud-plaza', kind: 'plaza', pts: rect(118, -228, 30, 14, 30) },
  { id: 'hostel1-lawn', kind: 'lawn', pts: rect(-262, 62, 70, 50, 25) },
  { id: 'fblock-court', kind: 'plaza', pts: rect(-258, 380, 46, 30, 10) },
  { id: 'courts-surround', kind: 'plaza', pts: rect(-208, 137, 96, 46, 0) },
  { id: 'kalam-plaza', kind: 'plaza', pts: rect(-30, 60, 26, 16, -40) },
];

const paths = [
  { id: 'fp-nab-lake', kind: 'footpath', pts: [[55, -80], [20, -70], [0, -60]] },
  { id: 'fp-admin-aud', kind: 'footpath', pts: [[175, -190], [150, -205], [130, -222]] },
  { id: 'fp-admin-lib', kind: 'footpath', pts: [[215, -160], [228, -140]] },
  { id: 'fp-courts', kind: 'footpath', pts: [[-170, 56], [-185, 100], [-198, 115]] },
  { id: 'fp-hostel1', kind: 'footpath', pts: [[-238, 93], [-258, 70], [-275, 50]] },
  { id: 'fp-football', kind: 'footpath', pts: [[-198, 160], [-175, 175]] },
  { id: 'fp-mess', kind: 'footpath', pts: [[-200, 228], [-175, 300], [-160, 325]] },
  { id: 'fp-fblock', kind: 'footpath', pts: [[-200, 318], [-230, 345], [-258, 365]] },
  { id: 'fp-kalam', kind: 'footpath', pts: [[-82, 35], [-60, 60], [-48, 70]] },
  { id: 'fp-cafe', kind: 'footpath', pts: [[49, -135], [35, -160], [30, -168]] },
  // Covered walkway (teal roof) seen in all drone videos: zig-zags from the hostels around the courts and down along the road.
  { id: 'covered-walk', kind: 'covered', name: 'Covered walkway', pts: [[-200, 226], [-232, 196], [-256, 166], [-262, 122], [-246, 104], [-214, 104], [-190, 94], [-176, 66], [-150, 50], [-110, 42], [-84, 40]] },
  // Lake trail: a loop just outside the OSM lake outline (approximate, survey to confirm).
  { id: 'lake-trail', kind: 'footpath', name: 'Lake walking trail', pts: [[-190, -12], [-168, 30], [-136, -2], [-64, -28], [-6, -52], [8, -116], [-52, -112], [-100, -72], [-154, -40], [-190, -12]] },
];

const landmarks = [
  { id: 'main-gate', name: 'Main Gate', kind: 'gate', at: [212, -310], confirm: 'Gate position to confirm on campus' },
  { id: 'kalam-statue', name: 'Dr. Kalam Statue', kind: 'statue', at: [-28, 60], confirm: 'Statue position to confirm' },
  { id: 'flag', name: 'Flag mast', kind: 'flag', at: [200, -222] },
  { id: 'water-tank', name: 'Water Supply Tank', kind: 'tank', at: [-351, 420] },
  { id: 'atm', name: 'ICICI Bank ATM', kind: 'atm', at: [178, -340], confirm: 'On the public road near the gate' },
];

// Main entrance of each building: middle of the face on the -d side (rotated), unless overridden.
const override = { admin: [205, -190], auditorium: [122, -220], nab: [60, -82] };
const entrances = buildings.map(b => {
  const p = b.parts[0], a = (p.angle * Math.PI) / 180;
  const at = override[b.id] ?? [round(p.cx + Math.sin(a) * (p.d / 2 + 2)), round(p.cy - Math.cos(a) * (p.d / 2 + 2))];
  return { id: `${b.id}-main`, buildingId: b.id, at, main: true };
});

const trees = [
  { c: [-120, -60], r: 40, density: 0.5 }, { c: [80, -10], r: 45, density: 0.55 }, { c: [10, 40], r: 30, density: 0.5 },
  { c: [-330, 80], r: 50, density: 0.6 }, { c: [-90, 260], r: 40, density: 0.45 }, { c: [-400, 300], r: 60, density: 0.6 },
  { c: [160, -60], r: 50, density: 0.5 }, { c: [300, -100], r: 60, density: 0.55 }, { c: [-20, -230], r: 60, density: 0.6 },
  { c: [-200, -40], r: 40, density: 0.4 }, { c: [-120, 400], r: 50, density: 0.5 },
];

const boundary = [[-560, 90], [-470, 330], [-330, 455], [-150, 445], [-40, 300], [20, 150], [120, -40], [300, -120], [520, -150], [520, -260], [330, -280], [250, -345], [120, -300], [-20, -170], [-210, -70], [-330, 10]];

fs.writeFileSync('public/data/campus-layout.json', JSON.stringify({ origin: { lat: 25.6176, lon: 91.9522 }, boundary, buildings, paths, areas, trees, entrances, landmarks }, null, 1));
console.log(`buildings ${buildings.length}, areas ${areas.length}, paths ${paths.length}, entrances ${entrances.length}`);

function round(n) { return Math.round(n * 10) / 10; }
function rect(cx, cy, w, d, angle) {
  const a = (angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => [round(cx + x * c - y * s), round(cy + x * s + y * c)]);
}
function circle(cx, cy, r, n) { return Array.from({ length: n }, (_, i) => [round(cx + r * Math.cos((i / n) * 2 * Math.PI)), round(cy + r * Math.sin((i / n) * 2 * Math.PI))]); }
