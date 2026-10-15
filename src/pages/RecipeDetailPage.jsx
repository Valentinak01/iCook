import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import ImageFramer from '../components/ImageFramer.jsx';
import { CategoryTag, ConfirmDialog, EmptyState, RecipeImage, Stars, Stepper } from '../components/ui.jsx';
import { Link, lastPathOutside, navigate } from '../router.jsx';
import { useStore } from '../store.jsx';
import { formatMinutes, prettyAmount, recipeToText, resizeImage, scaledAmount, totalTime } from '../utils.js';

export default function RecipeDetailPage({ id }) {
  const { recipes, categories, settings, toggleFavorite, updateRecipe, deleteRecipe, duplicateRecipe, markUsed, addRecipesToShopping, toast } = useStore();
  const recipe = recipes.find((r) => r.id === id);

  const [servings, setServings] = useState(recipe?.servings || 2);
  const [checked, setChecked] = useState({});
  const [doneSteps, setDoneSteps] = useState({});
  const [experience, setExperience] = useState(recipe?.experience || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [favPulse, setFavPulse] = useState(false);
  const [confirmImageRemove, setConfirmImageRemove] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [framing, setFraming] = useState(null); // { src, initial, isNew }
  const fileRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!recipe) return;
    markUsed(id);
    setServings(recipe.servings);
    setChecked({});
    setDoneSteps({});
    setExperience(recipe.experience || '');
  }, [id]);

  if (!recipe) {
    return (
      <div className="page">
        <EmptyState icon="alert" title="Rezept nicht gefunden" text="Vielleicht wurde es gelöscht." action={<Link to="/rezepte" className="btn btn-primary">Zur Übersicht</Link>} />
      </div>
    );
  }

  const factor = servings / recipe.servings;
  const cats = recipe.categoryIds.map((cid) => categories.find((c) => c.id === cid)).filter(Boolean);

  const fav = () => {
    toggleFavorite(recipe.id);
    setFavPulse(true);
    setTimeout(() => setFavPulse(false), 450);
    toast(recipe.favorite ? 'Aus Favoriten entfernt' : 'Zu Favoriten hinzugefügt');
  };

  const share = async () => {
    const text = recipeToText(recipe, categories);
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast('Rezept als Text in die Zwischenablage kopiert');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Teilen nicht möglich', 'error');
    }
  };

  const duplicate = () => {
    const newId = duplicateRecipe(recipe.id);
    toast('Rezept dupliziert');
    navigate(`/rezept/${newId}/bearbeiten`);
  };

  const remove = () => {
    deleteRecipe(recipe.id);
    toast(`„${recipe.title}“ gelöscht`);
    navigate('/rezepte', { replace: true });
  };

  const toShopping = () => {
    addRecipesToShopping([{ recipe, servings }]);
    toast(`Zutaten für ${servings} Portionen zur Einkaufsliste hinzugefügt`);
  };

  const saveExperience = () => {
    updateRecipe(recipe.id, { experience });
    toast('Notiz gespeichert');
  };

  // Foto direkt auf der Detailseite hinzufügen, ändern oder entfernen.
  // Neue Fotos werden erst gespeichert, nachdem der Ausschnitt gewählt wurde.
  const setImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Bitte eine Bilddatei wählen', 'error');
    setImageBusy(true);
    try {
      setFraming({ src: await resizeImage(file), initial: null, isNew: true });
    } catch {
      toast('Bild konnte nicht gelesen werden', 'error');
    }
    setImageBusy(false);
  };

  const saveFrame = (frame) => {
    const hadImage = !!recipe.image;
    updateRecipe(recipe.id, { image: framing.src, imageFrame: frame });
    toast(!framing.isNew ? 'Ausschnitt gespeichert' : hadImage ? 'Foto geändert' : 'Foto hinzugefügt');
    setFraming(null);
  };

  // Seitenverhältnis des Titelbilds und der vom Textfeld verdeckte Anteil – für eine genaue Vorschau
  const heroBox = () => {
    const el = heroRef.current;
    if (!el) return { aspect: 2.4, coverBottom: 0 };
    const { width, height } = el.getBoundingClientRect();
    const overlap = parseFloat(getComputedStyle(el.parentElement).getPropertyValue('--overlap')) || 0;
    return { aspect: width / height, coverBottom: overlap / height };
  };

  const onImageInput = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImage(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setImage(e.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    updateRecipe(recipe.id, { image: null, imageFrame: null });
    setConfirmImageRemove(false);
    toast('Foto entfernt');
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="page detail">
      <div
        ref={heroRef}
        className={`detail-hero ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
        onDrop={onDrop}
      >
        <RecipeImage recipe={recipe} className="hero-main" />
        <div className="hero-shade" />
        {!recipe.image && (
          <button className="btn hero-add-image" onClick={() => fileRef.current.click()} disabled={imageBusy}>
            <Icon name="image" size={18} /> {imageBusy ? 'Wird geladen …' : 'Foto hinzufügen'}
          </button>
        )}
        {dragOver && (
          <div className="hero-drop">
            <Icon name="upload" size={30} />
            <span>Foto hier ablegen</span>
          </div>
        )}
        <div className="hero-top">
          <button className="icon-btn glass" onClick={() => navigate(lastPathOutside(`/rezept/${recipe.id}`, '/rezepte'))} aria-label="Zurück">
            <Icon name="arrowLeft" />
          </button>
          <div className="hero-tools">
            {recipe.image && (
              <>
                <button className="icon-btn glass" onClick={() => setFraming({ src: recipe.image, initial: recipe.imageFrame, isNew: false })} aria-label="Ausschnitt anpassen" title="Ausschnitt anpassen">
                  <Icon name="move" />
                </button>
                <button className="icon-btn glass" onClick={() => fileRef.current.click()} disabled={imageBusy} aria-label="Foto ändern" title="Foto ändern">
                  <Icon name="image" />
                </button>
                <button className="icon-btn glass danger" onClick={() => setConfirmImageRemove(true)} aria-label="Foto entfernen" title="Foto entfernen">
                  <Icon name="trash" />
                </button>
              </>
            )}
            <button className={`icon-btn glass fav-big ${recipe.favorite ? 'on' : ''} ${favPulse ? 'pulse' : ''}`} onClick={fav} aria-pressed={recipe.favorite} aria-label={recipe.favorite ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'}>
              <Icon name="heart" filled={recipe.favorite} />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImageInput} />
      </div>

      <div className="detail-sheet">
      <div className="detail-scroll">
      <div className="detail-content">
        <div className="detail-title">
          <h1>{recipe.title}</h1>
          {recipe.rating > 0 && <Stars value={recipe.rating} size={16} />}
        </div>

        {cats.length > 0 && (
          <div className="chip-row wrap">
            {cats.map((c) => <CategoryTag key={c.id} category={c} small onClick={() => navigate(`/rezepte?kat=${c.id}`)} />)}
          </div>
        )}

        {recipe.description && <p className="lead">{recipe.description}</p>}

        <div className="facts">
          <div className="fact"><Icon name="users" /><span className="fact-label">Portionen</span><strong>{recipe.servings}</strong></div>
          <div className="fact"><Icon name="clock" /><span className="fact-label">Vorbereitung</span><strong>{formatMinutes(recipe.prepTime)}</strong></div>
          <div className="fact"><Icon name="flame" /><span className="fact-label">Kochzeit</span><strong>{formatMinutes(recipe.cookTime)}</strong></div>
          <div className="fact"><Icon name="clock" /><span className="fact-label">Gesamt</span><strong>{formatMinutes(totalTime(recipe))}</strong></div>
          {recipe.difficulty && <div className="fact"><Icon name="chef" /><span className="fact-label">Schwierigkeit</span><strong className="cap">{recipe.difficulty}</strong></div>}
        </div>

        <div className="action-bar">
          <Link to={`/rezept/${recipe.id}/kochen?portionen=${servings}`} className="btn btn-primary btn-lg">
            <Icon name="play" size={18} /> Kochmodus starten
          </Link>
          <Link to={`/rezept/${recipe.id}/bearbeiten`} className="btn btn-outline"><Icon name="edit" size={17} /> Bearbeiten</Link>
          <button className="btn btn-outline" onClick={duplicate}><Icon name="copy" size={17} /> Duplizieren</button>
          <button className="btn btn-outline" onClick={share}><Icon name="share" size={17} /> Teilen</button>
          <button className="btn btn-outline danger-text" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={17} /> Löschen</button>
        </div>

        <div className="detail-grid">
          <section className="card ingredients">
            <div className="section-head">
              <h2>Zutaten</h2>
              <Stepper value={servings} onChange={setServings} label="Portionen" />
            </div>
            <p className="muted small servings-note">
              für {servings} {servings === 1 ? 'Portion' : 'Portionen'}
              {servings !== recipe.servings && (
                <> · <button className="link-btn" onClick={() => setServings(recipe.servings)}>auf {recipe.servings} zurücksetzen</button></>
              )}
            </p>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing) => {
                const amount = prettyAmount(scaledAmount(ing, factor), ing.unit, settings.convertUnits);
                return (
                  <li key={ing.id} className={checked[ing.id] ? 'checked' : ''}>
                    <label className="check-row">
                      <input type="checkbox" checked={!!checked[ing.id]} onChange={() => setChecked((c) => ({ ...c, [ing.id]: !c[ing.id] }))} />
                      <span className="checkbox-ui"><Icon name="check" size={14} strokeWidth={3} /></span>
                      <span className="ing-amount">{amount}</span>
                      <span className="ing-name">{ing.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {checkedCount > 0 && <p className="muted small">{checkedCount} von {recipe.ingredients.length} bereitgelegt</p>}
            <button className="btn btn-outline btn-block" onClick={toShopping}>
              <Icon name="cart" size={17} /> Zur Einkaufsliste
            </button>
            {recipe.allergens?.length > 0 && (
              <div className="allergens">
                <span className="label">Enthält möglicherweise</span>
                <div className="chip-row wrap">
                  {recipe.allergens.map((a) => <span key={a} className="chip chip-sm warn">{a}</span>)}
                </div>
                <p className="muted tiny">Eigene Angaben ohne Gewähr – keine medizinische Aussage. Bitte Zutaten selbst prüfen.</p>
              </div>
            )}
          </section>

          <section className="card steps">
            <h2>Zubereitung</h2>
            <ol className="step-list">
              {recipe.steps.map((s, i) => (
                <li key={i} className={doneSteps[i] ? 'done' : ''}>
                  <button className="step-num" onClick={() => setDoneSteps((d) => ({ ...d, [i]: !d[i] }))} aria-label={`Schritt ${i + 1} als erledigt markieren`} aria-pressed={!!doneSteps[i]}>
                    {doneSteps[i] ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}
                  </button>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
            {!recipe.steps.length && <p className="muted">Noch keine Schritte hinterlegt.</p>}
          </section>
        </div>

        <div className="detail-grid">
          {recipe.notes && (
            <section className="card notes">
              <h2><Icon name="note" size={19} /> Notizen & Tipps</h2>
              <p className="pre">{recipe.notes}</p>
            </section>
          )}
          <section className="card experience">
            <h2>Meine Erfahrung</h2>
            <div className="rating-row">
              <span className="muted small">Bewertung</span>
              <Stars value={recipe.rating || 0} onChange={(v) => updateRecipe(recipe.id, { rating: v })} />
            </div>
            <textarea
              rows={3}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="z. B. „Beim nächsten Mal mehr Knoblauch“"
              aria-label="Eigene Erfahrung"
            />
            <button className="btn btn-outline btn-sm" onClick={saveExperience} disabled={experience === (recipe.experience || '')}>
              Notiz speichern
            </button>
          </section>
        </div>
      </div>
      </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Rezept löschen?"
          message={`„${recipe.title}“ wird dauerhaft aus deinem Rezeptbuch entfernt.`}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {framing && (
        <ImageFramer
          src={framing.src}
          initial={framing.initial}
          {...heroBox()}
          title={framing.isNew ? 'Foto ausrichten' : 'Bildausschnitt anpassen'}
          onSave={saveFrame}
          onCancel={() => setFraming(null)}
        />
      )}

      {confirmImageRemove && (
        <ConfirmDialog
          title="Foto entfernen?"
          message={`Das Foto von „${recipe.title}“ wird entfernt. Das Rezept selbst bleibt erhalten.`}
          confirmLabel="Entfernen"
          onConfirm={removeImage}
          onCancel={() => setConfirmImageRemove(false)}
        />
      )}
    </div>
  );
}
