import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Modal } from './ui.jsx';
import { DEFAULT_FRAME, frameStyle } from '../utils.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Bildausschnitt wählen: ziehen zum Verschieben, Regler/Mausrad/zwei Finger zum Zoomen.
// Gespeichert wird nur ein Fokuspunkt (x/y in %) und der Zoom – so passt der Ausschnitt
// auf breiten wie auf schmalen Bildschirmen.
export default function ImageFramer({ src, initial, aspect = 2.4, coverBottom = 0, title = 'Bildausschnitt anpassen', onSave, onCancel }) {
  const [frame, setFrame] = useState({ ...DEFAULT_FRAME, ...initial });
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef(null);
  const natural = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  // Verschiebung in Pixeln -> neue Fokus-Position. Exakt für object-fit: cover + scale um den Fokuspunkt.
  const shift = (f, dx, dy) => {
    const box = boxRef.current;
    if (!box || !natural.current) return f;
    const W = box.clientWidth;
    const H = box.clientHeight;
    const s = Math.max(W / natural.current.w, H / natural.current.h);
    const spanX = W - natural.current.w * s * f.zoom;
    const spanY = H - natural.current.h * s * f.zoom;
    return {
      ...f,
      x: spanX < -0.5 ? clamp(f.x + (dx * 100) / spanX, 0, 100) : f.x,
      y: spanY < -0.5 ? clamp(f.y + (dy * 100) / spanY, 0, 100) : f.y,
    };
  };

  const zoomTo = (z) => setFrame((f) => ({ ...f, zoom: clamp(z, MIN_ZOOM, MAX_ZOOM) }));

  useEffect(() => {
    const box = boxRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      setFrame((f) => ({ ...f, zoom: clamp(f.zoom * Math.exp(-e.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM) }));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* Zeiger schon beendet */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: frame.zoom };
    }
  };

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((pinch.current.zoom * dist) / pinch.current.dist);
    } else if (pointers.current.size === 1) {
      setFrame((f) => shift(f, next.x - prev.x, next.y - prev.y));
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) setDragging(false);
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 40 : 10;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setFrame((f) => shift(f, ...moves[e.key]));
    } else if (e.key === '+' || e.key === '=') {
      zoomTo(frame.zoom + 0.1);
    } else if (e.key === '-') {
      zoomTo(frame.zoom - 0.1);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onCancel}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn-primary" onClick={() => onSave(frame)}>
            <Icon name="check" size={17} /> Übernehmen
          </button>
        </>
      }
    >
      <div
        ref={boxRef}
        className={`framer-box ${dragging ? 'dragging' : ''}`}
        style={{ aspectRatio: aspect }}
        tabIndex={0}
        aria-label="Bildausschnitt. Mit den Pfeiltasten verschieben, mit Plus und Minus zoomen."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <img
          className="recipe-img"
          src={src}
          alt=""
          draggable={false}
          style={frameStyle(frame)}
          onLoad={(e) => { natural.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }; }}
        />
        <div className="framer-grid" />
        {coverBottom > 0 && <div className="framer-covered" style={{ height: `${coverBottom * 100}%` }}><span>vom Textfeld verdeckt</span></div>}
      </div>

      <div className="framer-zoom">
        <button type="button" className="icon-btn sm" onClick={() => zoomTo(frame.zoom - 0.2)} disabled={frame.zoom <= MIN_ZOOM} aria-label="Verkleinern">
          <Icon name="minus" size={16} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={frame.zoom}
          onChange={(e) => zoomTo(Number(e.target.value))}
          aria-label="Zoom"
        />
        <button type="button" className="icon-btn sm" onClick={() => zoomTo(frame.zoom + 0.2)} disabled={frame.zoom >= MAX_ZOOM} aria-label="Vergrößern">
          <Icon name="plus" size={16} />
        </button>
        <span className="framer-zoom-value">{Math.round(frame.zoom * 100)} %</span>
        <button type="button" className="icon-btn sm" onClick={() => setFrame(DEFAULT_FRAME)} aria-label="Ausschnitt zurücksetzen" title="Zurücksetzen">
          <Icon name="refresh" size={16} />
        </button>
      </div>
      <p className="muted small">Bild ziehen zum Verschieben · Regler, Mausrad oder zwei Finger zum Zoomen</p>
    </Modal>
  );
}
