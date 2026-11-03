const { test, expect, readState } = require('./fixtures');

// Paso de la bienvenida que se está viendo.
const step = (page) => page.locator('.wiz-body');
const next = (page) => page.locator('.wiz-foot [data-action="wiz-next"]').click();

// Elige una opción única (experiencia o pierna): avanza sola al cabo de un momento.
async function choose(page, action, value) {
  await page.locator(`[data-action="${action}"][data-value="${value}"], [data-action="${action}"][data-id="${value}"]`).click();
  await page.clock.runFor(600);
}

test.describe('Configuración inicial', () => {
  test('la primera vez muestra la portada de la bienvenida y no la pantalla Hoy', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/#\/bienvenida/);
    await expect(page.getByRole('heading', { name: 'Calisthenic Flow' })).toBeVisible();
    await expect(page.locator('.intro-feats li')).toHaveCount(3);
    await expect(page.locator('#tabbar')).toBeHidden();
    await expect(page.locator('.wiz-foot [data-action="wiz-next"]')).toContainText('Empezar');
  });

  test('paso a paso: experiencia, pierna, niveles, habilidades, días, descanso y héroe', async ({ page }) => {
    await page.goto('/');
    await next(page);

    // Experiencia: sin elegir no se puede seguir; al elegir, avanza sola y precarga los niveles
    await expect(step(page)).toHaveAttribute('data-step', 'experiencia');
    await expect(page.locator('.wiz-foot [data-action="wiz-next"]')).toBeDisabled();
    await choose(page, 'wiz-exp', 'base');
    await expect(step(page)).toHaveAttribute('data-step', 'pierna');
    let s = await readState(page);
    expect(s.progress.remo.step).toBe(2);
    expect(s.progress.dominadas.step).toBe(3);

    // Pierna con calistenia: 7 básicos por delante
    await choose(page, 'wiz-legs', 'calistenia');
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-dominadas');
    await expect(page.locator('.wiz-body .eyebrow')).toContainText('Básico 1 de 7');
    await expect(page.locator('.wiz-step.on')).toContainText('Negativas de dominada');
    await expect(page.locator('.wiz-step.done')).toHaveCount(3);

    // Nivel en dominadas: el paso 5 (Dominadas 3×8)
    await page.locator('[data-action="wiz-level"][data-id="dominadas"][data-step="4"]').click();
    await expect(page.locator('.wiz-step.on')).toContainText('Dominadas');
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-remo');
    await next(page);
    await page.locator('[data-action="wiz-level"][data-id="flexiones"][data-step="1"]').click();
    for (const id of ['flexiones', 'fondos', 'piernas', 'bisagra', 'core']) {
      await expect(step(page)).toHaveAttribute('data-step', `nivel-${id}`);
      await next(page);
    }

    // Habilidades: primero las que ya domina (para mantener) y luego la que quiere aprender
    await expect(step(page)).toHaveAttribute('data-step', 'mantener');
    await expect(page.locator('.none-option')).toHaveClass(/on/);
    await page.locator('[data-action="wiz-keep"][data-id="muscleup"]').click();
    await page.locator('[data-action="wiz-keep"][data-id="frontlever"]').click();
    await expect(page.locator('.wiz-count')).toContainText('2 de 2');
    await page.locator('[data-action="wiz-keep"][data-id="lsit"]').click();
    await expect(page.locator('#toast')).toContainText('Como mucho 2');
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'foco');
    // Las que mantiene no se ofrecen para aprender; con habilidades dominadas no hay «Recomendada»
    await expect(page.locator('[data-action="wiz-focus"][data-id="muscleup"]')).toHaveCount(0);
    await expect(page.locator('.skill-rec')).toHaveCount(0);
    await expect(page.locator('.wiz-foot .btn')).toContainText('Ahora no');
    await choose(page, 'wiz-focus', 'pino');
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-pino');
    await expect(page.locator('.wiz-body .eyebrow')).toContainText('La que aprendes · habilidad 1 de 3');
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-muscleup');
    await expect(page.locator('.wiz-body .eyebrow')).toContainText('La que mantienes');
    await expect(page.locator('.wiz-note')).toContainText('Se recomienda llegar antes');
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-frontlever');
    await next(page);

    // Cómo divide la semana: con calistenia, las 4 formas, y cuerpo completo de partida
    await expect(step(page)).toHaveAttribute('data-step', 'division');
    await expect(page.locator('.wiz-option')).toHaveCount(4);
    await expect(page.locator('.wiz-option.on')).toContainText('Cuerpo completo');
    await next(page);

    // Días: propone los recomendados para su nivel; se añade el sábado
    await expect(step(page)).toHaveAttribute('data-step', 'dias');
    await expect(page.locator('.wiz-rec')).toContainText('Para ti');
    await page.locator('[data-action="plan-day"][data-i="5"]').click();
    await next(page);

    // Descanso: fijo de 80 s por defecto; se cambia a 90 s con los atajos
    await expect(step(page)).toHaveAttribute('data-step', 'entreno');
    await expect(page.locator('[data-rest-default]')).toContainText('1:20');
    await page.locator('[data-action="rest-preset"][data-sec="90"]').click();
    await expect(page.locator('[data-rest-default]')).toContainText('1:30');
    await next(page);

    // Héroe: nombre
    await expect(step(page)).toHaveAttribute('data-step', 'heroe');
    await page.locator('[data-change="wiz-hero-name"]').fill('Rayo');
    await page.locator('[data-change="wiz-hero-name"]').press('Enter');
    await page.locator('[data-change="wiz-hero-name"]').blur();
    await next(page);

    // Resumen y a entrenar
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    await expect(page.locator('.wiz-summary')).toContainText('Quieres aprenderPino');
    await expect(page.locator('.wiz-summary')).toContainText('Muscle-up y Front lever');
    await expect(page.locator('.wiz-summary')).toContainText('1:30 entre series');
    await page.locator('[data-action="finish-onboarding"]').click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    await expect(page.locator('.ex-row').first()).toContainText('Práctica de pino');
    await expect(page.locator('.ex-row').first().locator('.role-tag')).toHaveText('foco');

    s = await readState(page);
    expect(s.onboarded).toBe(true);
    expect(s.progress.dominadas.step).toBe(4);
    expect(s.progress.flexiones.step).toBe(1);
    expect(s.progress.core.step).toBe(2); // el de la experiencia «Tengo algo de base»
    expect(s.settings).toMatchObject({ focus: 'pino', maintain: ['muscleup', 'frontlever'], goals: ['pino', 'muscleup', 'frontlever'] });
    expect(s.settings.schedule.days).toEqual([true, false, true, false, true, true, false]);
    expect(s.settings).toMatchObject({ restMode: 'fixed', restSec: 90 });
    expect(s.game.name).toBe('Rayo');
  });

  test('con la pierna en el gimnasio no pregunta el nivel de piernas ni de isquios', async ({ page }) => {
    await page.goto('/');
    await next(page);
    await choose(page, 'wiz-exp', 'cero');
    await choose(page, 'wiz-legs', 'gym');
    await expect(page.locator('.wiz-body .eyebrow')).toContainText('Básico 1 de 5');
    const seen = [];
    for (let i = 0; i < 5; i++) {
      seen.push(await step(page).getAttribute('data-step'));
      await next(page);
    }
    expect(seen).toEqual(['nivel-dominadas', 'nivel-remo', 'nivel-flexiones', 'nivel-fondos', 'nivel-core']);
    await expect(step(page)).toHaveAttribute('data-step', 'mantener');
  });

  test('atrás vuelve al paso anterior, «Cambiar» salta a un paso y recargar no pierde el paso', async ({ page }) => {
    await page.goto('/');
    await next(page);
    await choose(page, 'wiz-exp', 'habitual');
    await expect(step(page)).toHaveAttribute('data-step', 'pierna');
    await page.locator('[data-action="wiz-back"]').click();
    await expect(step(page)).toHaveAttribute('data-step', 'experiencia');
    await expect(page.locator('.wiz-option.on')).toContainText('Entreno a menudo');

    // Hasta el resumen
    await next(page);
    for (let i = 0; i < 20; i++) {
      if ((await step(page).getAttribute('data-step')) === 'listo') break;
      await next(page);
    }
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    await page.locator('[data-action="wiz-goto"][data-key="entreno"]').click();
    await expect(step(page)).toHaveAttribute('data-step', 'entreno');

    // iOS puede recargar la app: sigue en el mismo paso
    await page.reload();
    await expect(step(page)).toHaveAttribute('data-step', 'entreno');
    // Y al guardar vuelve directamente al resumen
    await expect(page.locator('.wiz-foot .btn')).toContainText('volver al resumen');
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
  });

  test('desde el resumen, «Cambiar» abre solo esa pregunta y vuelve al resumen', async ({ page }) => {
    await page.goto('/');
    await next(page);
    await choose(page, 'wiz-exp', 'base');
    await choose(page, 'wiz-legs', 'calistenia');
    // Afina dominadas a mano y llega al resumen
    await page.locator('[data-action="wiz-level"][data-id="dominadas"][data-step="6"]').click();
    for (let i = 0; i < 20 && (await step(page).getAttribute('data-step')) !== 'listo'; i++) await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'listo');

    // Días: se cambia y «Guardar» vuelve al resumen, sin pasar por descanso ni héroe
    await page.locator('[data-action="wiz-goto"][data-key="dias"]').click();
    await expect(step(page)).toHaveAttribute('data-step', 'dias');
    await expect(page.locator('.wiz-section')).toContainText('cambiando');
    await page.locator('[data-action="plan-day"][data-i="6"]').click();
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    expect((await readState(page)).settings.schedule.days[6]).toBe(true);

    // Atrás también vuelve al resumen
    await page.locator('[data-action="wiz-goto"][data-key="entreno"]').click();
    await page.locator('[data-action="wiz-back"]').click();
    await expect(step(page)).toHaveAttribute('data-step', 'listo');

    // Pierna: al elegir vuelve solo al resumen
    await page.locator('[data-action="wiz-goto"][data-key="pierna"]').click();
    await choose(page, 'wiz-legs', 'gym');
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    await expect(page.locator('.wiz-summary')).toContainText('En el gimnasio');

    // Experiencia: elegir la misma no borra el nivel afinado de dominadas
    await page.locator('[data-action="wiz-goto"][data-key="experiencia"]').click();
    await choose(page, 'wiz-exp', 'base');
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    expect((await readState(page)).progress.dominadas.step).toBe(6);

    // Una ruta concreta: solo su nivel
    await expect(page.locator('.sum-route', { hasText: 'Dominadas' })).toContainText('7/10');
    await page.locator('[data-action="wiz-goto"][data-key="nivel-dominadas"]').click();
    await page.locator('[data-action="wiz-level"][data-id="dominadas"][data-step="4"]').click();
    await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'listo');
    await expect(page.locator('.sum-route', { hasText: 'Dominadas' })).toContainText('5/10');
  });

  test('sin ninguna habilidad: «Aún no domino ninguna» avanza y recomienda por cuál empezar', async ({ page }) => {
    await page.goto('/');
    await next(page);
    await choose(page, 'wiz-exp', 'cero');
    await choose(page, 'wiz-legs', 'calistenia');
    for (let i = 0; i < 7; i++) await next(page);
    await expect(step(page)).toHaveAttribute('data-step', 'mantener');
    await page.locator('[data-action="wiz-keep"][data-id="lsit"]').click();
    await page.locator('[data-action="wiz-keep-none"]').click();
    await page.clock.runFor(600);
    await expect(step(page)).toHaveAttribute('data-step', 'foco');
    expect((await readState(page)).settings.maintain).toEqual([]);
    // Empezando de cero, lo más cercano: pino y L-sit
    await expect(page.locator('.wiz-rec')).toContainText('Pino y L-sit');
    await expect(page.locator('[data-action="wiz-focus"][data-id="pino"] .skill-rec')).toContainText('Recomendada para empezar');
    await expect(page.locator('[data-action="wiz-focus"][data-id="lsit"] .skill-rec')).toHaveCount(1);
    await expect(page.locator('.skill-rec')).toHaveCount(2);
    // Elegir otra (con más base pendiente) también vale
    await choose(page, 'wiz-focus', 'frontlever');
    await expect(step(page)).toHaveAttribute('data-step', 'nivel-frontlever');
    await expect(page.locator('.wiz-note')).toContainText('Se recomienda llegar antes');
    expect((await readState(page)).settings).toMatchObject({ focus: 'frontlever', maintain: [], goals: ['frontlever'] });
  });

  test('importar una copia desde la portada se salta la configuración', async ({ page }) => {
    await page.goto('/');
    const backup = { app: 'calisthenic-flow', data: { version: 2, onboarded: true, settings: { goals: ['pino'] }, sessions: [], progress: {} } };
    await page.locator('.wiz-import input[type="file"]').setInputFiles({ name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    // Una copia de antes de la v16: su objetivo pasa a ser la habilidad de foco
    expect((await readState(page)).settings).toMatchObject({ focus: 'pino', maintain: [], goals: ['pino'] });
  });
});
