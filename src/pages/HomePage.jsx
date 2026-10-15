import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import { RecipeImage, EmptyState } from '../components/ui.jsx';
import { Link, navigate } from '../router.jsx';
import { useStore } from '../store.jsx';
import { totalTime, formatMinutes, capitalize } from '../utils.js';

const QUICK_MINUTES = 30;
const MS_PER_DAY = 86400000;

function Shelf({ title, subtitle, link, recipes }) {
  if (!recipes.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        {link && <Link to={link} className="link">Alle ansehen <Icon name="chevronRight" size={15} /></Link>}
      </div>
      <div className="shelf">
        {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>
    </section>
  );
}

// Jeden Tag ein anderes Rezept – innerhalb eines Tages stabil
function recipeOfTheDay(recipes) {
  if (!recipes.length) return null;
  const sorted = [...recipes].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[Math.floor(Date.now() / MS_PER_DAY) % sorted.length];
}

export default function HomePage() {
  const { recipes, categories } = useStore();
  const [q, setQ] = useState('');

  const isQuick = (r) => totalTime(r) > 0 && totalTime(r) <= QUICK_MINUTES;
  const favorites = recipes.filter((r) => r.favorite).slice(0, 10);
  const quick = recipes.filter(isQuick).sort((a, b) => totalTime(a) - totalTime(b)).slice(0, 10);
  const untried = recipes.filter((r) => !r.lastUsedAt).slice(0, 10);
  const newest = [...recipes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  const today = recipeOfTheDay(recipes);

  // Kategorien mit den meisten Rezepten als Kacheln
  const counts = new Map();
  recipes.forEach((r) => r.categoryIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
  const tiles = categories
    .filter((c) => counts.has(c.id))
    .sort((a, b) => counts.get(b.id) - counts.get(a.id))
    .slice(0, 8);

  const vegetarian = categories.find((c) => /vegetar/i.test(c.name));

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/rezepte?q=${encodeURIComponent(q.trim())}` : '/rezepte');
  };

  const surprise = () => {
    if (!recipes.length) return;
    const r = recipes[Math.floor(Math.random() * recipes.length)];
    navigate(`/rezept/${r.id}`);
  };

  return (
    <div className="page home">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow greeting">Hallo Chef! <Icon name="chef" size={18} /></p>
          <h1 className="hero-title">Was kochen wir <em>heute</em>?</h1>
          <p className="hero-sub">
            Deine Lieblingsrezepte an einem Ort – mit Portionsrechner, Einkaufsliste und einem Kochmodus,
            der dich Schritt für Schritt begleitet.
          </p>

          <form className="search-bar big" onSubmit={submit} role="search">
            <Icon name="search" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rezept, Zutat oder Kategorie suchen …"
              aria-label="Rezepte durchsuchen"
            />
            <button type="submit" className="btn btn-primary btn-sm">Suchen</button>
          </form>

          <div className="quick-row" aria-label="Schnellauswahl">
            <Link to={`/rezepte?zeit=${QUICK_MINUTES}`} className="quick-chip"><Icon name="flame" size={15} /> Unter {QUICK_MINUTES} Min.</Link>
            {vegetarian && (
              <Link to={`/rezepte?kat=${vegetarian.id}`} className="quick-chip"><span aria-hidden="true">{vegetarian.icon}</span> {vegetarian.name}</Link>
            )}
            <Link to="/favoriten" className="quick-chip"><Icon name="heart" size={15} /> Favoriten</Link>
            <button type="button" className="quick-chip" onClick={surprise} disabled={!recipes.length}>
              <Icon name="shuffle" size={15} /> Überrasch mich
            </button>
          </div>

          {recipes.length > 0 && (
            <dl className="stat-row">
              <div className="stat"><dt>Rezepte</dt><dd>{recipes.length}</dd></div>
              <div className="stat"><dt>Favoriten</dt><dd>{recipes.filter((r) => r.favorite).length}</dd></div>
              <div className="stat"><dt>In ≤ {QUICK_MINUTES} Min.</dt><dd>{recipes.filter(isQuick).length}</dd></div>
            </dl>
          )}
        </div>

        {today && (
          <article className="today-card">
            <Link to={`/rezept/${today.id}`} className="today-media" aria-label={today.title}>
              <RecipeImage recipe={today} />
              <span className="today-label"><Icon name="sun" size={14} /> Rezept des Tages</span>
            </Link>
            <div className="today-body">
              <h2><Link to={`/rezept/${today.id}`}>{today.title}</Link></h2>
              {today.description && <p className="muted">{today.description}</p>}
              <div className="meta-pills">
                <span className="meta-pill"><Icon name="clock" size={14} /> {formatMinutes(totalTime(today))}</span>
                {today.difficulty && <span className="meta-pill"><Icon name="chef" size={14} /> {capitalize(today.difficulty)}</span>}
                <span className="meta-pill"><Icon name="users" size={14} /> {today.servings} Portionen</span>
              </div>
              <div className="today-actions">
                <Link to={`/rezept/${today.id}/kochen`} className="btn btn-primary"><Icon name="play" size={16} /> Jetzt kochen</Link>
                <Link to={`/rezept/${today.id}`} className="btn btn-outline">Rezept ansehen</Link>
              </div>
            </div>
          </article>
        )}
      </section>

      {!recipes.length && (
        <EmptyState
          icon="chef"
          title="Dein Rezeptbuch ist noch leer"
          text="Lege dein erstes Lieblingsrezept an – mit Foto, Zutaten und Schritten."
          action={<Link to="/neu" className="btn btn-primary"><Icon name="plus" size={18} /> Rezept hinzufügen</Link>}
        />
      )}

      {tiles.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Worauf hast du Lust?</h2>
              <p className="section-sub">Stöbere nach Küche, Mahlzeit oder Stimmung.</p>
            </div>
            <Link to="/kategorien" className="link">Alle Kategorien <Icon name="chevronRight" size={15} /></Link>
          </div>
          <div className="tile-grid">
            {tiles.map((c) => (
              <Link key={c.id} to={`/rezepte?kat=${c.id}`} className="cat-tile" style={{ '--tile': c.color }}>
                <span className="cat-tile-icon" aria-hidden="true">{c.icon}</span>
                <span className="cat-tile-name">{c.name}</span>
                <span className="cat-tile-count">{counts.get(c.id)} {counts.get(c.id) === 1 ? 'Rezept' : 'Rezepte'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Shelf title="Schnell gemacht" subtitle={`Fertig in höchstens ${QUICK_MINUTES} Minuten – perfekt nach Uni oder Job.`} link={`/rezepte?zeit=${QUICK_MINUTES}`} recipes={quick} />
      <Shelf title="Deine Favoriten" subtitle="Die Gerichte, die immer gehen." link="/favoriten" recipes={favorites} />

      {today && (
        <section className="promo">
          <div className="promo-copy">
            <span className="promo-icon"><Icon name="play" size={20} /></span>
            <div>
              <h2>Handy hin, Kochmodus an.</h2>
              <p>Großer Text, ein Schritt nach dem anderen und der Bildschirm bleibt an – auch mit Teig an den Fingern.</p>
            </div>
          </div>
          <Link to={`/rezept/${today.id}/kochen`} className="btn btn-primary btn-lg">Kochmodus ausprobieren</Link>
        </section>
      )}

      <Shelf title="Probier mal was Neues" subtitle="Diese Rezepte hast du noch nicht geöffnet." link="/rezepte" recipes={untried} />
      <Shelf title="Neu hinzugefügt" link="/rezepte?sort=new" recipes={newest} />
    </div>
  );
}
