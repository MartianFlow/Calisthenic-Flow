// Maquetación en móvil: cada pantalla y estado de la app (los mismos escenarios que
// tests/tools/auditar-diseno.js) a 4 anchos de iPhone, sin scroll horizontal, sin
// textos que se pisen o se salgan de su caja y sin contenido tapado por las barras fijas.
//   320 px: iPhone SE (1.ª gen.) o cualquier iPhone con «Zoom de pantalla»
//   375 px: iPhone SE (2.ª/3.ª gen.), 6–8 · 390 px: iPhone 12–16 · 430 px: Pro Max / Plus
// En el iPhone el texto usa San Francisco; aquí se sustituye por Inter (medidas muy
// parecidas). En CI se instala con el paquete fonts-inter.

const { test, expect, seed } = require('./fixtures');
const { scenarios } = require('../tools/escenarios-diseno');
const { auditPage } = require('../tools/comprobar-diseno');

const WIDTHS = [[320, 568], [375, 667], [390, 844], [430, 932]];
const FONT_ALIAS = "@font-face { font-family: 'SF Pro Text'; src: local('Inter'); font-weight: 100 900; }";

for (const sc of scenarios) {
  test.describe(sc.name, () => {
    if (sc.now) test.use({ now: sc.now });

    test(`${sc.name} se ve bien a 320, 375, 390 y 430 px`, async ({ page }) => {
      await page.addInitScript((css) => {
        document.addEventListener('DOMContentLoaded', () => {
          const st = document.createElement('style');
          st.textContent = css;
          document.head.appendChild(st);
        });
      }, FONT_ALIAS);
      await seed(page, sc.state);
      await page.goto(`/#${sc.route}`);
      await page.evaluate(() => document.fonts.ready);
      if (sc.setup) await sc.setup(page);
      const problems = [];
      for (const [width, height] of WIDTHS) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        for (const i of await auditPage(page)) problems.push(`${width}px [${i.kind}] ${i.el ? `${i.el} — ` : ''}${i.msg}`);
      }
      expect(problems, 'Problemas de maquetación (ver tests/tools/comprobar-diseno.js)').toEqual([]);
    });
  });
}
