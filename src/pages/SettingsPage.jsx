import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, PageHeader } from '../components/ui.jsx';
import { useStore } from '../store.jsx';
import { downloadFile } from '../utils.js';

export const ACCENTS = {
  olive: { label: 'Olivgrün', color: '#aab86c', ink: '#f3f5e8', fill: '#5c692b', glow: 'rgb(111 125 54 / 0.55)' },
  lime: { label: 'Limette', color: '#b5e655', ink: '#1b2606' },
  mint: { label: 'Mintgrün', color: '#5fd3a3', ink: '#06231a' },
  burgundy: { label: 'Burgundy', color: '#d8607a', ink: '#ffffff' },
};

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="setting-row">
      <div>
        <strong>{label}</strong>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-ui" />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, exportData, importData, uploadLocalRecipes, resetToSamples, clearAll, recipes, categories, toast, online, legacyCount } = useStore();
  const fileRef = useRef(null);
  const [confirm, setConfirm] = useState(null); // 'reset' | 'clear'
  const [busy, setBusy] = useState(false);

  // Hochladen kann bei vielen Fotos etwas dauern – Ergebnis als Meldung
  const run = async (action, success) => {
    setBusy(true);
    try {
      const failed = await action();
      if (failed) toast(`${failed} Rezept(e) konnten nicht gespeichert werden – bitte erneut versuchen.`, 'error');
      else toast(success);
    } catch {
      toast('Das hat nicht geklappt – bitte Verbindung prüfen.', 'error');
    }
    setBusy(false);
  };

  let usedKb = 0;
  try {
    usedKb = Math.round(Object.keys(localStorage).filter((k) => k.startsWith('icook.')).reduce((sum, k) => sum + (localStorage.getItem(k) || '').length, 0) / 1024);
  } catch { /* Speicher nicht verfügbar */ }

  const doExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`icook-backup-${date}.json`, JSON.stringify(exportData(), null, 2));
    toast('Backup heruntergeladen');
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return toast('Datei konnte nicht gelesen werden', 'error');
    }
    run(() => importData(data), 'Daten erfolgreich importiert');
  };

  return (
    <div className="page narrow">
      <PageHeader title="Einstellungen" subtitle="Darstellung, Einheiten und Datensicherung." />

      <section className="card settings-card">
        <h2>Darstellung</h2>
        <div className="setting-row">
          <div>
            <strong>Akzentfarbe</strong>
            <p className="muted small">Für Hauptaktionen, aktive Filter und Hinweise.</p>
          </div>
        </div>
        <div className="accent-options">
          {Object.entries(ACCENTS).map(([key, a]) => (
            <button key={key} className={`accent-option ${settings.accent === key ? 'active' : ''}`} onClick={() => updateSettings({ accent: key })} aria-pressed={settings.accent === key}>
              <span className="swatch" style={{ background: a.fill || a.color }} />
              {a.label}
              {settings.accent === key && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
        <div className="setting-row">
          <div>
            <strong>Standardansicht</strong>
            <p className="muted small">Wie Rezepte in Übersichten angezeigt werden.</p>
          </div>
          <div className="segmented">
            <button className={settings.view === 'grid' ? 'active' : ''} onClick={() => updateSettings({ view: 'grid' })}><Icon name="grid" size={16} /> Karten</button>
            <button className={settings.view === 'list' ? 'active' : ''} onClick={() => updateSettings({ view: 'list' })}><Icon name="list" size={16} /> Liste</button>
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <h2>Einheiten & Kochen</h2>
        <Toggle
          checked={settings.convertUnits}
          onChange={(v) => updateSettings({ convertUnits: v })}
          label="Einheiten automatisch umrechnen"
          hint="z. B. 1500 g → 1,5 kg oder 0,25 l → 250 ml beim Anpassen der Portionen."
        />
        <Toggle
          checked={settings.keepAwake}
          onChange={(v) => updateSettings({ keepAwake: v })}
          label="Bildschirm im Kochmodus aktiv halten"
          hint="Nutzt die Wake-Lock-Funktion des Browsers, sofern unterstützt."
        />
      </section>

      <section className="card settings-card">
        <h2><Icon name={online ? 'users' : 'lock'} size={18} /> Speicherort</h2>
        {online ? (
          <p className="muted small">
            Verbunden mit der Online-Datenbank: Rezepte, Kategorien und Fotos sind für alle sichtbar und von allen bearbeitbar.
            Favoriten, Einkaufsliste und Einstellungen bleiben nur in diesem Browser.
          </p>
        ) : (
          <p className="muted small">
            Rezepte werden nur in diesem Browser gespeichert. Für ein gemeinsames Rezeptbuch die Online-Datenbank einrichten (siehe README).
          </p>
        )}
        {legacyCount > 0 && (
          <div className="setting-row">
            <div>
              <strong>{legacyCount} lokale Rezepte gefunden</strong>
              <p className="muted small">Diese Rezepte liegen noch nur in diesem Browser. Hochladen, damit alle sie sehen.</p>
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(uploadLocalRecipes, 'Lokale Rezepte hochgeladen')}>
              <Icon name="upload" size={17} /> {busy ? 'Wird hochgeladen …' : 'Hochladen'}
            </button>
          </div>
        )}
      </section>

      <section className="card settings-card">
        <h2>Datensicherung</h2>
        <p className="muted small">
          {recipes.length} Rezepte · {categories.length} Kategorien · ca. {usedKb} KB belegt
        </p>
        <div className="row-buttons">
          <button className="btn btn-outline" onClick={doExport}><Icon name="download" size={17} /> Backup exportieren</button>
          <button className="btn btn-outline" onClick={() => fileRef.current.click()} disabled={busy}><Icon name="upload" size={17} /> Backup importieren</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
        <div className="row-buttons">
          <button className="btn btn-ghost" onClick={() => setConfirm('reset')}><Icon name="refresh" size={17} /> Beispielrezepte wiederherstellen</button>
          {!online && <button className="btn btn-ghost danger-text" onClick={() => setConfirm('clear')}><Icon name="trash" size={17} /> Alle Daten löschen</button>}
        </div>
      </section>

      <section className="card settings-card info-card">
        <h2><Icon name="lock" size={18} /> Datenschutz</h2>
        {online ? (
          <p className="muted">
            Rezepte, Kategorien und Fotos werden in einer <strong>öffentlichen Online-Datenbank</strong> (Supabase) gespeichert.
            Alle, die den Link kennen, können sie sehen, ändern und löschen – bitte keine privaten Daten eintragen.
            Erstelle regelmäßig ein Backup, falls etwas versehentlich gelöscht wird.
          </p>
        ) : (
          <p className="muted">
            iCook ist ein Frontend-Prototyp ohne Server, Datenbank oder Konto. Alle Rezepte, Bilder und Notizen werden
            <strong> ausschließlich lokal in diesem Browser</strong> gespeichert (localStorage) und nicht übertragen.
            Wird der Browser-Speicher gelöscht, gehen die Daten verloren – erstelle daher regelmäßig ein Backup.
          </p>
        )}
      </section>

      <p className="muted tiny center">iCook · Version 0.1 (Konzept-Prototyp)</p>

      {confirm === 'reset' && (
        <ConfirmDialog
          title="Beispielrezepte wiederherstellen?"
          message={online
            ? 'Die Beispielrezepte und -kategorien werden für alle wiederhergestellt. Andere Rezepte bleiben erhalten; die Einkaufsliste wird geleert.'
            : 'Alle aktuellen Rezepte, Kategorien und die Einkaufsliste werden durch die Beispieldaten ersetzt.'}
          confirmLabel="Wiederherstellen"
          onConfirm={() => { setConfirm(null); run(resetToSamples, 'Beispieldaten wiederhergestellt'); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'clear' && (
        <ConfirmDialog
          title="Alle Daten löschen?"
          message="Alle Rezepte, Kategorien und die Einkaufsliste werden unwiderruflich gelöscht. Tipp: Vorher ein Backup exportieren."
          confirmLabel="Alles löschen"
          onConfirm={() => { clearAll(); setConfirm(null); toast('Alle Daten gelöscht'); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
