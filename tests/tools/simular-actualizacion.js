// Simula cómo se actualiza la app ya instalada en un iPhone (service worker + caché):
//   1. Sirve una versión antigua (un commit) y la «instala».
//   2. Publica encima la versión actual del repositorio (incluidos archivos sin commit).
//   3. Comprueba que a la 2.ª apertura ya se ve la versión actual (Ajustes → «versión N»).
//   4. Publica otra versión (N+1) con la app abierta y comprueba que, al volver a la app
//      (visibilitychange), se recarga sola.
//
// Uso: node tests/tools/simular-actualizacion.js [commit-antiguo]
//      (por defecto 4854a00, la última versión con caché primero: cf-v8)
// Usa Chromium de Playwright y un servidor en el puerto 8790. No forma parte de `npm run test:e2e`.

const { chromium, devices } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OLD = process.argv[2] || '4854a00';
const REPO = path.resolve(__dirname, '../..');
const PORT = 8790;
const URL = `http://localhost:${PORT}/`;
const SITE = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-update-'));
const state = {
  version: 2, onboarded: true, progress: {}, sessions: [], levelLog: [], game: {},
  settings: { goals: [], daysPerWeek: 3, schedule: { days: [true, false, true, false, true, false, false] } },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Ojo: page.waitForFunction no espera a una función async (la promesa cuenta como «verdadero»).
async function swActive(page, version) {
  for (let i = 0; i < 80; i++) {
    const ok = await page.evaluate(async (v) => {
      const keys = await caches.keys();
      return keys.length === 1 && keys[0] === v && !!navigator.serviceWorker.controller;
    }, version).catch(() => false);
    if (ok) return;
    await sleep(250);
  }
  throw new Error(`El service worker ${version} no llegó a activarse`);
}
const versionShown = async (page) => {
  await page.goto(`${URL}#/ajustes`);
  const el = page.locator('[data-app-version]');
  return (await el.count()) ? el.innerText() : '(sin número de versión: anterior a cf-v9)';
};
const versionOf = (file) => fs.readFileSync(file, 'utf8').match(/cf-v(\d+)/)[1];

(async () => {
  execSync(`git -C ${REPO} archive ${OLD} | tar -x -C ${SITE}`);
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: SITE, stdio: 'ignore' });
  await sleep(800);
  const browser = await chromium.launch();
  let failed = false;
  try {
    const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
    page.on('pageerror', (e) => { failed = true; console.log('ERROR de la app:', e.message); });

    await page.goto(URL);
    await page.evaluate((s) => localStorage.setItem('calisthenic-flow:v1', JSON.stringify(s)), state);
    const oldVersion = `cf-v${versionOf(path.join(SITE, 'sw.js'))}`;
    await page.reload();
    await swActive(page, oldVersion);
    console.log(`1) Instalada la versión antigua (${OLD}, ${oldVersion}):`, await versionShown(page));

    execSync(`cd ${REPO} && git ls-files -z --cached --others --exclude-standard | xargs -0 -I{} cp --parents {} ${SITE}`);
    const current = `cf-v${versionOf(path.join(SITE, 'sw.js'))}`;
    await page.reload(); // 1.ª apertura tras publicar: la instala en segundo plano
    await swActive(page, current);
    await page.reload(); // 2.ª apertura
    const shown = await versionShown(page);
    console.log(`2) Publicada la actual (${current}), 2.ª apertura:`, shown);
    if (!shown.includes(current.replace('cf-v', 'versión '))) failed = true;

    const next = `cf-v${Number(current.slice(4)) + 1}`;
    for (const f of ['sw.js', 'js/version.js']) {
      const file = path.join(SITE, f);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll(current, next));
    }
    const reloaded = page.waitForEvent('load', { timeout: 15000 });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // volver a la app
    await reloaded;
    await sleep(500);
    const after = await page.locator('[data-app-version]').innerText();
    console.log(`3) Publicada ${next} con la app abierta, al volver:`, after);
    if (!after.includes(next.replace('cf-v', 'versión '))) failed = true;
  } catch (e) {
    failed = true;
    console.log('FALLO:', e.message);
  } finally {
    await browser.close();
    server.kill();
    fs.rmSync(SITE, { recursive: true, force: true });
  }
  console.log(failed ? 'RESULTADO: FALLA' : 'RESULTADO: OK');
  process.exit(failed ? 1 : 0);
})();
