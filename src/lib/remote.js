import { supabaseClient } from './supabase.js';

// Lesen und Schreiben der geteilten Daten. Jede Zeile enthält das komplette Objekt als JSON –
// so muss die Tabelle nicht angepasst werden, wenn ein Rezept neue Felder bekommt.
export const isOnline = !!supabaseClient;

const IMAGE_BUCKET = 'recipe-images';

// Favorit und „zuletzt angesehen“ sind persönlich und werden nie geteilt
const sharedPart = ({ favorite, lastUsedAt, ...rest }) => rest;

async function uploadImage(dataUrl, recipeId) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${recipeId}/${Date.now()}.jpg`;
  const { error } = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

const fromRecipeRow = (row) => ({ ...row.data, id: row.id });
const fromCategoryRow = (row) => ({ ...row.data, id: row.id, position: row.position });

export const remote = {
  async fetchRecipes() {
    const { data, error } = await supabaseClient.from('recipes').select('id, data');
    if (error) throw error;
    return data.map(fromRecipeRow);
  },

  async fetchCategories() {
    const { data, error } = await supabaseClient.from('categories').select('id, data, position').order('position');
    if (error) throw error;
    return data.map(fromCategoryRow);
  },

  // Speichert ein Rezept; ein neues Foto (data:-URL) wird vorher in den Fotospeicher hochgeladen.
  // Gibt das gespeicherte Rezept zurück (mit Foto-Link statt data:-URL).
  async saveRecipe(recipe) {
    let r = sharedPart(recipe);
    if (typeof r.image === 'string' && r.image.startsWith('data:')) {
      r = { ...r, image: await uploadImage(r.image, r.id) };
    }
    const { error } = await supabaseClient.from('recipes').upsert({ id: r.id, data: r, updated_at: new Date().toISOString() });
    if (error) throw error;
    return r;
  },

  async deleteRecipe(id) {
    const { error } = await supabaseClient.from('recipes').delete().eq('id', id);
    if (error) throw error;
  },

  // Ganze Liste speichern – die Reihenfolge wird als Position mitgegeben
  async saveCategories(list) {
    if (!list.length) return;
    const now = new Date().toISOString();
    const rows = list.map(({ position, ...c }, i) => ({ id: c.id, data: c, position: i, updated_at: now }));
    const { error } = await supabaseClient.from('categories').upsert(rows);
    if (error) throw error;
  },

  async deleteCategory(id) {
    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // Live-Änderungen anderer Nutzer:innen; liefert eine Abmelde-Funktion
  subscribe({ recipe, category }) {
    const handle = (cb, map) => (payload) => {
      if (payload.eventType === 'DELETE') cb('DELETE', { id: payload.old.id });
      else cb(payload.eventType, map(payload.new));
    };
    const channel = supabaseClient
      .channel('icook-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, handle(recipe, fromRecipeRow))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, handle(category, fromCategoryRow))
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  },
};
