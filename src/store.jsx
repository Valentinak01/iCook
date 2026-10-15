import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { sampleCategories, sampleRecipes } from './data/sampleData.js';
import { uid, loadJSON, saveJSON, scaledAmount, toBaseUnit, normalize } from './utils.js';

// Alle Daten liegen ausschließlich lokal im Browser (localStorage) – kein Backend.
const KEYS = {
  recipes: 'icook.recipes',
  categories: 'icook.categories',
  shopping: 'icook.shopping',
  settings: 'icook.settings',
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

export function StoreProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = uid();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const storageError = () => toast('Speicher voll – bitte große Bilder entfernen oder Daten exportieren.', 'error');

  const [recipes, setRecipes] = usePersistent(KEYS.recipes, sampleRecipes, storageError);
  const [categories, setCategories] = usePersistent(KEYS.categories, sampleCategories, storageError);
  const [shopping, setShopping] = usePersistent(KEYS.shopping, [], storageError);
  const [storedSettings, setSettings] = usePersistent(KEYS.settings, DEFAULT_SETTINGS, storageError);
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  // ---------- Rezepte ----------
  const addRecipe = (data) => {
    const id = uid();
    setRecipes((rs) => [{ ...data, id, favorite: false, rating: 0, createdAt: Date.now(), lastUsedAt: null }, ...rs]);
    return id;
  };

  const updateRecipe = (id, patch) =>
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const deleteRecipe = (id) => setRecipes((rs) => rs.filter((r) => r.id !== id));

  const duplicateRecipe = (id) => {
    const original = recipes.find((r) => r.id === id);
    if (!original) return null;
    const newId = uid();
    const copy = {
      ...original,
      id: newId,
      title: `${original.title} (Kopie)`,
      favorite: false,
      createdAt: Date.now(),
      lastUsedAt: null,
      ingredients: original.ingredients.map((i) => ({ ...i, id: uid() })),
    };
    setRecipes((rs) => [copy, ...rs]);
    return newId;
  };

  const toggleFavorite = (id) =>
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)));

  const markUsed = (id) => updateRecipe(id, { lastUsedAt: Date.now() });

  // ---------- Kategorien ----------
  const addCategory = ({ name, group = 'Eigene', icon = '🏷️', color = '#5fd3a3' }) => {
    const id = uid();
    setCategories((cs) => [...cs, { id, name: name.trim(), group, icon, color }]);
    return id;
  };

  const updateCategory = (id, patch) =>
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const deleteCategory = (id) => {
    setCategories((cs) => cs.filter((c) => c.id !== id));
    setRecipes((rs) => rs.map((r) => ({ ...r, categoryIds: r.categoryIds.filter((c) => c !== id) })));
  };

  // innerhalb derselben Gruppe nach oben (-1) oder unten (+1) verschieben
  const moveCategory = (id, dir) =>
    setCategories((cs) => {
      const idx = cs.findIndex((c) => c.id === id);
      const group = cs[idx].group;
      let j = idx + dir;
      while (j >= 0 && j < cs.length && cs[j].group !== group) j += dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

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

  const importData = (data) => {
    if (!data || !Array.isArray(data.recipes) || !Array.isArray(data.categories)) {
      throw new Error('Ungültige Datei');
    }
    setRecipes(data.recipes);
    setCategories(data.categories);
    setShopping(Array.isArray(data.shopping) ? data.shopping : []);
  };

  const resetToSamples = () => {
    setRecipes(sampleRecipes);
    setCategories(sampleCategories);
    setShopping([]);
  };

  const clearAll = () => {
    setRecipes([]);
    setCategories([]);
    setShopping([]);
  };

  const value = {
    recipes, categories, shopping, settings, toasts,
    toast,
    addRecipe, updateRecipe, deleteRecipe, duplicateRecipe, toggleFavorite, markUsed,
    addCategory, updateCategory, deleteCategory, moveCategory,
    addRecipesToShopping, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShopping, clearShopping,
    updateSettings, exportData, importData, resetToSamples, clearAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
