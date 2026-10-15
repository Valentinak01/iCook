import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import { CategoryTag, EmptyState, PageHeader } from '../components/ui.jsx';
import { Link, navigate } from '../router.jsx';
import { useStore } from '../store.jsx';
import { normalize, totalTime, DIFFICULTIES, capitalize } from '../utils.js';

const TIME_FILTERS = [
  { value: 0, label: 'Egal' },
  { value: 15, label: '≤ 15 Min.' },
  { value: 30, label: '≤ 30 Min.' },
  { value: 60, label: '≤ 60 Min.' },
];

const SORTS = [
  { value: 'new', label: 'Zuletzt hinzugefügt' },
  { value: 'alpha', label: 'Alphabetisch (A–Z)' },
  { value: 'used', label: 'Zuletzt verwendet' },
  { value: 'time', label: 'Schnellste zuerst' },
  { value: 'rating', label: 'Beste Bewertung' },
];

export default function RecipesPage({ query, favoritesOnly = false }) {
  const { recipes, categories, settings, updateSettings } = useStore();

  const [q, setQ] = useState(query.get('q') || '');
  const [mode, setMode] = useState('title'); // title | ingredients
  const [selected, setSelected] = useState(query.get('kat') ? query.get('kat').split(',') : []);
  const [maxTime, setMaxTime] = useState(Number(query.get('zeit')) || 0);
  const [difficulty, setDifficulty] = useState('');
  const [onlyFav, setOnlyFav] = useState(favoritesOnly || query.get('fav') === '1');
  const [sort, setSort] = useState(query.get('sort') || 'new');
  const [showFilters, setShowFilters] = useState(false);

  // Wenn sich die URL (z. B. über die Startseite) ändert, Filter übernehmen
  const qs = query.toString();
  useEffect(() => {
    setQ(query.get('q') || '');
    setSelected(query.get('kat') ? query.get('kat').split(',') : []);
    if (query.get('sort')) setSort(query.get('sort'));
    if (query.get('zeit')) setMaxTime(Number(query.get('zeit')) || 0);
  }, [qs]);

  const groups = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    });
    return [...map.entries()];
  }, [categories]);

  const results = useMemo(() => {
    const terms = mode === 'ingredients'
      ? q.split(/[,;]+/).map(normalize).filter(Boolean)
      : [normalize(q)].filter(Boolean);

    let list = recipes.filter((r) => {
      if (onlyFav && !r.favorite) return false;
      if (selected.length && !selected.every((id) => r.categoryIds.includes(id))) return false;
      if (maxTime && (totalTime(r) === 0 || totalTime(r) > maxTime)) return false;
      if (difficulty && r.difficulty !== difficulty) return false;
      if (!terms.length) return true;
      if (mode === 'ingredients') {
        const names = r.ingredients.map((i) => normalize(i.name));
        return terms.every((t) => names.some((n) => n.includes(t)));
      }
      const catNames = r.categoryIds.map((id) => categories.find((c) => c.id === id)?.name || '').join(' ');
      const haystack = normalize(`${r.title} ${r.description} ${catNames}`);
      return terms.every((t) => haystack.includes(t));
    });

    const sorters = {
      new: (a, b) => b.createdAt - a.createdAt,
      alpha: (a, b) => a.title.localeCompare(b.title, 'de'),
      used: (a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0),
      time: (a, b) => (totalTime(a) || 999) - (totalTime(b) || 999),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    };
    return [...list].sort(sorters[sort] || sorters.new);
  }, [recipes, categories, q, mode, selected, maxTime, difficulty, onlyFav, sort]);

  const toggleCategory = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const activeFilterCount = selected.length + (maxTime ? 1 : 0) + (difficulty ? 1 : 0) + (onlyFav && !favoritesOnly ? 1 : 0);

  const reset = () => {
    setQ(''); setSelected([]); setMaxTime(0); setDifficulty('');
    if (!favoritesOnly) setOnlyFav(false);
  };

  const surprise = () => {
    if (!results.length) return;
    navigate(`/rezept/${results[Math.floor(Math.random() * results.length)].id}`);
  };

  const view = settings.view;

  return (
    <div className="page">
      <PageHeader
        title={favoritesOnly ? 'Favoriten' : 'Alle Rezepte'}
        subtitle={favoritesOnly ? 'Deine Lieblingsgerichte für den schnellen Zugriff.' : 'Durchsuche und filtere deine Sammlung.'}
        actions={
          <button className="btn btn-outline" onClick={surprise} disabled={!results.length}>
            <Icon name="shuffle" size={17} /> Überrasch mich
          </button>
        }
      />

      <div className="toolbar">
        <div className="search-bar">
          <Icon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === 'ingredients' ? 'Zutaten, mit Komma getrennt: Eier, Tomaten …' : 'Titel, Beschreibung oder Kategorie …'}
            aria-label="Suche"
          />
          {q && (
            <button className="icon-btn sm" onClick={() => setQ('')} aria-label="Suche leeren"><Icon name="x" size={16} /></button>
          )}
        </div>
        <div className="segmented" role="group" aria-label="Suchmodus">
          <button className={mode === 'title' ? 'active' : ''} onClick={() => setMode('title')}>Rezepte</button>
          <button className={mode === 'ingredients' ? 'active' : ''} onClick={() => setMode('ingredients')}>Ich habe …</button>
        </div>
        <button className={`btn btn-outline ${showFilters ? 'is-on' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <Icon name="filter" size={16} /> Filter {activeFilterCount > 0 && <span className="badge inline">{activeFilterCount}</span>}
        </button>
        <select className="select-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortierung">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="segmented" role="group" aria-label="Ansicht">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => updateSettings({ view: 'grid' })} aria-label="Kartenansicht"><Icon name="grid" size={17} /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => updateSettings({ view: 'list' })} aria-label="Listenansicht"><Icon name="list" size={17} /></button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          {groups.map(([group, cats]) => (
            <div key={group} className="filter-group">
              <span className="label">{group}</span>
              <div className="chip-row wrap">
                {cats.map((c) => (
                  <CategoryTag key={c.id} category={c} small active={selected.includes(c.id)} onClick={() => toggleCategory(c.id)} />
                ))}
              </div>
            </div>
          ))}
          <div className="filter-inline">
            <div className="filter-group">
              <span className="label">Gesamtzeit</span>
              <div className="segmented">
                {TIME_FILTERS.map((t) => (
                  <button key={t.value} className={maxTime === t.value ? 'active' : ''} onClick={() => setMaxTime(t.value)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="label">Schwierigkeit</span>
              <div className="segmented">
                <button className={!difficulty ? 'active' : ''} onClick={() => setDifficulty('')}>Alle</button>
                {DIFFICULTIES.map((d) => (
                  <button key={d} className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)}>{capitalize(d)}</button>
                ))}
              </div>
            </div>
            {!favoritesOnly && (
              <label className="toggle">
                <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />
                <span className="toggle-ui" /> Nur Favoriten
              </label>
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="active-filters">
          <span className="muted small">Gefiltert nach:</span>
          {selected.map((id) => {
            const c = categories.find((x) => x.id === id);
            return c ? (
              <button key={id} className="chip chip-sm active removable" style={{ '--chip-color': c.color }} onClick={() => toggleCategory(id)}>
                {c.icon} {c.name} <Icon name="x" size={13} />
              </button>
            ) : null;
          })}
        </div>
      )}

      <p className="result-count muted small" aria-live="polite">
        {results.length} {results.length === 1 ? 'Rezept' : 'Rezepte'} gefunden
        {(q || activeFilterCount > 0) && (
          <button className="link-btn" onClick={reset}>Filter zurücksetzen</button>
        )}
      </p>

      {results.length ? (
        <div className={view === 'list' ? 'recipe-list' : 'recipe-grid'}>
          {results.map((r) => <RecipeCard key={r.id} recipe={r} layout={view} />)}
        </div>
      ) : favoritesOnly && !recipes.some((r) => r.favorite) ? (
        <EmptyState
          icon="heart"
          title="Noch keine Favoriten"
          text="Tippe auf das Herz bei einem Rezept, um es hier zu sammeln."
          action={<Link to="/rezepte" className="btn btn-primary">Rezepte entdecken</Link>}
        />
      ) : (
        <EmptyState
          icon="search"
          title="Keine passenden Rezepte"
          text="Versuche einen anderen Suchbegriff oder entferne Filter."
          action={<button className="btn btn-outline" onClick={reset}>Filter zurücksetzen</button>}
        />
      )}
    </div>
  );
}
