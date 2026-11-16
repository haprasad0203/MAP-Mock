// One-off: writes reference/real/<id>.sources.json for the second batch of landmarks (Phase 3M v2 step 3).
// Run: node reference/real/_landmarks2.mjs, then node scripts/real-sheet.mjs <id> for each.
import fs from 'node:fs';
const OFF = 'IIM_Shillong_Campus_References/02_hostels_residential/', VF = 'reference/photos/video_frames/', Q = '.cache/vf/9QBtbam1G5Q/9QBtbam1G5Q-';
const keep = (src, dst) => { if (!fs.existsSync(dst)) fs.copyFileSync(src, dst); return dst; }; // stills used by a sheet are kept in the repo
fs.mkdirSync(VF + 'hostels', { recursive: true }); fs.mkdirSync(VF + 'sports', { recursive: true });
const q = (t, dir, what) => keep(`${Q}${t}.jpg`, `${VF}${dir}/9QBtbam1G5Q-${t}_${what}.jpg`);
const S = {
  'cafe-cloud': {
    title: 'Cafe Cloud Campus (real)',
    views: [
      { file: 'reference/generated/crops/cafe_dji.png', label: 'From the SE (sun): ring, raised clerestory, porch', source: 'crop of DJI_0338 (iimshillong.ac.in)' },
      { file: 'reference/generated/crops/cafe_i363.png', label: 'From the S', source: 'crop of Image_363 (iimshillong.ac.in)' },
      { file: 'reference/generated/crops/cafe_19s.png', label: 'From the SW: window band all round', source: 'crop of YouTube 9QBtbam1G5Q @0:19' },
      { file: 'reference/photos/web/aerial/aerial-sunrise-admin-cafe_timess3.png', label: 'At sunrise with Admin behind', source: 'timess3spore (web aerial)' },
      { file: 'reference/photos/from_above/google_sat_hires_HA_2026-11-13_0423.png', crop: [840, 470, 160, 130], label: 'From above (hi-res)', source: 'H A, Google satellite (study only)' },
    ],
    colours: [{ name: 'roof (lit)', file: 'reference/generated/crops/cafe_dji.png', rect: [470, 140, 60, 20] }, { name: 'fascia white', file: 'reference/generated/crops/cafe_dji.png', rect: [580, 215, 40, 10] }],
    fit: { shots: ['hr0423'], padM: 20 },
  },
  'octagon-hall': {
    title: 'Octagonal Hall (real)',
    views: [
      { file: VF + 'octagon-hall/9QBtbam1G5Q-00.08.5_octagon-hall-service-block-courts.jpg', label: 'Aerial: hall, paver plaza, road, service block, courts', source: 'YouTube 9QBtbam1G5Q @0:08.5' },
      { file: VF + 'octagon-hall/9QBtbam1G5Q-00.49.5_octagon-hall-ponds-topdown.jpg', label: 'From above: octagon roof, two octagonal ponds', source: 'YouTube 9QBtbam1G5Q @0:49.5' },
      { file: VF + 'octagon-hall/9QBtbam1G5Q-00.00.5_octagon-hall-roof-and-plaza-topdown.jpg', label: 'Roof close: ribbed panels, ridge caps', source: 'YouTube 9QBtbam1G5Q @0:00.5' },
      { file: VF + 'octagon-hall/9QBtbam1G5Q-00.07.5_octagon-hall-plaza-road-courts.jpg', label: 'Low: door, stone plinth, steps, planters', source: 'YouTube 9QBtbam1G5Q @0:07.5' },
      { file: 'reference/photos/sports/yt-drone-11s_octagon-hall-courts-walkway.jpg', label: 'Aerial with the courts and walkway', source: 'YouTube 9QBtbam1G5Q @0:11' },
    ],
    colours: [{ name: 'roof', file: VF + 'octagon-hall/9QBtbam1G5Q-00.08.5_octagon-hall-service-block-courts.jpg', rect: [280, 370, 80, 20] }, { name: 'wall', file: VF + 'octagon-hall/9QBtbam1G5Q-00.08.5_octagon-hall-service-block-courts.jpg', rect: [200, 535, 40, 15] }],
    fit: { shots: ['01'], padM: 40 },
  },
  'hostel-1': {
    title: 'Hostel 1, D Block (real)',
    views: [
      { file: OFF + 'DSC_9111.jpg', label: 'White 4-storey block: balconies, black rails, grey louvres', source: 'iimshillong.ac.in/campus-tour (DSC_9111)' },
      { file: OFF + 'DSC_9119.jpg', label: 'Balconies and the covered walkway', source: 'iimshillong.ac.in/campus-tour (DSC_9119)' },
      { file: OFF + 'DSC_9140.jpg', label: 'Through a window: balconies, flat roof slab, teal court', source: 'iimshillong.ac.in/campus-tour (DSC_9140)' },
      { file: q('00.38.5', 'hostels', 'dblock-and-football-aerial'), label: 'Aerial: D Block blocks beside the football ground', source: 'YouTube 9QBtbam1G5Q @0:38.5' },
      { file: 'reference/photos/from_above/hostels_mess_dblock_google_hires_by_HA.png', label: 'From above (H A hi-res): D Block, Mess', source: 'H A, Google satellite (study only)' },
      { file: 'reference/photos/mess_from_above.png', label: 'From above: D Block flat roofs beside the Mess', source: 'Google satellite (study only)' },
    ],
    colours: [{ name: 'wall white', file: OFF + 'DSC_9111.jpg', rect: [460, 180, 40, 40] }],
    fit: { shots: ['hr0405'], padM: 20 },
  },
  'hostel-2': {
    title: 'Hostel 2, F Block / new hostels (real)',
    views: [
      { file: OFF + 'New-Hostel.jpg', label: 'Peach walls, stone base, glass stair tower with cap, balconies', source: 'iimshillong.ac.in/campus-tour (New-Hostel)' },
      { file: OFF + 'DSC_9144.jpg', label: 'Entrance: stone piers, glass stair, gable porch', source: 'iimshillong.ac.in/campus-tour (DSC_9144)' },
      { file: OFF + 'hostel22.jpg', label: 'Courtyard: brick-red stone piers, glass, green porch roofs', source: 'iimshillong.ac.in/campus-tour (hostel22)' },
      { file: 'reference/photos/from_above/google_sat_hires_HA_2026-11-13_0405.png', crop: [800, 120, 300, 260], label: 'From above (hi-res): F Block', source: 'H A, Google satellite (study only)' },
      { file: 'reference/photos/web/scholars-path/roadside-covered-walk-from-north_reddit.jpg', label: 'Campus from the hostels (new hostels in front)', source: 'i.redd.it (web)' },
    ],
    colours: [{ name: 'wall peach', file: OFF + 'New-Hostel.jpg', rect: [330, 270, 40, 30] }, { name: 'stone', file: OFF + 'DSC_9144.jpg', rect: [112, 120, 20, 60] }, { name: 'roof', file: OFF + 'New-Hostel.jpg', rect: [280, 218, 40, 6] }],
    fit: { shots: ['hr0405'], padM: 20 },
  },
  mess: {
    title: "Students' Mess (real)",
    views: [
      { file: 'reference/photos/mess_from_above.png', label: 'From above: four octagons, slate roofs, the big one two-tier', source: 'Google satellite (study only)' },
      { file: 'reference/photos/from_above/hostels_mess_dblock_google_hires_by_HA.png', label: 'From above (H A hi-res)', source: 'H A, Google satellite (study only)' },
      { file: 'reference/photos/mess_cluster_question.png', label: 'Cluster question (Phase 1)', source: 'Google satellite (study only)' },
    ],
    colours: [{ name: 'roof slate', file: 'reference/photos/mess_from_above.png', rect: [340, 440, 40, 30] }],
    fit: { shots: ['hr0405'], padM: 20 },
  },
  gym: {
    title: 'Sports Pavilion & Gym (real)',
    views: [
      { file: OFF + 'DSC_9159.jpg', label: 'Teal gable roof, front gable porch, courts', source: 'iimshillong.ac.in/campus-tour (DSC_9159)' },
      { file: q('00.27.5', 'sports', 'pavilion-courts-walkway-aerial'), label: 'Aerial: pavilion, tennis and basketball courts', source: 'YouTube 9QBtbam1G5Q @0:27.5' },
      { file: 'reference/photos/sports/yt-drone-54s_court-strip-walkway.jpg', label: 'Court strip and zig-zag walkway', source: 'YouTube 9QBtbam1G5Q @0:54' },
    ],
    colours: [{ name: 'roof teal', file: OFF + 'DSC_9159.jpg', rect: [180, 55, 60, 8] }, { name: 'wall', file: OFF + 'DSC_9159.jpg', rect: [170, 72, 40, 10] }],
    fit: { shots: ['hr0405'], padM: 25 },
  },
  'guard-room': {
    title: 'Main gate and guard room (real)',
    views: [
      { file: 'reference/photos/web/main-gate/main-gate-front-day_jdmagicbox.jpg', label: 'Front: portal, name fascia, guard room, sliding gate, name wall', source: 'content.jdmagicbox.com (web)' },
      { file: 'reference/photos/web/main-gate/main-gate-front-night_collegeadmission.jpg', label: 'Front at night', source: 'collegeadmission.in (web)' },
      { file: VF + 'gate/7JbrpxrsLSw-00.03.8_main-gate-front.jpg', label: 'Front, low', source: 'YouTube 7JbrpxrsLSw @0:03.8' },
      { file: VF + 'gate/9QBtbam1G5Q-00.45.0_main-gate-aerial.jpg', label: 'Aerial: portal over the road, long building beside it', source: 'YouTube 9QBtbam1G5Q @0:45' },
      { file: VF + 'gate/4_4vErlU-P4-00.39.0_gate-from-inside-ground.jpg', label: 'From inside', source: 'YouTube 4_4vErlU-P4 @0:39' },
    ],
    colours: [{ name: 'roof', file: 'reference/photos/web/main-gate/main-gate-front-day_jdmagicbox.jpg', rect: [700, 430, 300, 20] }],
    fit: { shots: ['hr0423'], padM: 25 },
  },
  'kalam-centre': {
    title: 'Dr. Kalam Centre (real)',
    views: [
      { file: VF + 'kalam-centre/iimshomepage-00.43.5_kalam-centre-entrance.jpg', label: 'Entrance: cream panel cladding, tall glass, glass canopy', source: 'iimshillong.ac.in homepage video @0:43.5' },
      { file: 'reference/photos/from_above/google_sat_hires_HA_2026-11-13_0423.png', crop: [640, 0, 220, 120], label: 'From above (hi-res)', source: 'H A, Google satellite (study only)' },
    ],
    colours: [{ name: 'cladding cream', file: VF + 'kalam-centre/iimshomepage-00.43.5_kalam-centre-entrance.jpg', rect: [60, 560, 120, 200] }],
    fit: { shots: ['hr0423'], padM: 20 },
  },
};
for (const [id, s] of Object.entries(S)) fs.writeFileSync(`reference/real/${id}.sources.json`, JSON.stringify({ id, ...s }, null, 1) + '\n');
console.log(Object.keys(S).join(' '));
