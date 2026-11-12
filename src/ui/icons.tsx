// Tiny pixel-style icons (crisp 24-unit grids).
const S = (p: { d: string; title: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d={p.d} /></svg>
);
export const IconSearch = () => <S title="search" d="M9 3h6v2h2v2h2v6h-2v2h-2v2H9v-2H7v-2H5V7h2V5h2zm0 2v2H7v6h2v2h6v-2h2V7h-2V5zm8 12h2v2h2v2h-2v-2h-2z" />;
export const IconClose = () => <S title="close" d="M5 5h2v2h2v2h2v2h2V9h2V7h2V5h2v2h-2v2h-2v2h-2v2h2v2h2v2h2v2h-2v-2h-2v-2h-2v-2h-2v2H9v2H7v2H5v-2h2v-2h2v-2h2v-2H9V9H7V7H5z" />;
export const IconLocate = () => <S title="locate" d="M11 2h2v3h2v2h2v2h2v2h3v2h-3v2h-2v2h-2v2h-2v3h-2v-3H9v-2H7v-2H5v-2H2v-2h3V9h2V7h2V5h2zm-2 5v2H7v6h2v2h6v-2h2V9h-2V7zm2 3h2v4h-2z" />;
export const IconRotate = () => <S title="rotate" d="M8 3h8v2h2v2h2v4h-2V9h-2V7H8v2H6v6h2v2h6v-2h-2v-2h6v6h-2v-2h-2v2H8v-2H6v-2H4V9h2V7h2z" />;
export const IconCompass = () => <S title="recentre" d="M11 2h2v2h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2H3v-4h2V8h2V6h2V4h2zm0 4v6h2V6zm0 8v4h2v-4z" />;
export const IconLayers = () => <S title="layers" d="M11 3h2v2h2v2h2v2h2v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5V9h2V7h2V5h2zm0 4v2H9v2h2v2h2v-2h2V9h-2V7zM3 13h2v2h2v2h2v2h6v-2h2v-2h2v-2h2v2h-2v2h-2v2h-2v2H9v-2H7v-2H5v-2H3z" />;
export const IconWalk = () => <S title="walk" d="M11 2h3v3h-3zM9 6h5v2h2v2h2v2h-2v-2h-2v4h2v2h2v4h-2v-4h-2v-2h-2v2h-2v4H8v-4h2v-4h1V9H9v3H7V8h2z" />;
export const IconShare = () => <S title="share" d="M16 3h4v4h-4V6h-2v2h-2v2H9v4h3v2h2v2h2v-1h4v4h-4v-1h-2v-2h-2v-2H9v1H5v-6h4v1h3V8h2V6h2z" />;
export const IconPhone = () => <S title="call" d="M5 3h4v2h1v4H8v2h1v2h1v1h2v1h2v-2h4v1h2v4h-2v2h-3v-1h-3v-1h-2v-1H8v-2H7v-2H5v-2H4V5h1z" />;
export const IconHome = () => <S title="home" d="M11 3h2v2h2v2h2v2h2v2h2v2h-2v8h-5v-6h-4v6H5v-8H3v-2h2V9h2V7h2V5h2z" />;
export const IconCal = () => <S title="schedule" d="M6 3h2v2h8V3h2v2h3v16H3V5h3zm-1 6v10h14V9zm2 2h4v4H7z" />;
export const IconMap = () => <S title="campus" d="M3 5h4v2h4V5h4v2h4V5h2v14h-4v-2h-4v2H9v-2H5v2H3zm2 4v6h4V9zm6 0v6h4V9zm6 0v6h2V9z" />;
export const IconInfo = () => <S title="guide" d="M9 3h6v2h2v2h2v10h-2v2h-2v2H9v-2H7v-2H5V7h2V5h2zm2 4v2h2V7zm0 4v6h2v-6z" />;
export const IconUser = () => <S title="me" d="M10 3h4v2h2v6h-2v2h-4v-2H8V5h2zM6 15h12v2h2v4H4v-4h2z" />;
