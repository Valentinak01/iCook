import { useState } from 'react';
import { Modal } from './ui.jsx';
import { CATEGORY_COLORS } from '../utils.js';
import { CATEGORY_GROUPS } from '../data/sampleData.js';
import { useStore } from '../store.jsx';

const ICON_SUGGESTIONS = ['🏷️', '🍝', '🍲', '🥗', '🍛', '🍰', '🍳', '🥩', '🐟', '🥕', '🌱', '🔥', '⚡', '🥂', '👵', '🏖️', '🎄', '📦', '🌶️', '🧀'];

// Dialog zum Anlegen oder Bearbeiten einer Kategorie
export default function CategoryEditor({ category, onClose, onSaved }) {
  const { categories, addCategory, updateCategory, toast } = useStore();
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '🏷️');
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [group, setGroup] = useState(category?.group || 'Eigene');
  const [error, setError] = useState('');

  const groups = Array.from(new Set([...CATEGORY_GROUPS, ...categories.map((c) => c.group)]));

  const save = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) return setError('Bitte gib einen Namen ein.');
    const clash = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== category?.id);
    if (clash) return setError('Eine Kategorie mit diesem Namen gibt es bereits.');
    if (category) {
      updateCategory(category.id, { name: trimmed, icon, color, group });
      toast('Kategorie gespeichert');
      onSaved?.(category.id);
    } else {
      const id = addCategory({ name: trimmed, icon, color, group });
      toast(`Kategorie „${trimmed}“ erstellt`);
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <Modal
      title={category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" form="category-form" className="btn btn-primary">Speichern</button>
        </>
      }
    >
      <form id="category-form" onSubmit={save} className="form-stack">
        <label className="field">
          <span className="label">Name *</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="z. B. Rezepte für den Sommer"
            aria-invalid={!!error}
          />
          {error && <span className="field-error">{error}</span>}
        </label>

        <label className="field">
          <span className="label">Gruppe</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <div className="field">
          <span className="label">Symbol</span>
          <div className="icon-picker">
            {ICON_SUGGESTIONS.map((ic) => (
              <button type="button" key={ic} className={`icon-choice ${ic === icon ? 'active' : ''}`} onClick={() => setIcon(ic)}>
                {ic}
              </button>
            ))}
            <input
              className="icon-input"
              value={icon}
              maxLength={4}
              onChange={(e) => setIcon(e.target.value)}
              aria-label="Eigenes Emoji"
            />
          </div>
        </div>

        <div className="field">
          <span className="label">Farbe</span>
          <div className="color-picker">
            {CATEGORY_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${c === color ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Farbe ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Vorschau</span>
          <div>
            <span className="chip active" style={{ '--chip-color': color }}>
              <span className="chip-icon">{icon}</span>{name || 'Kategoriename'}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
