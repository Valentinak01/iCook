import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { LoadingState, Stars } from '../components/ui.jsx';
import { navigate, previousPath } from '../router.jsx';
import { useStore } from '../store.jsx';
import { prettyAmount, scaledAmount } from '../utils.js';

// Ablenkungsfreie Schritt-für-Schritt-Ansicht mit großer Schrift
export default function CookingModePage({ id, query }) {
  const { recipes, settings, updateRecipe, toast, loading } = useStore();
  const recipe = recipes.find((r) => r.id === id);
  const servings = Number(query.get('portionen')) || recipe?.servings || 1;
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [awake, setAwake] = useState(false);

  const total = recipe ? recipe.steps.length : 0;
  const finished = step >= total;
  // Kam man von der Detailseite, dorthin zurückkehren statt einen neuen Verlaufseintrag anzulegen
  const exit = () => (previousPath() === `/rezept/${id}` ? history.back() : navigate(`/rezept/${id}`, { replace: true }));

  // Bildschirm aktiv halten (Wake Lock API, falls vom Browser unterstützt)
  useEffect(() => {
    if (!settings.keepAwake || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release();
        else setAwake(true);
        lock.addEventListener?.('release', () => setAwake(false));
      } catch { setAwake(false); }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [settings.keepAwake]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setStep((s) => Math.min(total, s + 1)); }
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
      if (e.key === 'Escape') exit();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [total]);

  if (!recipe) return loading ? <div className="cook-mode"><LoadingState /></div> : null;
  const factor = servings / recipe.servings;
  const progress = total ? Math.min(100, (step / total) * 100) : 100;

  return (
    <div className="cook-mode">
      <header className="cook-head">
        <button className="icon-btn" onClick={exit} aria-label="Kochmodus beenden"><Icon name="x" /></button>
        <div className="cook-title">
          <span className="muted small">Kochmodus · {servings} Portionen</span>
          <strong>{recipe.title}</strong>
        </div>
        <button className={`btn btn-outline btn-sm ${showIngredients ? 'is-on' : ''}`} onClick={() => setShowIngredients((s) => !s)}>
          Zutaten
        </button>
      </header>
      <div className="cook-progress"><span style={{ width: `${progress}%` }} /></div>

      <div className="cook-body">
        {showIngredients && (
          <aside className="cook-ingredients">
            <h2>Zutaten</h2>
            <ul>
              {recipe.ingredients.map((ing) => (
                <li key={ing.id}>
                  <strong>{prettyAmount(scaledAmount(ing, factor), ing.unit, settings.convertUnits)}</strong> {ing.name}
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="cook-stage" key={step}>
          {!finished ? (
            <>
              <span className="cook-step-label">Schritt {step + 1} von {total}</span>
              <p className="cook-step-text">{recipe.steps[step]}</p>
            </>
          ) : (
            <div className="cook-done">
              <div className="cook-done-emoji">🎉</div>
              <h2>Guten Appetit!</h2>
              <p className="muted">Wie ist es geworden?</p>
              <Stars value={recipe.rating || 0} size={32} onChange={(v) => { updateRecipe(recipe.id, { rating: v }); toast('Bewertung gespeichert'); }} />
              <button className="btn btn-primary" onClick={exit}>Zurück zum Rezept</button>
            </div>
          )}
        </div>
      </div>

      <footer className="cook-foot">
        <button className="btn btn-outline btn-lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <Icon name="chevronLeft" /> Zurück
        </button>
        <span className="muted small awake">
          {settings.keepAwake && awake && <><Icon name="sun" size={14} /> Bildschirm bleibt aktiv</>}
        </span>
        {!finished && (
          <button className="btn btn-primary btn-lg" onClick={() => setStep((s) => Math.min(total, s + 1))}>
            {step === total - 1 ? 'Fertig' : 'Weiter'} <Icon name="chevronRight" />
          </button>
        )}
      </footer>
    </div>
  );
}
