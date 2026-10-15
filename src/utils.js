// Hilfsfunktionen: IDs, Mengen, Zeiten, Speicher, Bilder

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const UNITS = ['g', 'kg', 'ml', 'l', 'TL', 'EL', 'Stück', 'Prise', 'Bund', 'Dose', 'Pck.', 'Tasse', 'Zehe', 'Scheibe', ''];

const FRACTION_UNITS = ['TL', 'EL', 'Stück', 'Prise', 'Bund', 'Dose', 'Pck.', 'Tasse', 'Zehe', 'Scheibe', ''];
const PIECE_UNITS = ['Stück', 'Bund', 'Dose', 'Pck.', 'Zehe', 'Scheibe'];

export const DIFFICULTIES = ['leicht', 'mittel', 'anspruchsvoll'];

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const ALLERGENS = ['Gluten', 'Milch', 'Ei', 'Nüsse', 'Erdnüsse', 'Soja', 'Fisch', 'Krebstiere', 'Sellerie', 'Senf', 'Sesam'];

export const CATEGORY_COLORS = ['#5fd3a3', '#b5e655', '#a3b65a', '#d0546e', '#f2a65a', '#f6d365', '#6cb8ff', '#a78bfa', '#f472b6', '#94a3b8'];

// "1,5" | "1/2" | "1 1/2" | "½" -> Zahl oder null
export function parseAmount(text) {
  if (text === null || text === undefined) return null;
  let s = String(text).trim();
  if (!s) return null;
  const uni = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  let extra = 0;
  for (const [ch, val] of Object.entries(uni)) {
    if (s.includes(ch)) { extra += val; s = s.replace(ch, '').trim(); }
  }
  s = s.replace(',', '.');
  let value = 0;
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (mixed) value = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (frac) value = Number(frac[1]) / Number(frac[2]);
  else if (s === '') value = 0;
  else value = Number(s);
  if (isNaN(value)) return null;
  const total = value + extra;
  return total > 0 ? total : null;
}

function formatDecimal(n) {
  return (Math.round(n * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function formatQty(a, unit) {
  if (!FRACTION_UNITS.includes(unit)) return formatDecimal(a);
  const whole = Math.floor(a);
  const rest = a - whole;
  const fractions = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];
  if (rest < 0.03) return String(whole);
  if (rest > 0.97) return String(whole + 1);
  const match = fractions.find(([v]) => Math.abs(v - rest) < 0.03);
  if (!match) return formatDecimal(a);
  return whole > 0 ? `${whole}${match[1]}` : match[1];
}

// Zahl + Einheit hübsch darstellen, optional g→kg / ml→l umrechnen
export function prettyAmount(amount, unit = '', convert = true) {
  if (amount === null || amount === undefined || amount === '' || isNaN(amount)) return '';
  let a = Number(amount);
  let u = unit || '';
  if (convert) {
    if (u === 'g' && a >= 1000) { a /= 1000; u = 'kg'; }
    else if (u === 'ml' && a >= 1000) { a /= 1000; u = 'l'; }
    else if (u === 'kg' && a < 1) { a *= 1000; u = 'g'; }
    else if (u === 'l' && a < 1) { a *= 1000; u = 'ml'; }
  }
  if (u === 'g' || u === 'ml') a = a >= 100 ? Math.round(a / 5) * 5 : Math.round(a * 10) / 10;
  if (PIECE_UNITS.includes(u)) a = Math.max(0.5, Math.round(a * 4) / 4);
  return `${formatQty(a, u)}${u ? ' ' + u : ''}`;
}

export function scaledAmount(ing, factor) {
  if (ing.amount === null || ing.amount === undefined || ing.amount === '') return null;
  return Number(ing.amount) * factor;
}

// Für Einkaufsliste: auf Basiseinheit (g / ml) bringen
export function toBaseUnit(amount, unit) {
  if (amount === null) return { amount: null, unit };
  if (unit === 'kg') return { amount: amount * 1000, unit: 'g' };
  if (unit === 'l') return { amount: amount * 1000, unit: 'ml' };
  return { amount, unit };
}

export function totalTime(r) {
  return (Number(r.prepTime) || 0) + (Number(r.cookTime) || 0);
}

export function formatMinutes(min) {
  if (!min) return '–';
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}

export const normalize = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

export function isSimilarTitle(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (x.length < 3 || y.length < 3) return false;
  if (x === y) return true;
  if (x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x))) return true;
  return levenshtein(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) / 8));
}

// "200 g Pasta" -> { amount, unit, name }
export function parseIngredientLine(line) {
  const text = line.replace(/^[-•*\s]+/, '').trim();
  if (!text) return null;
  const m = text.match(/^([\d.,/½¼¾⅓⅔ ]+)?\s*([A-Za-zäöüÄÖÜ.]+)?\s*(.*)$/);
  if (!m) return { amount: null, unit: '', name: text };
  const amount = m[1] ? parseAmount(m[1].trim()) : null;
  const unitCandidate = (m[2] || '').trim();
  const unit = UNITS.find((u) => u && u.toLowerCase() === unitCandidate.toLowerCase());
  if (amount === null) return { amount: null, unit: '', name: text };
  if (unit) return { amount, unit, name: m[3].trim() || unitCandidate };
  return { amount, unit: 'Stück', name: `${unitCandidate} ${m[3]}`.trim() };
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Bildausschnitt: Fokuspunkt in % und Zoom (1 = Bild füllt den Rahmen gerade aus)
export const DEFAULT_FRAME = { x: 50, y: 50, zoom: 1 };

export function frameStyle(frame) {
  const f = { ...DEFAULT_FRAME, ...frame };
  const pos = `${f.x}% ${f.y}%`;
  return { objectPosition: pos, transformOrigin: pos, '--zoom': f.zoom };
}

// Bild verkleinern, damit es in den lokalen Speicher passt
export function resizeImage(file, max = 1100) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function recipeToText(recipe, categories) {
  const cats = recipe.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean);
  const lines = [
    recipe.title.toUpperCase(),
    recipe.description || '',
    cats.length ? `Kategorien: ${cats.join(', ')}` : '',
    `Portionen: ${recipe.servings} · Zeit: ${formatMinutes(totalTime(recipe))}`,
    '',
    'ZUTATEN',
    ...recipe.ingredients.map((i) => `• ${prettyAmount(i.amount, i.unit)} ${i.name}`.replace('•  ', '• ')),
    '',
    'ZUBEREITUNG',
    ...recipe.steps.map((s, i) => `${i + 1}. ${s}`),
  ];
  if (recipe.notes) lines.push('', 'NOTIZEN', recipe.notes);
  lines.push('', '— geteilt aus iCook');
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
