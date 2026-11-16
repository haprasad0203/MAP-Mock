// Hand-modelled landmarks (Phase 3R, rebuilt from the real buildings in Phase 3M v2). A building listed here is built by its
// own module instead of the generic builder.
import { buildAdmin } from './admin';
import { buildNab } from './nab';
import { buildCafeCloud, buildMess, buildOctagonHall } from './octagons';
import { buildDBlock, buildNewHostel } from './hostels';
import { buildGuardRoom, buildGym, buildKalamCentre } from './smaller';
import type { LandmarkBuilder } from './kit';

export const LANDMARKS: Record<string, LandmarkBuilder> = {
  admin: buildAdmin, nab: buildNab,
  'cafe-cloud': buildCafeCloud, 'octagon-hall': buildOctagonHall, mess: buildMess,
  'hostel-1': buildDBlock, 'hostel-2': buildNewHostel, 'hostel-3': buildNewHostel, 'hostel-4': buildNewHostel,
  gym: buildGym, 'guard-room': buildGuardRoom, 'kalam-centre': buildKalamCentre,
};
export type { LandmarkCtx } from './kit';
