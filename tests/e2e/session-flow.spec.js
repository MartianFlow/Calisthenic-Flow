// Pasar de un ejercicio a otro en el entreno (v22): la barra de arriba no salta,
// el peso y la valoración son obligatorios para seguir, «Saltar ejercicio» lo deja
// pendiente y la cuenta atrás del descanso pita desde 5 s.
const { test, expect, makeState, seed, readState, completeCurrentExercise, rate } = require('./fixtures');

const TUE = '2026-11-03T10:00:00+01:00'; // martes → Pierna en el gimnasio
const L_V = [true, true, true, true, true, false, false];
const LIFT_IDS = ['hack', 'peso-muerto', 'goblet-hack', 'extension', 'curl-femoral', 'aductor', 'abductor', 'gemelo-pie', 'gemelo-sentado'];
const allKg = Object.fromEntries(LIFT_IDS.map((id) => [id, { kg: 40, reps: 8, stall: 0 }]));
const legDay = (extra = {}) => makeState({
  ...extra,
  settings: { legs: 'gym', daysPerWeek: 5, schedule: { days: L_V }, goals: ['frontlever'], ...(extra.settings || {}) },
});
// Tres ejercicios de calistenia sin peso: dominadas, flexiones y remo.
const three = (extra = {}) => makeState({ plan: { dayType: 'A', ids: ['dominadas', 'flexiones', 'remo'], custom: true }, ...extra });

async function start(page) {
  await page.goto('/');
  await page.locator('[data-action="start-session"]').click();
  await page.locator('[data-action="warmup-done"]').last().click();
}

const title = (page) => page.locator('.exercise h2');
const chip = (page, text) => page.locator('.chip', { hasText: text });

test.describe('Peso y valoración antes de seguir', () => {
  test.use({ now: TUE });

  test('sin peso apuntado no deja marcar la serie: lo pide y abre el teclado', async ({ page }) => {
    await seed(page, legDay({ lifts: {} }));
    await start(page);
    await expect(title(page)).toHaveText('Sentadilla hack');
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(page.locator('#toast')).toContainText('apunta el peso');
    await expect(page.locator('.set').first()).not.toHaveClass(/done/);
    await expect(page.locator('.load-row')).toHaveClass(/need/);
    await expect(page.locator('.load-input')).toBeFocused();
    await page.locator('.load-input').fill('80');
    await page.locator('.load-input').blur();
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(page.locator('.set').first()).toHaveClass(/done/);
    expect((await readState(page)).active.items[0].sets[0]).toMatchObject({ done: true, kg: 80 });
  });

  test('al acabar la última serie se queda en el ejercicio hasta valorarlo', async ({ page }) => {
    await seed(page, legDay({ lifts: allKg }));
    await start(page);
    await completeCurrentExercise(page);
    await expect(title(page)).toHaveText('Sentadilla hack');
    await expect(page.locator('.rate-panel')).toBeVisible();
    await expect(page.locator('[data-action="rate-later"]')).toHaveCount(0);
    await expect(page.locator('.rate-why')).toContainText('para pasar al siguiente');
    // «Siguiente» tampoco pasa: recuerda que falta valorar
    await page.locator('[data-action="session-next"]').click();
    await expect(title(page)).toHaveText('Sentadilla hack');
    await expect(page.locator('#toast')).toContainText('Elige qué tal te ha ido');
    await rate(page, 'normal');
    await expect(page.locator('.rate-panel')).toHaveCount(0);
    await expect(title(page)).not.toHaveText('Sentadilla hack');
    await expect(chip(page, 'Sentadilla hack').first()).toHaveClass(/done/);
  });
});

test.describe('Siguiente y Saltar ejercicio', () => {
  test('Siguiente sin series no pasa; con series pide la valoración y luego pasa', async ({ page }) => {
    await seed(page, three());
    await start(page);
    await expect(page.locator('.exercise .eyebrow')).toContainText('Dominadas');
    await page.locator('[data-action="session-next"]').click();
    await expect(page.locator('#toast')).toContainText('Saltar ejercicio');
    await expect(page.locator('.exercise .eyebrow')).toContainText('Dominadas');
    // Una serie hecha (de varias) y Siguiente: valorar y pasa
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await page.locator('[data-action="rest-skip"]').click();
    await page.locator('[data-action="session-next"]').click();
    await expect(page.locator('.rate-panel')).toBeVisible();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Dominadas');
    await rate(page, 'dificil');
    await expect(page.locator('.exercise .eyebrow')).toContainText('Flexiones');
    expect((await readState(page)).active.items[0].rating).toBe('dificil');
  });

  test('Saltar pasa al siguiente al momento, queda pendiente arriba y se vuelve a él al final', async ({ page }) => {
    await seed(page, three());
    await start(page);
    await page.locator('[data-action="session-skip"]').click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Flexiones');
    await expect(page.locator('#toast')).toContainText('queda pendiente');
    await expect(chip(page, 'Dominadas')).toHaveClass(/skipped/);
    await expect(page.locator('.rate-panel')).toHaveCount(0);
    // Flexiones y remo: al terminar remo vuelve a las dominadas que quedaron atrás
    await completeCurrentExercise(page);
    await rate(page, 'normal');
    await expect(page.locator('.exercise .eyebrow')).toContainText('Remo');
    // Mientras quede uno saltado, el último no ofrece «Finalizar» sino «Siguiente»
    await expect(page.locator('.nav-row [data-action="session-finish"]')).toHaveCount(0);
    await completeCurrentExercise(page);
    await rate(page, 'normal');
    await expect(page.locator('.exercise .eyebrow')).toContainText('Dominadas');
    await expect(page.locator('[data-action="session-skip"]')).toHaveCount(0); // ya no queda otro
    await expect(page.locator('.nav-row [data-action="session-finish"]')).toBeVisible();
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(chip(page, 'Dominadas')).not.toHaveClass(/skipped/);
  });

  test('valorar mientras miras otro ejercicio no te cambia de ejercicio', async ({ page }) => {
    await seed(page, three());
    await start(page);
    await completeCurrentExercise(page);
    await chip(page, 'Remo').click();
    await expect(page.locator('.rate-q')).toContainText('Te falta valorar');
    await rate(page, 'facil');
    await expect(page.locator('.exercise .eyebrow')).toContainText('Remo');
    await expect(page.locator('.rate-panel')).toHaveCount(0);
  });

  test('al terminar se valora lo hecho; «Seguir entrenando» vuelve sin cerrar', async ({ page }) => {
    await seed(page, three());
    await start(page);
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page.locator('.rate-q')).toContainText('Antes de terminar');
    await expect(page.locator('.rate-panel')).not.toContainText('Omitir');
    await page.locator('[data-action="rate-back"]').click();
    await expect(page.locator('.rate-panel')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/entreno/);
    expect((await readState(page)).active.finishing).toBe(false);
  });
});

test.describe('Barra de ejercicios', () => {
  test.use({ now: TUE });

  const scrollX = (page) => page.locator('.chips').evaluate((el) => el.scrollLeft);
  const settled = async (page) => {
    let last = -1;
    for (let i = 0; i < 30; i++) {
      const x = await scrollX(page);
      if (Math.abs(x - last) < 1) return x;
      last = x;
      await page.clock.runFor(100);
      await page.waitForTimeout(30);
    }
    return last;
  };

  test('no vuelve al principio al cambiar una serie y sigue al ejercicio elegido', async ({ page }) => {
    await seed(page, legDay({ lifts: allKg }));
    await start(page);
    await page.locator('.chip').last().click();
    const x = await settled(page);
    expect(x).toBeGreaterThan(40);
    // Repintar (cambiar las repeticiones) deja la barra donde estaba
    await page.locator('[data-action="set-inc"][data-set="0"]').click();
    expect(Math.abs((await scrollX(page)) - x)).toBeLessThan(2);
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    expect(Math.abs((await settled(page)) - x)).toBeLessThan(2);
    // Al volver al primero, la barra se desliza hasta él
    await page.locator('.chip').nth(1).click();
    expect(await settled(page)).toBeLessThan(x);
    await expect(title(page)).toHaveText('Sentadilla hack');
  });

  test('al abrir un entreno ya empezado, el actual se ve sin tocar nada', async ({ page }) => {
    await seed(page, legDay({ lifts: allKg }));
    await start(page);
    await page.locator('.chip').last().click();
    await settled(page);
    await page.reload();
    await expect(page.locator('.chip.current')).toBeInViewport();
  });
});

test.describe('Cuenta atrás del descanso', () => {
  test('pita en 5, 4, 3, 2 y 1 y con un pitido largo en el 0, cada uno a su segundo', async ({ page }) => {
    // Audio de mentira que apunta cuándo empieza cada pitido (en hora del reloj).
    await page.addInitScript(() => {
      window.__beeps = [];
      const node = () => ({ connect(n) { return n; } });
      const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
      class FakeAudio {
        constructor() { this.state = 'running'; this.destination = node(); }
        get currentTime() { return performance.now() / 1000; }
        resume() { return Promise.resolve(); }
        createBuffer() { return {}; }
        createBufferSource() { return { ...node(), start() {} }; }
        createGain() { return { ...node(), gain: param() }; }
        createOscillator() {
          const ctx = this;
          const osc = { ...node(), frequency: param(), type: 'sine' };
          osc.start = (t) => { if (osc.type === 'triangle') { osc.rec = { f: osc.frequency.value, at: Date.now() + (t - ctx.currentTime) * 1000 }; window.__beeps.push(osc.rec); } };
          osc.stop = (t) => { if (t === 0 && osc.rec) osc.rec.cancelled = true; };
          return osc;
        }
      }
      window.AudioContext = FakeAudio;
    });
    await seed(page, three({ settings: { sound: true } }));
    await start(page);
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    const endsAt = (await readState(page)).active.rest.endsAt;
    await page.clock.runFor(81_000);
    await expect(page.locator('.rest-bar')).toHaveCount(0);
    const beeps = await page.evaluate(() => window.__beeps);
    expect(beeps.map((b) => b.f)).toEqual([784, 784, 784, 784, 784, 1175]);
    beeps.forEach((b, i) => expect(Math.abs(b.at - (endsAt - (5 - i) * 1000))).toBeLessThan(80));

    // Saltar el descanso a mitad de la cuenta atrás cancela lo que quedaba programado
    await page.locator('[data-action="set-toggle"][data-set="1"]').click();
    await page.clock.runFor(77_700);
    await page.locator('[data-action="rest-skip"]').click();
    await page.clock.runFor(3000);
    const later = (await page.evaluate(() => window.__beeps)).slice(6);
    expect(later.filter((b) => !b.cancelled).length).toBeLessThanOrEqual(3);
    expect(later.some((b) => b.f === 1175 && !b.cancelled)).toBe(false);
  });
});
