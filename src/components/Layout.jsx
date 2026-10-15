import Icon from './Icon.jsx';
import { Link } from '../router.jsx';
import { useStore } from '../store.jsx';

const NAV = [
  { to: '/', label: 'Startseite', short: 'Start', icon: 'home' },
  { to: '/rezepte', label: 'Alle Rezepte', short: 'Rezepte', icon: 'book' },
  { to: '/kategorien', label: 'Kategorien', short: 'Kategorien', icon: 'tag' },
  { to: '/favoriten', label: 'Favoriten', short: 'Favoriten', icon: 'heart' },
  { to: '/einkaufsliste', label: 'Einkaufsliste', short: 'Einkauf', icon: 'cart' },
];

// Seitenleiste in Gruppen – die Handy-Navigation nutzt weiterhin NAV
const SIDE_GROUPS = [
  { label: 'Entdecken', items: NAV.filter((n) => n.to !== '/einkaufsliste') },
  { label: 'Planen', items: NAV.filter((n) => n.to === '/einkaufsliste') },
];
const SETTINGS = { to: '/einstellungen', label: 'Einstellungen', icon: 'settings' };

function isActive(path, to) {
  if (to === '/') return path === '/';
  return path.startsWith(to);
}

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="iCook Startseite">
      <span className="logo-mark"><Icon name="chef" size={20} /></span>
      <span className="logo-words">
        <span className="logo-text">i<strong>Cook</strong></span>
        <span className="logo-tag">Rezepte · Kochen · Genießen</span>
      </span>
    </Link>
  );
}

function SideLink({ item, path, badge = null }) {
  const active = isActive(path, item.to);
  return (
    <Link to={item.to} className={`side-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
      <span className="side-icon"><Icon name={item.icon} size={18} /></span>
      <span className="side-label">{item.label}</span>
      {badge}
    </Link>
  );
}

export default function Layout({ path, children }) {
  const { shopping, online } = useStore();
  const openItems = shopping.filter((i) => !i.checked).length;

  const badge = (to) =>
    to === '/einkaufsliste' && openItems > 0 ? <span className="badge">{openItems}</span> : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <Link to="/neu" className="btn btn-primary btn-block">
          <Icon name="plus" size={18} /> Rezept hinzufügen
        </Link>
        <nav className="side-nav" aria-label="Hauptnavigation">
          {SIDE_GROUPS.map((g) => (
            <div key={g.label} className="side-group">
              <span className="side-group-label">{g.label}</span>
              {g.items.map((n) => <SideLink key={n.to} item={n} path={path} badge={badge(n.to)} />)}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <SideLink item={SETTINGS} path={path} />
          <div className="sidebar-foot muted">
            {online
              ? <><Icon name="users" size={14} /> Rezepte werden online gespeichert und mit allen geteilt.</>
              : <><Icon name="lock" size={14} /> Rezepte werden nur lokal in diesem Browser gespeichert.</>}
          </div>
        </div>
      </aside>

      <header className="topbar">
        <Logo />
        <Link to="/einstellungen" className="icon-btn" aria-label="Einstellungen">
          <Icon name="settings" />
        </Link>
      </header>

      <main className="main">{children}</main>

      {path !== '/neu' && !path.startsWith('/rezept/') && (
        <Link to="/neu" className="fab" aria-label="Rezept hinzufügen">
          <Icon name="plus" size={26} />
        </Link>
      )}

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`bottom-link ${isActive(path, n.to) ? 'active' : ''}`} aria-current={isActive(path, n.to) ? 'page' : undefined}>
            <span className="bottom-icon">
              <Icon name={n.icon} size={21} />
              {badge(n.to)}
            </span>
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
