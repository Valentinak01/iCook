import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import CategoryEditor from '../components/CategoryEditor.jsx';
import ImageFramer from '../components/ImageFramer.jsx';
import { CategoryTag, EmptyState, PageHeader, Stepper } from '../components/ui.jsx';
import { Link, navigate, setNavigationBlocker } from '../router.jsx';
import { useStore } from '../store.jsx';
import { ALLERGENS, DIFFICULTIES, capitalize, UNITS, formatMinutes, frameStyle, isSimilarTitle, parseAmount, parseIngredientLine, resizeImage, uid } from '../utils.js';

const emptyIngredient = () => ({ id: uid(), amountText: '', unit: 'g', name: '' });
const emptyStep = () => ({ id: uid(), text: '' });

function toForm(recipe) {
  if (!recipe) {
    return {
      title: '', description: '', image: null, imageFrame: null, categoryIds: [], servings: 2, prepTime: '', cookTime: '',
      difficulty: 'leicht', ingredients: [emptyIngredient()], steps: [emptyStep()], notes: '', allergens: [],
    };
  }
  return {
    title: recipe.title,
    description: recipe.description || '',
    image: recipe.image || null,
    imageFrame: recipe.imageFrame || null,
    categoryIds: [...recipe.categoryIds],
    servings: recipe.servings,
    prepTime: recipe.prepTime ?? '',
    cookTime: recipe.cookTime ?? '',
    difficulty: recipe.difficulty || 'leicht',
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((i) => ({
          id: i.id,
          amountText: i.amount === null || i.amount === undefined ? '' : String(Math.round(i.amount * 100) / 100).replace('.', ','),
          unit: i.unit || '',
          name: i.name,
        }))
      : [emptyIngredient()],
    steps: recipe.steps.length ? recipe.steps.map((t) => ({ id: uid(), text: t })) : [emptyStep()],
    notes: recipe.notes || '',
    allergens: [...(recipe.allergens || [])],
  };
}

function Section({ number, title, hint, children }) {
  return (
    <section className="card form-section">
      <div className="form-section-head">
        <span className="section-num">{number}</span>
        <div>
          <h2>{title}</h2>
          {hint && <p className="muted small">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function RecipeFormPage({ id }) {
  const { recipes, categories, addRecipe, updateRecipe, toast } = useStore();
  const existing = id ? recipes.find((r) => r.id === id) : null;

  const initial = useMemo(() => toForm(existing), [id]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [newCategory, setNewCategory] = useState(false);
  const [bulk, setBulk] = useState({ ingredients: null, steps: null });
  const [imageBusy, setImageBusy] = useState(false);
  const [framing, setFraming] = useState(null); // { src, initial }
  const titleRef = useRef(null);
  const fileRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Eingaben nicht unbemerkt verlieren
  useEffect(() => {
    setNavigationBlocker(() => dirtyRef.current);
    const onUnload = (e) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      setNavigationBlocker(null);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    });
    return [...map.entries()];
  }, [categories]);

  if (id && !existing) {
    return <div className="page"><EmptyState icon="alert" title="Rezept nicht gefunden" action={<Link to="/rezepte" className="btn btn-primary">Zur Übersicht</Link>} /></div>;
  }

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const updateItem = (key, itemId, patch) =>
    set(key, form[key].map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
  const removeItem = (key, itemId) => {
    const next = form[key].filter((it) => it.id !== itemId);
    set(key, next.length ? next : [key === 'ingredients' ? emptyIngredient() : emptyStep()]);
  };
  const moveItem = (key, index, dir) => {
    const next = [...form[key]];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    set(key, next);
  };

  const toggleCategory = (cid) =>
    set('categoryIds', form.categoryIds.includes(cid) ? form.categoryIds.filter((x) => x !== cid) : [...form.categoryIds, cid]);

  const toggleAllergen = (a) =>
    set('allergens', form.allergens.includes(a) ? form.allergens.filter((x) => x !== a) : [...form.allergens, a]);

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Bitte eine Bilddatei wählen', 'error');
    setImageBusy(true);
    try {
      setFraming({ src: await resizeImage(file), initial: null });
    } catch {
      toast('Bild konnte nicht gelesen werden', 'error');
    }
    setImageBusy(false);
  };

  const applyBulk = (key) => {
    const lines = (bulk[key] || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return setBulk((b) => ({ ...b, [key]: null }));
    const items = key === 'ingredients'
      ? lines.map(parseIngredientLine).filter(Boolean).map((p) => ({
          id: uid(),
          amountText: p.amount === null ? '' : String(Math.round(p.amount * 100) / 100).replace('.', ','),
          unit: p.amount === null ? '' : p.unit,
          name: p.name,
        }))
      : lines.map((l) => ({ id: uid(), text: l.replace(/^\d+[.)]\s*/, '') }));
    const kept = form[key].filter((it) => (key === 'ingredients' ? it.name.trim() : it.text.trim()));
    set(key, [...kept, ...items]);
    setBulk((b) => ({ ...b, [key]: null }));
    toast(`${items.length} ${key === 'ingredients' ? 'Zutaten' : 'Schritte'} übernommen`);
  };

  const similar = form.title.trim().length >= 3
    ? recipes.filter((r) => r.id !== id && isSimilarTitle(r.title, form.title))
    : [];

  const save = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Bitte gib dem Rezept einen Titel.';
    const badAmounts = form.ingredients.filter((i) => i.amountText.trim() && parseAmount(i.amountText) === null);
    if (badAmounts.length) nextErrors.ingredients = 'Bitte prüfe die Mengenangaben (z. B. 200, 1,5 oder 1/2).';
    if (form.servings < 1) nextErrors.servings = 'Mindestens 1 Portion.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.title) titleRef.current?.focus();
      toast('Bitte markierte Felder prüfen', 'error');
      return;
    }

    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      imageFrame: form.image ? form.imageFrame : null,
      categoryIds: form.categoryIds,
      servings: Number(form.servings) || 1,
      prepTime: Number(form.prepTime) || 0,
      cookTime: Number(form.cookTime) || 0,
      difficulty: form.difficulty,
      ingredients: form.ingredients
        .filter((i) => i.name.trim())
        .map((i) => {
          const amount = parseAmount(i.amountText);
          return { id: i.id, amount, unit: amount === null ? '' : i.unit, name: i.name.trim() };
        }),
      steps: form.steps.map((s) => s.text.trim()).filter(Boolean),
      notes: form.notes.trim(),
      allergens: form.allergens,
    };

    setNavigationBlocker(null);
    if (existing) {
      updateRecipe(existing.id, data);
      toast('Änderungen gespeichert');
      navigate(`/rezept/${existing.id}`, { replace: true });
    } else {
      const newId = addRecipe(data);
      toast('Rezept gespeichert 🎉');
      navigate(`/rezept/${newId}`, { replace: true });
    }
  };

  const cancel = () => {
    if (history.length > 1) history.back();
    else navigate(existing ? `/rezept/${existing.id}` : '/');
  };

  const total = (Number(form.prepTime) || 0) + (Number(form.cookTime) || 0);

  return (
    <form className="page narrow recipe-form" onSubmit={save} noValidate>
      <PageHeader
        title={existing ? 'Rezept bearbeiten' : 'Neues Rezept'}
        subtitle={existing ? existing.title : 'Halte dein Lieblingsgericht Schritt für Schritt fest.'}
      />

      <Section number="1" title="Grunddaten">
        <label className="field">
          <span className="label">Rezepttitel *</span>
          <input
            ref={titleRef}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="z. B. Cremige Zitronenpasta"
            aria-invalid={!!errors.title}
            aria-describedby="title-msg"
          />
          {errors.title && <span id="title-msg" className="field-error"><Icon name="alert" size={14} /> {errors.title}</span>}
          {similar.length > 0 && (
            <span className="field-warn">
              <Icon name="info" size={14} /> Ähnliches Rezept vorhanden:{' '}
              {similar.slice(0, 3).map((r, i) => (
                <span key={r.id}>{i > 0 && ', '}<Link to={`/rezept/${r.id}`}>{r.title}</Link></span>
              ))}
            </span>
          )}
        </label>

        <label className="field">
          <span className="label">Kurzbeschreibung</span>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Geschmack, Anlass oder die Geschichte hinter dem Gericht …" />
        </label>

        <div className="field">
          <span className="label">Bild</span>
          <div className="image-field">
            {form.image ? (
              <div className="image-preview">
                <div className="image-preview-frame">
                  <img className="recipe-img" src={form.image} alt="Vorschau" style={frameStyle(form.imageFrame)} />
                </div>
                <div className="image-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setFraming({ src: form.image, initial: form.imageFrame })}>
                    <Icon name="move" size={15} /> Ausschnitt
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>Ändern</button>
                  <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={() => setForm((f) => ({ ...f, image: null, imageFrame: null }))}>Entfernen</button>
                </div>
              </div>
            ) : (
              <button type="button" className="dropzone" onClick={() => fileRef.current.click()} disabled={imageBusy}>
                <Icon name="image" size={28} />
                <span>{imageBusy ? 'Wird geladen …' : 'Foto hochladen'}</span>
                <span className="muted tiny">Optional – sonst wird ein Platzhalter angezeigt</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImage} />
            {framing && (
              <ImageFramer
                src={framing.src}
                initial={framing.initial}
                coverBottom={0.12}
                onSave={(frame) => { setForm((f) => ({ ...f, image: framing.src, imageFrame: frame })); setFraming(null); }}
                onCancel={() => setFraming(null)}
              />
            )}
          </div>
        </div>
      </Section>

      <Section number="2" title="Kategorien" hint="Ein Rezept kann mehreren Kategorien angehören.">
        <div className="category-picker">
          {groups.map(([group, cats]) => (
            <div key={group} className="filter-group">
              <span className="label">{group}</span>
              <div className="chip-row wrap">
                {cats.map((c) => (
                  <CategoryTag key={c.id} category={c} small active={form.categoryIds.includes(c.id)} onClick={() => toggleCategory(c.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewCategory(true)}>
          <Icon name="plus" size={16} /> Neue Kategorie anlegen
        </button>
      </Section>

      <Section number="3" title="Portionen & Zeit">
        <div className="form-grid">
          <div className="field">
            <span className="label">Portionen *</span>
            <Stepper value={Number(form.servings) || 1} onChange={(v) => set('servings', v)} label="Portionen" />
          </div>
          <label className="field">
            <span className="label">Vorbereitung (Min.)</span>
            <input type="number" min="0" inputMode="numeric" value={form.prepTime} onChange={(e) => set('prepTime', e.target.value)} placeholder="10" />
          </label>
          <label className="field">
            <span className="label">Kochzeit (Min.)</span>
            <input type="number" min="0" inputMode="numeric" value={form.cookTime} onChange={(e) => set('cookTime', e.target.value)} placeholder="20" />
          </label>
          <div className="field">
            <span className="label">Gesamtzeit</span>
            <div className="readonly-value">{formatMinutes(total)}</div>
          </div>
        </div>
        <div className="field">
          <span className="label">Schwierigkeit</span>
          <div className="segmented">
            {DIFFICULTIES.map((d) => (
              <button type="button" key={d} className={form.difficulty === d ? 'active' : ''} onClick={() => set('difficulty', d)}>{capitalize(d)}</button>
            ))}
          </div>
        </div>
      </Section>

      <Section number="4" title="Zutaten" hint="Menge leer lassen für Angaben wie „Salz nach Geschmack“ – diese werden nicht umgerechnet.">
        {errors.ingredients && <span className="field-error"><Icon name="alert" size={14} /> {errors.ingredients}</span>}
        <ul className="edit-list">
          {form.ingredients.map((ing, i) => {
            const bad = ing.amountText.trim() && parseAmount(ing.amountText) === null;
            return (
              <li key={ing.id} className="ingredient-edit">
                <input className={`amount ${bad ? 'invalid' : ''}`} value={ing.amountText} onChange={(e) => updateItem('ingredients', ing.id, { amountText: e.target.value })} placeholder="Menge" aria-label={`Menge Zutat ${i + 1}`} aria-invalid={!!bad} inputMode="decimal" />
                <select className="unit" value={ing.unit} onChange={(e) => updateItem('ingredients', ing.id, { unit: e.target.value })} aria-label={`Einheit Zutat ${i + 1}`}>
                  {UNITS.map((u) => <option key={u} value={u}>{u || '–'}</option>)}
                </select>
                <input className="name" value={ing.name} onChange={(e) => updateItem('ingredients', ing.id, { name: e.target.value })} placeholder="Zutat, z. B. Spaghetti" aria-label={`Zutat ${i + 1}`} />
                <button type="button" className="icon-btn sm" onClick={() => removeItem('ingredients', ing.id)} aria-label={`Zutat ${i + 1} entfernen`}><Icon name="x" size={16} /></button>
              </li>
            );
          })}
        </ul>
        <div className="row-buttons">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => set('ingredients', [...form.ingredients, emptyIngredient()])}>
            <Icon name="plus" size={16} /> Zutat hinzufügen
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBulk((b) => ({ ...b, ingredients: b.ingredients === null ? '' : null }))}>
            <Icon name="note" size={16} /> Aus Text einfügen
          </button>
        </div>
        {bulk.ingredients !== null && (
          <div className="bulk">
            <textarea rows={5} autoFocus value={bulk.ingredients} onChange={(e) => setBulk((b) => ({ ...b, ingredients: e.target.value }))} placeholder={'Eine Zutat pro Zeile, z. B.\n200 g Spaghetti\n2 EL Olivenöl\nSalz nach Geschmack'} />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => applyBulk('ingredients')}>Übernehmen & prüfen</button>
          </div>
        )}
      </Section>

      <Section number="5" title="Zubereitung" hint="Möglichst ein klarer Arbeitsschritt pro Feld.">
        <ol className="edit-list">
          {form.steps.map((s, i) => (
            <li key={s.id} className="step-edit">
              <span className="step-num static">{i + 1}</span>
              <textarea rows={2} value={s.text} onChange={(e) => updateItem('steps', s.id, { text: e.target.value })} placeholder={`Schritt ${i + 1} beschreiben …`} aria-label={`Schritt ${i + 1}`} />
              <div className="step-tools">
                <button type="button" className="icon-btn sm" onClick={() => moveItem('steps', i, -1)} disabled={i === 0} aria-label="Nach oben"><Icon name="chevronUp" size={16} /></button>
                <button type="button" className="icon-btn sm" onClick={() => moveItem('steps', i, 1)} disabled={i === form.steps.length - 1} aria-label="Nach unten"><Icon name="chevronDown" size={16} /></button>
                <button type="button" className="icon-btn sm" onClick={() => removeItem('steps', s.id)} aria-label={`Schritt ${i + 1} entfernen`}><Icon name="x" size={16} /></button>
              </div>
            </li>
          ))}
        </ol>
        <div className="row-buttons">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => set('steps', [...form.steps, emptyStep()])}>
            <Icon name="plus" size={16} /> Schritt hinzufügen
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBulk((b) => ({ ...b, steps: b.steps === null ? '' : null }))}>
            <Icon name="note" size={16} /> Aus Text einfügen
          </button>
        </div>
        {bulk.steps !== null && (
          <div className="bulk">
            <textarea rows={5} autoFocus value={bulk.steps} onChange={(e) => setBulk((b) => ({ ...b, steps: e.target.value }))} placeholder={'Ein Schritt pro Zeile …'} />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => applyBulk('steps')}>Übernehmen & prüfen</button>
          </div>
        )}
      </Section>

      <Section number="6" title="Notizen, Tipps & Allergene">
        <label className="field">
          <span className="label">Notizen und Tipps</span>
          <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Varianten, Tipps oder Fehler, die du nächstes Mal vermeiden möchtest …" />
        </label>
        <div className="field">
          <span className="label">Allergene (optional, eigene Angabe)</span>
          <div className="chip-row wrap">
            {ALLERGENS.map((a) => (
              <button type="button" key={a} className={`chip chip-sm ${form.allergens.includes(a) ? 'active warn' : ''}`} onClick={() => toggleAllergen(a)} aria-pressed={form.allergens.includes(a)}>
                {form.allergens.includes(a) && <Icon name="check" size={13} strokeWidth={3} />} {a}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <div className="form-footer">
        <span className="muted small">{dirty ? 'Ungespeicherte Änderungen' : 'Keine Änderungen'}</span>
        <div className="form-footer-actions">
          <button type="button" className="btn btn-ghost" onClick={cancel}>Abbrechen</button>
          <button type="submit" className="btn btn-primary"><Icon name="check" size={18} /> Speichern</button>
        </div>
      </div>

      {newCategory && (
        <CategoryEditor
          onClose={() => setNewCategory(false)}
          onSaved={(cid) => setForm((f) => ({ ...f, categoryIds: [...f.categoryIds, cid] }))}
        />
      )}
    </form>
  );
}
