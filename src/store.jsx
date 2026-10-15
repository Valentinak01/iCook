import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { sampleCategories, sampleRecipes } from './data/sampleData.js';
import { uid, loadJSON, saveJSON, scaledAmount, toBaseUnit, normalize } from './utils.js';
import { remote, isOnline } from './lib/remote.js';

// Rezepte, Kategorien und Fotos: mit Online-Datenbank (Supabase) für alle geteilt, sonst nur im Browser.
// Einkaufsliste, Einstellungen, Favoriten und „zuletzt angesehen“ bleiben immer persönlich im Browser.
const KEYS = {
  recipes: 'icook.recipes',
  categories: 'icook.categories',
  shopping: 'icook.shopping',
  settings: 'icook.settings',
  personal: 'icook.personal',
  cacheRecipes: 'icook.cache.recipes',
  cacheCategories: 'icook.cache.categories',
  legacyUploaded: 'icook.legacyUploaded',
};

export const DEFAULT_SETTINGS = {
  accent: 'olive',
  view: 'grid',
  convertUnits: true,
  keepAwake: true,
};

const StoreContext = createContext(null);

function usePersistent(key, initial, onError) {
  const [value, setValue] = useState(() => loadJSON(key, initial));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!saveJSON(key, value)) onError?.();
  }, [key, value]);
  return [value, setValue];
}

// Eintrag ersetzen oder (neu) vorne einfügen
const upsertById = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

// Neue Einträge hinten anhängen, vorhandene überschreiben – Reihenfolge bleibt erhalten
const mergeById = (list, incoming) => {
  const map = new Map(list.map((x) => [x.id, x]));
  incoming.forEach((x) => map.set(x.id, { ...map.get(x.id), ...x }));
  return [...map.values()];
};

const byPosition = (list) =>
  list.map((c, i) => [c, c.position ?? i]).sort((a, b) => a[1] - b[1]).map(([c]) => c);

export function StoreProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = uid();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const storageError = () => toast('Speicher voll – bitte große Bilder entfernen oder Daten exportieren.', 'error');
  const remoteError = () => toast('Speichern in der Online-Datenbank fehlgeschlagen – bitte Verbindung prüfen.', 'error');

  // Online wird der letzte Stand als Zwischenspeicher gehalten, damit die App sofort etwas zeigt
  const [recipeData, setRecipeData] = usePersistent(isOnline ? KEYS.cacheRecipes : KEYS.recipes, isOnline ? [] : sampleRecipes, storageError);
  const [categories, setCategoryData] = usePersistent(isOnline ? KEYS.cacheCategories : KEYS.categories, isOnline ? [] : sampleCategories, storageError);
  const [personal, setPersonal] = usePersistent(KEYS.personal, {}, storageError);
  const [shopping, setShopping] = usePersistent(KEYS.shopping, [], storageError);
  const [storedSettings, setSettings] = usePersistent(KEYS.settings, DEFAULT_SETTINGS, storageError);
  const [legacyUploaded, setLegacyUploaded] = usePersistent(KEYS.legacyUploaded, false, storageError);
  const [synced, setSynced] = useState(!isOnline);
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  // Rezepte aus der Zeit vor der Online-Datenbank, die nur in diesem Browser liegen
  const [legacy] = useState(() => (isOnline ? { recipes: loadJSON(KEYS.recipes, []), categories: loadJSON(KEYS.categories, []) } : null));
  const legacyCount = isOnline && !legacyUploaded && Array.isArray(legacy?.recipes) ? legacy.recipes.length : 0;

  // Refs halten immer den neuesten Stand – auch bei mehreren Änderungen kurz hintereinander
  const recipesRef = useRef(recipeData);
  const categoriesRef = useRef(categories);
  const commitRecipes = (next) => { recipesRef.current = next; setRecipeData(next); };
  const commitCategories = (next) => { categoriesRef.current = next; setCategoryData(next); };

  // Nach dem Speichern ersetzt der Foto-Link die lokale data:-URL
  const applySaved = (sent, saved) => {
    if (saved.image === sent.image) return;
    commitRecipes(recipesRef.current.map((x) => (x.id === sent.id && x.image === sent.image ? { ...x, image: saved.image } : x)));
  };

  const pushRecipe = (r) => {
    if (!isOnline) return;
    remote.saveRecipe(r).then((saved) => applySaved(r, saved)).catch(remoteError);
  };
  const pushCategories = () => {
    if (isOnline) remote.saveCategories(categoriesRef.current).catch(remoteError);
  };

  // ---------- Online: laden, beim allerersten Start Beispielrezepte anlegen, live mithören ----------
  useEffect(() => {
    if (!isOnline) return undefined;
    let alive = true;
    (async () => {
      try {
        let [rs, cs] = await Promise.all([remote.fetchRecipes(), remote.fetchCategories()]);
        if (!rs.length && !cs.length) {
          await remote.saveCategories(sampleCategories);
          await Promise.all(sampleRecipes.map((r) => remote.saveRecipe(r)));
          [rs, cs] = await Promise.all([remote.fetchRecipes(), remote.fetchCategories()]);
        }
        if (!alive) return;
        commitRecipes(rs);
        commitCategories(cs);
      } catch {
        if (alive) toast('Online-Datenbank nicht erreichbar – es werden die zuletzt geladenen Rezepte angezeigt.', 'error');
      } finally {
        if (alive) setSynced(true);
      }
    })();
    const unsubscribe = remote.subscribe({
      recipe: (type, r) =>
        commitRecipes(type === 'DELETE' ? recipesRef.current.filter((x) => x.id !== r.id) : upsertById(recipesRef.current, r)),
      category: (type, c) =>
        commitCategories(type === 'DELETE' ? categoriesRef.current.filter((x) => x.id !== c.id) : byPosition(upsertById(categoriesRef.current, c))),
    });
    return () => { alive = false; unsubscribe(); };
  }, []);

  // Persönliche Angaben über die geteilten Rezepte legen
  const recipes = useMemo(
    () => recipeData.map((r) => {
      const p = personal[r.id];
      return p ? { ...r, favorite: p.favorite ?? !!r.favorite, lastUsedAt: p.lastUsedAt ?? r.lastUsedAt ?? null } : r;
    }),
    [recipeData, personal]
  );

  const setPersonalField = (id, patch) => setPersonal((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  // ---------- Rezepte ----------
  const addRecipe = (data) => {
    const id = uid();
    const r = { ...data, id, rating: 0, createdAt: Date.now() };
    commitRecipes([r, ...recipesRef.current]);
    pushRecipe(r);
    return id;
  };

  const updateRecipe = (id, patch) => {
    const current = recipesRef.current.find((r) => r.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    commitRecipes(recipesRef.current.map((r) => (r.id === id ? next : r)));
    pushRecipe(next);
  };

  const deleteRecipe = (id) => {
    commitRecipes(recipesRef.current.filter((r) => r.id !== id));
    if (isOnline) remote.deleteRecipe(id).catch(remoteError);
  };

  const duplicateRecipe = (id) => {
    const original = recipesRef.current.find((r) => r.id === id);
    if (!original) return null;
    const newId = uid();
    const { favorite, lastUsedAt, ...rest } = original;
    const copy = {
      ...rest,
      id: newId,
      title: `${original.title} (Kopie)`,
      createdAt: Date.now(),
      ingredients: original.ingredients.map((i) => ({ ...i, id: uid() })),
    };
    commitRecipes([copy, ...recipesRef.current]);
    pushRecipe(copy);
    return newId;
  };

  const toggleFavorite = (id) => {
    const current = recipes.find((r) => r.id === id);
    setPersonalField(id, { favorite: !current?.favorite });
  };

  const markUsed = (id) => setPersonalField(id, { lastUsedAt: Date.now() });

  // ---------- Kategorien ----------
  const addCategory = ({ name, group = 'Eigene', icon = '🏷️', color = '#5fd3a3' }) => {
    const id = uid();
    commitCategories([...categoriesRef.current, { id, name: name.trim(), group, icon, color }]);
    pushCategories();
    return id;
  };

  const updateCategory = (id, patch) => {
    commitCategories(categoriesRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    pushCategories();
  };

  const deleteCategory = (id) => {
    commitCategories(categoriesRef.current.filter((c) => c.id !== id));
    if (isOnline) remote.deleteCategory(id).catch(remoteError);
    const affected = recipesRef.current.filter((r) => r.categoryIds.includes(id));
    affected.forEach((r) => updateRecipe(r.id, { categoryIds: r.categoryIds.filter((c) => c !== id) }));
  };

  // innerhalb derselben Gruppe nach oben (-1) oder unten (+1) verschieben
  const moveCategory = (id, dir) => {
    const cs = categoriesRef.current;
    const idx = cs.findIndex((c) => c.id === id);
    const group = cs[idx].group;
    let j = idx + dir;
    while (j >= 0 && j < cs.length && cs[j].group !== group) j += dir;
    if (j < 0 || j >= cs.length) return;
    const next = [...cs];
    [next[idx], next[j]] = [next[j], next[idx]];
    commitCategories(next.map((c, i) => ({ ...c, position: i })));
    pushCategories();
  };

  // ---------- Einkaufsliste ----------
  // selections: [{ recipe, servings }]
  const addRecipesToShopping = (selections) => {
    setShopping((list) => {
      const next = list.map((i) => ({ ...i, sources: [...i.sources] }));
      selections.forEach(({ recipe, servings }) => {
        const factor = servings / recipe.servings;
        recipe.ingredients.forEach((ing) => {
          const { amount, unit } = toBaseUnit(scaledAmount(ing, factor), ing.unit);
          const key = `${normalize(ing.name)}|${amount === null ? '' : unit}`;
          const existing = next.find((i) => !i.checked && i.key === key);
          if (existing) {
            if (existing.amount !== null && amount !== null) existing.amount += amount;
            if (!existing.sources.includes(recipe.title)) existing.sources.push(recipe.title);
          } else {
            next.push({ id: uid(), key, name: ing.name, amount, unit: amount === null ? '' : unit, checked: false, sources: [recipe.title] });
          }
        });
      });
      return next;
    });
  };

  const addShoppingItem = (name) =>
    setShopping((list) => [...list, { id: uid(), key: `manual|${uid()}`, name, amount: null, unit: '', checked: false, sources: [] }]);

  const toggleShoppingItem = (id) =>
    setShopping((list) => list.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));

  const removeShoppingItem = (id) => setShopping((list) => list.filter((i) => i.id !== id));
  const clearCheckedShopping = () => setShopping((list) => list.filter((i) => !i.checked));
  const clearShopping = () => setShopping([]);

  // ---------- Einstellungen & Datensicherung ----------
  const updateSettings = (patch) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch }));

  const exportData = () => ({
    app: 'iCook',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes,
    categories,
    shopping,
  });

  // Online: Rezepte und Kategorien hinzufügen bzw. überschreiben, ohne die der anderen zu löschen.
  // Favoriten aus den Daten werden als persönliche Favoriten übernommen.
  const mergeIn = async (incomingRecipes, incomingCategories) => {
    const own = {};
    const shared = incomingRecipes.map(({ favorite, lastUsedAt, ...r }) => {
      if (favorite || lastUsedAt) own[r.id] = { favorite: !!favorite, lastUsedAt: lastUsedAt || null };
      return r;
    });
    commitRecipes(mergeById(recipesRef.current, shared));
    commitCategories(mergeById(categoriesRef.current, incomingCategories));
    setPersonal((p) => ({ ...own, ...p }));
    if (!isOnline) return 0;
    await remote.saveCategories(categoriesRef.current);
    const results = await Promise.allSettled(shared.map((r) => remote.saveRecipe(r).then((saved) => applySaved(r, saved))));
    return results.filter((x) => x.status === 'rejected').length;
  };

  const importData = async (data) => {
    if (!data || !Array.isArray(data.recipes) || !Array.isArray(data.categories)) {
      throw new Error('Ungültige Datei');
    }
    if (Array.isArray(data.shopping)) setShopping(data.shopping);
    if (isOnline) return mergeIn(data.recipes, data.categories);
    commitRecipes(data.recipes);
    commitCategories(data.categories);
    return 0;
  };

  const uploadLocalRecipes = async () => {
    const failed = await mergeIn(legacy.recipes, legacy.categories || []);
    if (!failed) setLegacyUploaded(true);
    return failed;
  };

  const resetToSamples = async () => {
    setShopping([]);
    if (isOnline) return mergeIn(sampleRecipes, sampleCategories);
    commitRecipes(sampleRecipes);
    commitCategories(sampleCategories);
    setPersonal({});
    return 0;
  };

  // Nur ohne Online-Datenbank – sonst würde es das Rezeptbuch aller löschen
  const clearAll = () => {
    if (isOnline) return;
    commitRecipes([]);
    commitCategories([]);
    setShopping([]);
    setPersonal({});
  };

  const value = {
    recipes, categories, shopping, settings, toasts,
    online: isOnline, loading: !synced && !recipeData.length, legacyCount,
    toast,
    addRecipe, updateRecipe, deleteRecipe, duplicateRecipe, toggleFavorite, markUsed,
    addCategory, updateCategory, deleteCategory, moveCategory,
    addRecipesToShopping, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, clearShopping,
    updateSettings, exportData, importData, uploadLocalRecipes, resetToSamples, clearAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
