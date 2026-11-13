// Hand-modelled landmarks (Phase 3R). A building listed here is built by its own module instead of the generic builder.
import { buildAdmin } from './admin';
import { buildNab } from './nab';
import type { LandmarkBuilder } from './kit';

export const LANDMARKS: Record<string, LandmarkBuilder> = { admin: buildAdmin, nab: buildNab };
export type { LandmarkCtx } from './kit';
