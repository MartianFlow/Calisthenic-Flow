// Auditoría del diseño en móvil: recorre todas las pantallas y estados de la app a
// varios anchos de iPhone y busca, de forma automática:
//   · scroll horizontal y elementos que se salen de la pantalla,
//   · texto que se sale de su caja (botones, pastillas, tarjetas…),
//   · textos o iconos que se pisan entre sí,
//   · contenido que queda siempre tapado por una barra fija (tab bar, descanso),
//   · texto con poco contraste con su fondo.
// Guarda una captura de cada pantalla para revisarla a mano.
//
// Uso: node tests/tools/auditar-diseno.js [carpeta-de-salida] [--anchos=320,375,390,430] [--temas=dark,light]
//        [--capturas=375,390] [--solo=texto] [--notch]
// Por defecto escribe en test-results/diseno/ (ignorado por git). No forma parte de `npm run test:e2e`:
// la versión rápida de estas comprobaciones está en tests/e2e/layout.spec.js.
//
// En el iPhone el texto usa San Francisco; aquí no existe y Chromium usaría una letra más
// estrecha, así que se sustituye por Inter (medidas muy parecidas) para no esconder desbordes.

const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { scenarios } = require('./escenarios-diseno');
const { auditPage } = require('./comprobar-diseno');

const REPO = path.resolve(__dirname, '../..');
const PORT = 8791;
const BASE = `http://localhost:${PORT}/`;
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(REPO, 'test-results/diseno'));
const WIDTHS = (args.find((a) => a.startsWith('--anchos='))?.split('=')[1] || '320,375,390,430').split(',').map(Number);
const ONLY = args.find((a) => a.startsWith('--solo='))?.split('=')[1];
const HEIGHT = { 320: 568, 375: 667, 390: 844, 393: 852, 430: 932 };
const SHOT_WIDTHS = (args.find((a) => a.startsWith('--capturas='))?.split('=')[1] || '375,390').split(',').map(Number);
const THEMES = (args.find((a) => a.startsWith('--temas='))?.split('=')[1] || 'dark,light').split(',');

const NOTCH = args.includes('--notch'); // simula la app instalada en un iPhone con notch (márgenes seguros)
const FONT_ALIAS = `
  @font-face { font-family: 'SF Pro Text'; src: local('Inter'); font-weight: 100 900; }
  ${NOTCH ? ':root { --safe-top: 47px !important; --safe-bottom: 34px !important; }' : ''}
`;

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: REPO, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch();
  const report = [];
  let errors = 0;
  const jobs = [];
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      if (theme === 'light' && !SHOT_WIDTHS.includes(width)) continue; // la geometría es la misma en los dos temas
      for (const sc of scenarios) if (!ONLY || sc.name.includes(ONLY)) jobs.push({ width, theme, sc });
    }
  }
  async function run({ width, theme, sc }) {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      viewport: { width, height: HEIGHT[width] || 844 },
      deviceScaleFactor: 2,
      colorScheme: theme,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
    });
    await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await context.addInitScript((css) => {
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      });
    }, FONT_ALIAS);
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Rayo' : undefined));
    try {
      await page.clock.install({ time: new Date(sc.now || '2026-11-02T10:00:00+01:00') });
      // Datos guardados antes de que arranque la app (solo en la primera carga de la pestaña).
      await page.addInitScript((data) => {
        if (window.top !== window || sessionStorage.getItem('audit-seeded')) return;
        localStorage.setItem('calisthenic-flow:v1', JSON.stringify(data));
        sessionStorage.setItem('audit-seeded', '1');
      }, sc.state);
      await page.goto(`${BASE}#${sc.route}`);
      await page.evaluate(() => document.fonts.ready);
      if (sc.setup) await sc.setup(page);
      await page.waitForTimeout(150);
      const issues = await auditPage(page);
      for (const e of pageErrors) issues.push({ kind: 'js-error', msg: e });
      if (issues.length) report.push({ scenario: sc.name, width, theme, issues });
      if (SHOT_WIDTHS.includes(width)) {
        const file = path.join(OUT, `${sc.name}__${width}-${theme}.png`);
        // En las capturas de página entera la barra fija saldría a media página: se oculta.
        if (!sc.viewportOnly) await page.addStyleTag({ content: '#tabbar { display: none !important; }' });
        await page.screenshot({ path: file, fullPage: !sc.viewportOnly, scale: 'css' });
      }
    } catch (e) {
      errors++;
      report.push({ scenario: sc.name, width, theme, issues: [{ kind: 'error-escenario', msg: e.message.split('\n')[0] }] });
    }
    await context.close();
  }
  try {
    const queue = [...jobs];
    await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await run(queue.shift()); }));
  } finally {
    await browser.close();
    server.kill();
  }
  fs.writeFileSync(path.join(OUT, 'informe.json'), JSON.stringify(report, null, 2));
  // Resumen legible: cada problema una vez, con los anchos donde aparece.
  const grouped = new Map();
  for (const r of report) {
    for (const i of r.issues) {
      const key = `${r.scenario} | ${i.kind} | ${i.el || ''} | ${i.msg}`;
      const g = grouped.get(key) || { ...i, scenario: r.scenario, where: new Set() };
      g.where.add(`${r.width}${r.theme === 'light' ? 'L' : ''}`);
      grouped.set(key, g);
    }
  }
  const lines = [...grouped.values()].map((g) => `[${g.kind}] ${g.scenario} (${[...g.where].join(',')}): ${g.el ? `${g.el} — ` : ''}${g.msg}`);
  fs.writeFileSync(path.join(OUT, 'informe.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log(`\n${lines.length} problemas distintos · capturas en ${OUT}`);
  process.exit(errors ? 1 : 0);
})();
