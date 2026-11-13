// Rounded game-style map and category icons as plain SVG (code-drawn, crisp at any size).
//   node scripts/make-icons.mjs  -> public/campus-art/tycoon/icons/<name>.svg
import fs from 'node:fs';
const OUT = 'public/campus-art/tycoon/icons';
fs.mkdirSync(OUT, { recursive: true });

// Each glyph is drawn in a 24×24 box with round white strokes, centred on a coloured rounded badge.
const G = {
  venue: '<path d="M4 10 12 5l8 5"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="M4 19h16"/>',
  food: '<path d="M8 4v7a2 2 0 0 1-4 0V4M6 11v9"/><path d="M17 4c-2 1-3 3.5-3 6.5h3V20"/>',
  hostel: '<path d="M3 18v-8"/><path d="M3 14h18v4"/><path d="M21 18v-3"/><path d="M7 12a2 2 0 1 0 0-.01"/><path d="M10 14v-3h8a3 3 0 0 1 3 3"/>',
  sports: '<circle cx="12" cy="12" r="8"/><path d="M4.5 9.5c3 1 5 3.5 5.5 10M19.5 14.5c-3-1-5-3.5-5.5-10"/>',
  atm: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/><path d="M8 15h3"/>',
  medical: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  'help-desk': '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7"/><path d="M12 17h.01"/>',
  parking: '<path d="M8 20V4h5a4 4 0 0 1 0 8H8"/>',
  gate: '<path d="M3 9 12 4l9 5"/><path d="M5 9v11M19 9v11"/><path d="M8 13h8M8 17h8M8 13v7M12 13v7M16 13v7"/>',
  statue: '<circle cx="12" cy="5.5" r="2"/><path d="M12 8v6M9 10.5h6M10 14l-1 3M14 14l1 3"/><path d="M7 20h10M8 17h8v3"/>',
  lake: '<path d="M3 15c2 0 2-1.5 4.5-1.5S10 15 12 15s2-1.5 4.5-1.5S19 15 21 15"/><path d="M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2-1.5 4.5-1.5S19 19 21 19"/><path d="M8 10a4 4 0 0 1 8 0"/>',
  bus: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14"/><path d="M8 20v-3M16 20v-3"/><path d="M8.5 14h.01M15.5 14h.01"/>',
};
const COLORS = { venue: '#0F4D32', food: '#FF8A3D', hostel: '#3E6FB8', sports: '#2F8A6A', atm: '#5E6872', medical: '#D64545', 'help-desk': '#B5463A', parking: '#3E6FB8', gate: '#7A5536', statue: '#7A5536', lake: '#2F8FB0', bus: '#E0A21B' };

// Badge: rounded square with a soft inner highlight and a darker bottom lip (tactile game look).
const badge = (name, glyph, col) => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" role="img" aria-label="${name}">
  <rect x="3" y="5" width="42" height="40" rx="12" fill="${col}" opacity=".35"/>
  <rect x="3" y="3" width="42" height="40" rx="12" fill="${col}"/>
  <rect x="6" y="5" width="36" height="16" rx="8" fill="#fff" opacity=".18"/>
  <rect x="3.75" y="3.75" width="40.5" height="38.5" rx="11.25" fill="none" stroke="#fff" stroke-width="1.5" opacity=".9"/>
  <g transform="translate(12 11)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>
`;
for (const [name, glyph] of Object.entries(G)) fs.writeFileSync(`${OUT}/${name}.svg`, badge(name, glyph, COLORS[name]));

// ON AIR badge: red pill with a white live dot and lettering.
fs.writeFileSync(`${OUT}/on-air.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="36" viewBox="0 0 96 36" role="img" aria-label="On air">
  <rect x="2" y="4" width="92" height="30" rx="15" fill="#B3261E" opacity=".35"/>
  <rect x="2" y="2" width="92" height="30" rx="15" fill="#E53935"/>
  <rect x="5" y="4" width="86" height="11" rx="5.5" fill="#fff" opacity=".18"/>
  <circle cx="20" cy="17" r="5" fill="#fff"/><circle cx="20" cy="17" r="8.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6"/>
  <text x="58" y="22.5" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="14" letter-spacing="1" fill="#fff">ON AIR</text>
</svg>
`);
console.log('icons:', Object.keys(G).length + 1);
