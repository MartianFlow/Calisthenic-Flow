// Progresión doble según la valoración Fácil / Normal / Difícil.
const { test, expect, makeState, seed, readState, trainOnly } = require('./fixtures');

test.describe('Progresión', () => {
  test('Fácil por debajo de la meta sube el objetivo +2 reps', async ({ page }) => {
    // Dominadas (paso 5, meta 3×8): objetivo inicial 60 % = 5
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false } } }));
    await trainOnly(page, 'dominadas', { rating: 'facil' });
    await expect(page.locator('.outcome')).toContainText('Próxima vez: 3 × 7 reps (antes 5 reps)');
    const s = await readState(page);
    expect(s.progress.dominadas.work).toBe(7);
  });

  test('Normal por debajo de la meta sube +1', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false, work: 6 } } }));
    await trainOnly(page, 'dominadas', { rating: 'normal' });
    expect((await readState(page)).progress.dominadas.work).toBe(7);
  });

  test('Fácil con la meta cumplida pasa al siguiente ejercicio de la escala', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false, work: 8 } } }));
    await trainOnly(page, 'dominadas', { rating: 'facil' });
    await expect(page.locator('.celebrate')).toContainText('Nuevo nivel: Dominadas (volumen)');
    const s = await readState(page);
    expect(s.progress.dominadas.step).toBe(5);
    expect(s.levelLog.at(-1)).toMatchObject({ roadmapId: 'dominadas', from: 4, to: 5, reason: 'facil' });
  });

  test('en habilidades, Normal con la meta cumplida necesita 2 sesiones para subir', async ({ page }) => {
    // Front lever paso 1 (tuck, meta 3×15 s)
    await seed(page, makeState({ progress: { frontlever: { step: 0, passes: 0, done: false, work: 15 } } }));
    await trainOnly(page, 'frontlever', { rating: 'normal' });
    await expect(page.locator('.outcome')).toContainText('(1/2)');
    expect((await readState(page)).progress.frontlever).toMatchObject({ step: 0, passes: 1 });
    await trainOnly(page, 'frontlever', { rating: 'normal' });
    expect((await readState(page)).progress.frontlever).toMatchObject({ step: 1, passes: 0 });
  });

  test('Difícil sin llegar recalibra el objetivo al mínimo conseguido', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false, work: 6 } } }));
    await trainOnly(page, 'dominadas', { rating: 'dificil', setValue: 4 });
    await expect(page.locator('.outcome')).toContainText('Recalibrado');
    expect((await readState(page)).progress.dominadas.work).toBe(4);
  });

  test('tras 3 sesiones sin avanzar reinicia al 80 %', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false, work: 6, stall: 2 } } }));
    await trainOnly(page, 'dominadas', { rating: 'dificil' });
    await expect(page.locator('.outcome')).toContainText('reiniciamos');
    const p = (await readState(page)).progress.dominadas;
    expect(p.work).toBe(5); // 80 % de 6
    expect(p.stall).toBe(0);
  });

  test('con «Según ejercicio» los descansos dependen del paso', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } }, settings: { restMode: 'auto' } }));
    await page.goto('/#/ruta/dominadas');
    // Negativas 3×5 (≤ 5 reps) → 3:00
    await expect(page.locator('.card').first()).toContainText('descanso 3:00');
  });

  test('con el descanso fijo (por defecto) la ruta muestra ese descanso', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } } }));
    await page.goto('/#/ruta/dominadas');
    await expect(page.locator('.card').first()).toContainText('descanso 1:20');
  });
});
