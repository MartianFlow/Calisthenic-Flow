// Más gamificación (petición 25): logros secretos, misiones de la semana, récords personales,
// artículos nuevos y mascotas.
const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

const WEEK_START = new Date('2026-11-02T00:00:00+01:00').getTime(); // lunes de la semana del reloj fijo

test.describe('Logros secretos', () => {
  test('no dicen qué piden hasta conseguirlos; tocar al héroe 10 veces desbloquea «¡Cosquillas!» y el slime', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/logros');
    const secret = page.locator('.px-ach.is-secret').first();
    await expect(secret.locator('strong')).toHaveText('???');
    await expect(secret.locator('.px-desc')).toContainText('Pista:');
    await expect(page.locator('.px-ach', { hasText: 'Toca a tu héroe' })).toHaveCount(0);

    await page.goto('/#/heroe');
    for (let i = 0; i < 10; i++) await page.locator('[data-action="hero-poke"]').click();
    await expect(page.locator('#toast')).toContainText('¡Logro secreto! ¡Cosquillas! · Nuevo: Slime');
    const s = await readState(page);
    expect(s.game.pokes).toBe(10);
    expect(s.game.unlocked.cosquillas).toBeTruthy();

    await page.goto('/#/logros');
    await expect(page.locator('.px-ach.is-secret.done')).toContainText('Toca a tu héroe 10 veces');
    // Y la mascota ya se puede equipar
    await page.goto('/#/equipo');
    await page.locator('[data-action="equip"][data-item="slime"]').click();
    expect((await readState(page)).game.equipped.pet).toBe('slime');
    await expect(page.locator('.px-scene .hero-pet')).toHaveCount(1);
  });

  test('cambiar 10 veces entre claro y oscuro desbloquea «El lado oscuro»', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/');
    for (let i = 0; i < 10; i++) await page.locator('[data-action="theme-toggle"]').click();
    await expect(page.locator('#toast')).toContainText('El lado oscuro');
    expect((await readState(page)).game.unlocked['lado-oscuro']).toBeTruthy();
  });

  test('en Equipo, un artículo de un logro secreto no destripa el secreto', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/equipo');
    await expect(page.locator('[data-action="equip"][data-item="parche"]')).toContainText('Logro secreto');
    await expect(page.locator('[data-action="equip"][data-item="parche"]')).not.toContainText('Sin supersticiones');
  });

  test('los de fecha y hora salen del historial: entrenar un viernes 13 y de madrugada', async ({ page }) => {
    const f13 = new Date('2026-03-13T19:00:00+01:00').getTime(); // viernes 13
    const late = new Date('2026-10-20T02:30:00+02:00').getTime();
    const mk = (startedAt) => ({ ...pastSession({ daysAgo: 1 }), id: `s${startedAt}`, startedAt, endedAt: startedAt + 1800e3 });
    await seed(page, makeState({ sessions: [mk(f13), mk(late)] }));
    await page.goto('/#/logros');
    await expect(page.locator('.px-ach.is-secret.done')).toHaveCount(3); // + «El regreso» (más de 30 días entre los dos)
    const s = await readState(page);
    expect(s.game.unlocked).toMatchObject({ 'viernes-13': expect.any(String), vampiro: expect.any(String), regreso: expect.any(String) });
  });
});

test.describe('Misiones de la semana', () => {
  test('3 misiones, la primera cumplir tu semana; al cumplirse se guardan y dan EXP', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/heroe');
    await expect(page.locator('.px-missions li')).toHaveCount(3);
    await expect(page.locator('.px-missions li').first()).toContainText('Completa 3 entrenos');
    await expect(page.locator('.missions-panel .px-sub').first()).toHaveText('0/3');
    await expect(page.locator('.hero-mini')).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('.px-mini-missions')).toContainText('Misiones 0/3');
  });

  test.describe('un viernes', () => {
    test.use({ now: '2026-11-06T10:00:00+01:00' });

    test('con 3 entrenos esta semana, «Completa 3 entrenos» queda cumplida', async ({ page }) => {
      const sessions = [3, 2, 1].map((d) => pastSession({ daysAgo: d, now: '2026-11-06T10:00:00+01:00', items: [{ roadmapId: 'core', stepIndex: 0, sets: [8, 8, 8] }] }));
      await seed(page, makeState({ sessions }));
      await page.goto('/#/heroe');
      await expect(page.locator('.px-missions li').first()).toHaveClass(/done/);
      const s = await readState(page);
      expect(s.game.missions[WEEK_START].ids).toContain('semana');
      expect(s.game.unlocked['mision-1']).toBeTruthy();
    });
  });
});

test.describe('Récords personales', () => {
  test('superar tu mejor serie en un paso es un récord, con su EXP, en el resumen', async ({ page }) => {
    await seed(page, makeState({
      progress: { core: { step: 1, passes: 0, done: false, work: 20 } },
      sessions: [pastSession({ daysAgo: 2, items: [{ roadmapId: 'core', stepIndex: 1, type: 'hold', target: 30, goal: 20, sets: [20, 20, 20] }] })],
    }));
    await page.goto('/#/ruta/core');
    await page.locator('[data-action="train-only"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('[data-action="set-inc"][data-set="0"]').click(); // 21 s
    for (let i = 0; i < 3; i++) await page.locator('.exercise [data-action="set-toggle"]:not(.on)').first().click();
    await page.locator('.rate-panel [data-value="normal"]').click();
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.burst-title')).toContainText('RÉCORD');
    await expect(page.locator('.px-records').first()).toContainText('Plancha frontal');
    await expect(page.locator('.px-records').first()).toContainText('21 s');
    await expect(page.locator('.px-records').first()).toContainText('antes 20 s');
    const s = await readState(page);
    expect(s.sessions.at(-1).game.records).toBe(1);
    expect(s.game.unlocked['record-1']).toBeTruthy();
  });
});

test.describe('Artículos nuevos', () => {
  test('hay 70 artículos en 10 ranuras, con mascotas', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/equipo');
    await expect(page.locator('[data-action="equip"][data-item]:not([data-item=""])')).toHaveCount(70);
    await expect(page.locator('.px-slot-row', { hasText: 'Mascota' })).toBeVisible();
    await page.goto('/#/logros');
    await expect(page.locator('.px-stats')).toContainText('/112');
  });
});
