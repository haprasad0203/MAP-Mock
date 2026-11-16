// Rounded stroke icons for the game UI skin (Phase 4): 24-unit grid, 2 px strokes, round caps and joins.
import type { ReactNode } from 'react';
const S = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const IconSearch = () => <S><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></S>;
export const IconClose = () => <S><path d="M6 6l12 12M18 6 6 18" /></S>;
export const IconLocate = () => <S><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" /></S>;
export const IconRotate = () => <S><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></S>;
export const IconCompass = () => <S><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" fillOpacity=".25" /></S>;
export const IconLayers = () => <S><path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></S>;
export const IconWalk = () => <S><circle cx="13" cy="4.5" r="1.8" fill="currentColor" /><path d="m10 21 2-6-2.5-2.5L11 8l3 2.5 3 1M14 15l2 6M11 8 7.5 10v3" /></S>;
export const IconShare = () => <S><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" /></S>;
export const IconPhone = () => <S><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></S>;
export const IconHome = () => <S><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h4.5v-5h3v5H18V9.5" /></S>;
export const IconCal = () => <S><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></S>;
export const IconMap = () => <S><path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20z" /><path d="M9 4v13.5M15 6.5V20" /></S>;
export const IconInfo = () => <S><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /></S>;
export const IconUser = () => <S><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></S>;
