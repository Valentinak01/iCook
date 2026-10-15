import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, EmptyState, Modal, PageHeader, RecipeImage, Stepper } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { prettyAmount } from '../utils.js';

function RecipePicker({ onClose }) {
  const { recipes, addRecipesToShopping, toast } = useStore();
  const [picked, setPicked] = useState({}); // id -> servings

  const toggle = (r) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[r.id]) delete next[r.id];
      else next[r.id] = r.servings;
      return next;
    });

  const add = () => {
    const selections = Object.entries(picked).map(([id, servings]) => ({ recipe: recipes.find((r) => r.id === id), servings }));
    addRecipesToShopping(selections);
    toast(`Zutaten aus ${selections.length} Rezept(en) hinzugefügt`);
    onClose();
  };

  const count = Object.keys(picked).length;

  return (
    <Modal
      title="Rezepte zur Einkaufsliste"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={add} disabled={!count}>
            <Icon name="cart" size={17} /> {count ? `${count} Rezept(e) hinzufügen` : 'Rezepte wählen'}
          </button>
        </>
      }
    >
      <p className="muted small">Wähle Rezepte und Portionen – gleiche Zutaten werden automatisch zusammengeführt.</p>
      <ul className="picker-list">
        {recipes.map((r) => (
          <li key={r.id} className={`picker-row ${picked[r.id] ? 'on' : ''}`}>
            <label className="picker-main">
              <input type="checkbox" checked={!!picked[r.id]} onChange={() => toggle(r)} />
              <RecipeImage recipe={r} className="thumb" />
              <span>{r.title}</span>
            </label>
            {picked[r.id] && (
              <Stepper value={picked[r.id]} onChange={(v) => setPicked((p) => ({ ...p, [r.id]: v }))} label="Portionen" />
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default function ShoppingListPage() {
  const { shopping, settings, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, clearShopping, toast } = useStore();
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const open = shopping.filter((i) => !i.checked);
  const done = shopping.filter((i) => i.checked);

  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addShoppingItem(text.trim());
    setText('');
  };

  const Item = ({ item }) => (
    <li className={`shop-item ${item.checked ? 'checked' : ''}`}>
      <label className="check-row">
        <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} />
        <span className="checkbox-ui"><Icon name="check" size={14} strokeWidth={3} /></span>
        <span className="shop-text">
          {item.amount !== null && <strong>{prettyAmount(item.amount, item.unit, settings.convertUnits)} </strong>}
          {item.name}
          {item.sources.length > 0 && <span className="shop-source">{item.sources.join(' · ')}</span>}
        </span>
      </label>
      <button className="icon-btn sm" onClick={() => removeShoppingItem(item.id)} aria-label={`${item.name} entfernen`}>
        <Icon name="x" size={16} />
      </button>
    </li>
  );

  return (
    <div className="page narrow">
      <PageHeader
        title="Einkaufsliste"
        subtitle={shopping.length ? `${open.length} offen · ${done.length} erledigt` : 'Zutaten aus Rezepten sammeln und beim Einkauf abhaken.'}
        actions={
          <button className="btn btn-primary" onClick={() => setPicker(true)}>
            <Icon name="book" size={17} /> Aus Rezepten
          </button>
        }
      />

      <form className="add-row" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Weiteres Produkt hinzufügen, z. B. Spülmittel" aria-label="Produkt hinzufügen" />
        <button className="btn btn-outline" type="submit" disabled={!text.trim()}><Icon name="plus" size={17} /> Hinzufügen</button>
      </form>

      {!shopping.length ? (
        <EmptyState icon="cart" title="Deine Einkaufsliste ist leer" text="Füge Zutaten direkt aus einem Rezept hinzu oder trage Produkte manuell ein." />
      ) : (
        <>
          <ul className="shop-list card">
            {open.map((i) => <Item key={i.id} item={i} />)}
            {!open.length && <li className="muted small pad">Alles erledigt – viel Spaß beim Kochen! 🎉</li>}
          </ul>

          {done.length > 0 && (
            <>
              <div className="section-head">
                <h2 className="small-title">Erledigt</h2>
                <button className="link-btn" onClick={() => { clearCheckedShopping(); toast('Erledigte Einträge entfernt'); }}>Erledigte entfernen</button>
              </div>
              <ul className="shop-list card">
                {done.map((i) => <Item key={i.id} item={i} />)}
              </ul>
            </>
          )}

          <button className="btn btn-ghost danger-text" onClick={() => setConfirmClear(true)}>
            <Icon name="trash" size={16} /> Liste leeren
          </button>
        </>
      )}

      {picker && <RecipePicker onClose={() => setPicker(false)} />}
      {confirmClear && (
        <ConfirmDialog
          title="Einkaufsliste leeren?"
          message="Alle Einträge werden entfernt."
          confirmLabel="Leeren"
          onConfirm={() => { clearShopping(); setConfirmClear(false); toast('Einkaufsliste geleert'); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
