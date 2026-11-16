import { lazy, Suspense } from 'react';
import CampusPage from '../ui/CampusPage';
import { IconCal, IconHome, IconInfo, IconMap, IconUser } from '../ui/icons';

const SurveyPage = lazy(() => import('../survey/SurveyPage'));
const DebugLayout = lazy(() => import('../ui/DebugLayout'));
const ModelViewer = lazy(() => import('../ui/ModelViewer'));
const FacadeEditor = lazy(() => import('../ui/FacadeEditor'));

/** Mock of the WMC app shell: only the Campus route is real; the others are stand-ins that deep-link into it. */
export default function App() {
  if (new URLSearchParams(location.search).get('debug') === 'layout') return <Suspense fallback={null}><DebugLayout /></Suspense>;
  const model = new URLSearchParams(location.search).get('model'); // dev: one building alone, for comparing with its render
  if (model) return <Suspense fallback={null}><ModelViewer id={model} /></Suspense>;
  const facadeEdit = new URLSearchParams(location.search).get('facade-edit'); // dev: mark wall faces on a render (Phase 3M)
  if (facadeEdit) return <Suspense fallback={null}><FacadeEditor id={facadeEdit} /></Suspense>;
  const path = location.pathname.replace(/\/+$/, '') || '/campus';
  let page: JSX.Element;
  if (path === '/campus' || path === '') page = <CampusPage />;
  else if (path === '/organizer/survey') page = <Suspense fallback={null}><SurveyPage /></Suspense>;
  else if (path === '/sessions') page = <Mock title="Schedule" links={[['Inaugural Plenary → Directions', '/campus?room=AUD'], ['Track B1 · Room 104 → Map', '/campus?room=104'], ['Doctoral Colloquium → Map', '/campus?room=LIB-R']]} />;
  else if (path === '/home') page = <Mock title="Home" links={[['Up next: Track A1 (Room 101)', '/campus?room=101'], ["Today's mess menu", '/campus?place=mess'], ['Help desk', '/campus?place=help-desk']]} />;
  else page = <Mock title="Guide" links={[['Arrival plan (stub)', '/campus'], ['Organiser: Survey mode', '/organizer/survey?organiser=1']]} />;
  const tab = (href: string, label: string, icon: JSX.Element) => (
    <a href={href} aria-current={path.startsWith(href) ? 'page' : undefined}>{icon}{label}</a>
  );
  return (
    <>
      {page}
      <nav className="tabbar" aria-label="App">
        {tab('/home', 'Home', <IconHome />)}{tab('/sessions', 'Schedule', <IconCal />)}{tab('/campus', 'Campus', <IconMap />)}{tab('/guide', 'Guide', <IconInfo />)}{tab('/me', 'Me', <IconUser />)}
      </nav>
    </>
  );
}

function Mock({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="page"><h1>{title}</h1><div className="muted" style={{ marginBottom: 12 }}>Stand-in page for the WMC app. These links open the Campus map already focused.</div>
      {links.map(([t, h]) => <a key={h} href={h} className="card" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}><h3>{t}</h3><div className="muted">{h}</div></a>)}
    </div>
  );
}
