import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { useStore } from '../store.jsx';
import { frameStyle } from '../utils.js';

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Löschen', danger = true, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

export function ToastHost() {
  const { toasts } = useStore();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={t.type === 'error' ? 'alert' : 'check'} size={18} />
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 20 }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label={`Bewertung ${value} von 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            className={`star ${n <= value ? 'on' : ''}`}
            onClick={() => onChange(n === value ? 0 : n)}
            aria-label={`${n} Sterne`}
          >
            <Icon name="star" size={size} filled={n <= value} />
          </button>
        ) : (
          <span key={n} className={`star ${n <= value ? 'on' : ''}`}>
            <Icon name="star" size={size} filled={n <= value} />
          </span>
        )
      )}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, label }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Weniger">
        <Icon name="minus" size={16} />
      </button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mehr">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

// Foto oder stimmungsvoller Platzhalter
export function RecipeImage({ recipe, className = '' }) {
  if (recipe.image) {
    return <img className={`recipe-img ${className}`} src={recipe.image} alt={recipe.title} style={frameStyle(recipe.imageFrame)} />;
  }
  const hue = recipe.hue ?? 160;
  return (
    <div
      className={`recipe-img placeholder ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 30%, hsl(${hue} 30% 24%), hsl(${hue} 24% 9%) 75%)`,
      }}
      role="img"
      aria-label={`Kein Foto: ${recipe.title}`}
    >
      {recipe.emoji ? <span className="placeholder-emoji">{recipe.emoji}</span> : <Icon name="chef" size={48} strokeWidth={1.4} />}
    </div>
  );
}

export function CategoryTag({ category, small = false, onClick, active = false }) {
  if (!category) return null;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`chip ${small ? 'chip-sm' : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{ '--chip-color': category.color }}
      aria-pressed={onClick ? active : undefined}
    >
      <span className="chip-icon" aria-hidden="true">{category.icon}</span>
      {category.name}
    </Tag>
  );
}

export function EmptyState({ icon = 'book', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={32} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
