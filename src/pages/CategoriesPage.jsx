import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import CategoryEditor from '../components/CategoryEditor.jsx';
import { ConfirmDialog, EmptyState, PageHeader } from '../components/ui.jsx';
import { Link } from '../router.jsx';
import { useStore } from '../store.jsx';

export default function CategoriesPage() {
  const { categories, recipes, deleteCategory, moveCategory, toast } = useStore();
  const [editing, setEditing] = useState(null); // null | 'new' | category
  const [deleting, setDeleting] = useState(null);

  const counts = useMemo(() => {
    const map = {};
    recipes.forEach((r) => r.categoryIds.forEach((id) => { map[id] = (map[id] || 0) + 1; }));
    return map;
  }, [recipes]);

  const groups = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    });
    return [...map.entries()];
  }, [categories]);

  const confirmDelete = () => {
    deleteCategory(deleting.id);
    toast(`Kategorie „${deleting.name}“ gelöscht`);
    setDeleting(null);
  };

  return (
    <div className="page">
      <PageHeader
        title="Kategorien"
        subtitle="Deine persönliche Ordnung – erstellen, umbenennen, sortieren oder löschen."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> Neue Kategorie
          </button>
        }
      />

      {!categories.length && (
        <EmptyState icon="tag" title="Noch keine Kategorien" text="Lege z. B. „Gerichte wie bei Oma“ oder „Schnell & einfach“ an." />
      )}

      <div className="category-groups">
        {groups.map(([group, cats]) => (
          <section key={group} className="card category-group">
            <h2 className="group-title">{group} <span className="muted small">{cats.length}</span></h2>
            <ul className="category-list">
              {cats.map((c, idx) => (
                <li key={c.id} className="category-row">
                  <Link to={`/rezepte?kat=${c.id}`} className="category-main">
                    <span className="category-icon" style={{ background: `${c.color}22`, borderColor: `${c.color}66` }}>{c.icon}</span>
                    <span className="category-name">{c.name}</span>
                    <span className="muted small">{counts[c.id] || 0} {counts[c.id] === 1 ? 'Rezept' : 'Rezepte'}</span>
                  </Link>
                  <div className="row-actions">
                    <button className="icon-btn sm" onClick={() => moveCategory(c.id, -1)} disabled={idx === 0} aria-label="Nach oben"><Icon name="chevronUp" size={17} /></button>
                    <button className="icon-btn sm" onClick={() => moveCategory(c.id, 1)} disabled={idx === cats.length - 1} aria-label="Nach unten"><Icon name="chevronDown" size={17} /></button>
                    <button className="icon-btn sm" onClick={() => setEditing(c)} aria-label={`${c.name} bearbeiten`}><Icon name="edit" size={17} /></button>
                    <button className="icon-btn sm danger" onClick={() => setDeleting(c)} aria-label={`${c.name} löschen`}><Icon name="trash" size={17} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {editing && (
        <CategoryEditor category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <ConfirmDialog
          title="Kategorie löschen?"
          message={
            counts[deleting.id]
              ? `„${deleting.name}“ ist ${counts[deleting.id]} Rezept(en) zugeordnet. Die Rezepte bleiben erhalten, verlieren aber diese Zuordnung.`
              : `„${deleting.name}“ wird dauerhaft gelöscht.`
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
