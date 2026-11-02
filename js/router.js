// Enrutado mínimo basado en el hash de la URL (#/ruta/front-lever, etc.).

const routes = [];

export function addRoute(pattern, view, options = {}) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ regex, keys, view, options });
}

export function resolve(hash) {
  const path = (hash || '#/').replace(/^#/, '') || '/';
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { view: r.view, params, options: r.options, path };
    }
  }
  return null;
}

export function navigate(hash, { replace = false } = {}) {
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}
