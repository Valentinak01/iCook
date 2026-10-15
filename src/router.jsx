import { useEffect, useState } from 'react';

// Minimaler Hash-Router (#/pfad?query) – funktioniert ohne Server-Konfiguration.

function readLocation() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs), raw };
}

let navigationBlocker = null;
let lastHash = window.location.hash;
// Besuchte Pfade dieser Sitzung – für einen sinnvollen „Zurück“-Pfeil
const visited = [readLocation().raw];

// Letzte besuchte Seite außerhalb von `prefix` (z. B. alles außer diesem Rezept und seinem Kochmodus)
export function lastPathOutside(prefix, fallback = '/') {
  for (let i = visited.length - 1; i >= 0; i--) {
    const path = visited[i].split('?')[0];
    if (path !== prefix && !path.startsWith(prefix + '/')) return visited[i];
  }
  return fallback;
}

export function previousPath() {
  return visited.length > 1 ? visited[visited.length - 2].split('?')[0] : null;
}

// Formular kann Navigation abfangen, wenn ungespeicherte Änderungen vorliegen
export function setNavigationBlocker(fn) {
  navigationBlocker = fn;
}

export function navigate(to, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', '#' + to);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

export function useLocation() {
  const [loc, setLoc] = useState(readLocation);
  useEffect(() => {
    const onChange = () => {
      if (navigationBlocker && navigationBlocker()) {
        const ok = window.confirm('Du hast ungespeicherte Änderungen. Seite wirklich verlassen?');
        if (!ok) {
          history.replaceState(null, '', lastHash || '#/');
          return;
        }
        navigationBlocker = null;
      }
      lastHash = window.location.hash;
      const next = readLocation();
      visited.push(next.raw);
      setLoc(next);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return loc;
}

export function Link({ to, children, className, ...rest }) {
  return (
    <a href={'#' + to} className={className} {...rest}>
      {children}
    </a>
  );
}

// "/rezept/:id" gegen Pfad prüfen -> Parameter oder null
export function matchRoute(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}
