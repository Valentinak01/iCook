import { useEffect } from 'react';
import Layout from './components/Layout.jsx';
import { ToastHost } from './components/ui.jsx';
import { StoreProvider, useStore } from './store.jsx';
import { useLocation, matchRoute } from './router.jsx';
import HomePage from './pages/HomePage.jsx';
import RecipesPage from './pages/RecipesPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import ShoppingListPage from './pages/ShoppingListPage.jsx';
import SettingsPage, { ACCENTS } from './pages/SettingsPage.jsx';
import RecipeDetailPage from './pages/RecipeDetailPage.jsx';
import RecipeFormPage from './pages/RecipeFormPage.jsx';
import CookingModePage from './pages/CookingModePage.jsx';
import { EmptyState } from './components/ui.jsx';
import { Link } from './router.jsx';

function Routes({ path, query }) {
  let m;
  if (path === '/') return <HomePage />;
  if (path === '/rezepte') return <RecipesPage query={query} />;
  if (path === '/favoriten') return <RecipesPage query={query} favoritesOnly key="fav" />;
  if (path === '/kategorien') return <CategoriesPage />;
  if (path === '/einkaufsliste') return <ShoppingListPage />;
  if (path === '/einstellungen') return <SettingsPage />;
  if (path === '/neu') return <RecipeFormPage key="new" />;
  if ((m = matchRoute('/rezept/:id/bearbeiten', path))) return <RecipeFormPage key={m.id} id={m.id} />;
  if ((m = matchRoute('/rezept/:id', path))) return <RecipeDetailPage key={m.id} id={m.id} />;
  return (
    <div className="page">
      <EmptyState icon="alert" title="Seite nicht gefunden" action={<Link to="/" className="btn btn-primary">Zur Startseite</Link>} />
    </div>
  );
}

function Shell() {
  const { path, query } = useLocation();
  const { settings } = useStore();

  // Akzentfarbe als CSS-Variablen setzen
  useEffect(() => {
    const a = ACCENTS[settings.accent] || ACCENTS.olive;
    document.documentElement.style.setProperty('--accent', a.color);
    document.documentElement.style.setProperty('--accent-ink', a.ink);
    // gefüllte Flächen: eigener Verlauf, falls definiert, sonst die Akzentfarbe
    document.documentElement.style.setProperty('--accent-fill', a.fill || a.color);
    document.documentElement.style.setProperty('--accent-glow', a.glow || a.color);
  }, [settings.accent]);

  const cook = matchRoute('/rezept/:id/kochen', path);

  return (
    <>
      {cook ? (
        <CookingModePage id={cook.id} query={query} />
      ) : (
        <Layout path={path}>
          <Routes path={path} query={query} />
        </Layout>
      )}
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
