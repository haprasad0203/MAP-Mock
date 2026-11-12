import { useEffect, useMemo, useRef, useState } from 'react';
import { computeSurveyFit, loadLayout, loadSurvey, saveSurvey, type SurveyPoint } from '../geo/source';
import type { CampusLayout } from '../geo/types';
import { toLocal } from '../geo/grid';

const SAMPLE_MS = 20000, MAX_ACC = 15;

/** Organiser-only: walk to an entrance/junction/landmark, tap Save, and the averaged GPS fix becomes a control point. */
export default function SurveyPage() {
  const [layout, setLayout] = useState<CampusLayout | null>(null);
  const [pts, setPts] = useState<SurveyPoint[]>(loadSurvey());
  const [target, setTarget] = useState('');
  const [live, setLive] = useState<GeolocationPosition | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<{ t0: number; fixes: GeolocationCoordinates[] } | null>(null);
  const watch = useRef<number | null>(null);
  const organiser = new URLSearchParams(location.search).get('organiser') === '1' || localStorage.getItem('wmc.role') === 'organiser';

  useEffect(() => { loadLayout().then(({ layout }) => setLayout(layout)); }, []);
  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); }, []);
  useEffect(() => { saveSurvey(pts); }, [pts]);

  const targets = useMemo(() => !layout ? [] : [
    ...layout.entrances.map(e => ({ id: 'entrance:' + e.id, label: `Entrance · ${layout.buildings.find(b => b.id === e.buildingId)?.name ?? e.buildingId}` })),
    ...layout.landmarks.map(l => ({ id: 'landmark:' + l.id, label: `Landmark · ${l.name}` })),
    ...layout.buildings.map(b => ({ id: 'building:' + b.id, label: `Building centre · ${b.name}` })),
  ], [layout]);

  function startGps() {
    if (!('geolocation' in navigator)) { setErr('This browser has no GPS access.'); return; }
    watch.current = navigator.geolocation.watchPosition(p => { setLive(p); setErr(null); setRec(r => r ? { ...r, fixes: [...r.fixes, p.coords] } : r); },
      e => setErr(e.message), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }
  function save() { if (!target) return; if (watch.current == null) startGps(); setRec({ t0: Date.now(), fixes: [] }); }
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      if (Date.now() - rec.t0 < SAMPLE_MS) { setRec(r => r && { ...r }); return; }
      clearInterval(id);
      const good = rec.fixes.filter(f => f.accuracy <= MAX_ACC);
      if (good.length < 3) { setErr(`Only ${good.length} fixes under ${MAX_ACC} m. Step into the open and try again.`); setRec(null); return; }
      const w = good.map(f => 1 / (f.accuracy * f.accuracy)); const W = w.reduce((a, b) => a + b, 0);
      const lat = good.reduce((s, f, i) => s + f.latitude * w[i], 0) / W, lon = good.reduce((s, f, i) => s + f.longitude * w[i], 0) / W;
      const c = toLocal(lat, lon); const spread = Math.sqrt(good.reduce((s, f) => { const q = toLocal(f.latitude, f.longitude); return s + (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2; }, 0) / good.length);
      const pt: SurveyPoint = { targetId: target, lat, lon, accuracy: Math.min(...good.map(f => f.accuracy)), samples: good.length, spread, savedAt: new Date().toISOString() };
      setPts(ps => [...ps.filter(x => x.targetId !== target), pt]); setRec(null);
    }, 500);
    return () => clearInterval(id);
  }, [rec?.t0]);

  const fit = useMemo(() => (layout && pts.length ? computeSurveyFit(layout, pts) : null), [layout, pts]);
  const exportJson = () => { const blob = new Blob([JSON.stringify({ origin: layout?.origin, points: pts }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'campus-survey.json'; a.click(); };
  const importJson = (f: File) => f.text().then(t => { const d = JSON.parse(t); if (Array.isArray(d.points)) setPts(d.points); });

  if (!organiser) return (
    <div className="page"><h1>Survey mode</h1><div className="card">Organisers only. Open this page from the Organiser console (or add <code>?organiser=1</code> in this mock).</div></div>
  );
  const progress = rec ? Math.min(1, (Date.now() - rec.t0) / SAMPLE_MS) : 0;
  return (
    <div className="page">
      <h1>Survey mode</h1>
      <div className="card">
        <h3>1 · Stand on the spot</h3>
        <div className="muted">Walk to a building entrance, a path junction or a landmark. Hold the phone still in the open.</div>
        <div style={{ marginTop: 10 }}>
          <select value={target} onChange={e => setTarget(e.target.value)} aria-label="Point to save">
            <option value="">Choose what you are standing at…</option>
            {targets.map(t => <option key={t.id} value={t.id}>{pts.some(p => p.targetId === t.id) ? '✓ ' : ''}{t.label}</option>)}
          </select>
        </div>
        <div className="btns">
          <button className="btn primary" disabled={!target || !!rec} onClick={save}>{rec ? 'Averaging GPS…' : 'Save this point'}</button>
          {watch.current == null && <button className="btn" onClick={startGps}>Start GPS</button>}
        </div>
        {rec && <div style={{ marginTop: 10 }}><div className="meter"><div style={{ width: `${progress * 100}%` }} /></div><div className="muted">{rec.fixes.length} fixes · keep still for {Math.ceil((1 - progress) * SAMPLE_MS / 1000)} s</div></div>}
        <div className="muted" style={{ marginTop: 8 }}>{live ? `GPS ±${live.coords.accuracy.toFixed(0)} m` : 'GPS off'}{err ? ` · ${err}` : ''}</div>
      </div>
      <div className="card">
        <h3>2 · Saved points ({pts.length})</h3>
        <table className="pts"><thead><tr><th>Point</th><th>±m</th><th>Spread</th><th>Fit error</th><th /></tr></thead><tbody>
          {pts.map(p => { const i = fit?.pairs.findIndex(x => x.p.targetId === p.targetId) ?? -1; const pair = i >= 0 ? fit!.pairs[i] : null;
            const res = pair ? (() => { const t = fit!.transform; const q = t.affine ? [t.affine[0] * pair.src[0] + t.affine[1] * pair.src[1] + t.affine[4], t.affine[2] * pair.src[0] + t.affine[3] * pair.src[1] + t.affine[5]] : [t.a * pair.src[0] - t.b * pair.src[1] + t.tx, t.b * pair.src[0] + t.a * pair.src[1] + t.ty]; return Math.hypot(q[0] - pair.dst[0], q[1] - pair.dst[1]); })() : null;
            return <tr key={p.targetId}><td>{targets.find(t => t.id === p.targetId)?.label ?? p.targetId}</td><td>{p.accuracy.toFixed(0)}</td><td>{p.spread.toFixed(1)}</td><td>{res != null ? res.toFixed(1) + ' m' : '–'}</td><td><button className="btn" style={{ minHeight: 32 }} onClick={() => setPts(ps => ps.filter(x => x !== p))}>✕</button></td></tr>; })}
        </tbody></table>
        {fit && <div className="muted" style={{ marginTop: 8 }}>Fit: {fit.transform.affine ? 'affine' : 'similarity'} from {fit.pairs.length} point(s). The campus map uses this automatically on next open.</div>}
        <div className="btns"><button className="btn" onClick={exportJson}>Export JSON</button>
          <label className="btn">Import<input type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} /></label>
          <a className="btn" href="/campus">Open map</a></div>
      </div>
    </div>
  );
}
