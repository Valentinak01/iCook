import Icon from './Icon.jsx';
import { RecipeImage } from './ui.jsx';
import { Link } from '../router.jsx';
import { useStore } from '../store.jsx';
import { totalTime, formatMinutes, capitalize } from '../utils.js';

export default function RecipeCard({ recipe, layout = 'grid' }) {
  const { categories, toggleFavorite } = useStore();
  const cats = recipe.categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean)
    .slice(0, layout === 'list' ? 4 : 2);

  return (
    <article className={`recipe-card ${layout}`}>
      <Link to={`/rezept/${recipe.id}`} className="card-link" aria-label={recipe.title}>
        <div className="card-media">
          <RecipeImage recipe={recipe} />
          <div className="card-badges">
            <span className="card-badge"><Icon name="clock" size={13} /> {formatMinutes(totalTime(recipe))}</span>
            {recipe.difficulty && <span className="card-badge">{capitalize(recipe.difficulty)}</span>}
          </div>
        </div>
        <div className="card-body">
          <h3 className="card-title">{recipe.title}</h3>
          {layout === 'list' && recipe.description && <p className="card-desc muted">{recipe.description}</p>}
          <div className="card-tags">
            {cats.map((c) => (
              <span key={c.id} className="mini-tag">
                <span className="dot" style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
          <div className="card-meta">
            <span><Icon name="users" size={15} /> {recipe.servings} {recipe.servings === 1 ? 'Portion' : 'Portionen'}</span>
            {recipe.rating > 0 && (
              <span className="rating-mini"><Icon name="star" size={14} filled /> {recipe.rating}</span>
            )}
          </div>
        </div>
      </Link>
      <button
        className={`fav-btn ${recipe.favorite ? 'on' : ''}`}
        onClick={() => toggleFavorite(recipe.id)}
        aria-label={recipe.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        aria-pressed={recipe.favorite}
      >
        <Icon name="heart" size={18} filled={recipe.favorite} />
      </button>
    </article>
  );
}
