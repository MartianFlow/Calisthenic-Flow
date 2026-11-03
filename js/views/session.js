// Entreno en curso: series, cronómetro de isometrías y temporizador de descanso.

import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { LIFT_BY_ID } from '../data/gym.js';
import { getState, update } from '../store.js';
import { itemComplete, finishActiveSession, lastPerformance, lastLift, nextUnrated, itemName, warmupList, RATINGS } from '../logic.js';
import { esc, icon, fmtClock, unitLabel, toast, fmtKg, kgInput, parseKg, fmtSeries, fmtLiftSeries } from '../ui.js';
import { navigate } from '../router.js';
import { audio, vibrate, wakeLock } from '../device.js';
import { videoCard } from '../video.js';
import { burst, bump, beat, replay } from '../fx.js';
import { totalXP, levelInfo, syncAchievements, itemsUnlockedBy } from '../game.js';

const HOLD_COUNTDOWN = 3000;
const beeped = { holdStart: null, holdTarget: null };
const lastSecond = { rest: null, hold: null };
const RATING_WORDS = { facil: '¡FÁCIL!', normal: '¡BIEN!', dificil: '¡DURO!' };
const RATING_COLORS = { facil: 'cyan', normal: '', dificil: 'pink' };
let sheetShown = false; // para animar el panel inferior solo al aparecer
export let pendingCelebration = false;
export function takeCelebration() { const v = pendingCelebration; pendingCelebration = false; return v; }

function chips(a) {
  const warm = `<button class="chip ${a.warmupDone ? 'done' : ''} ${!a.warmupDone ? 'current' : ''}" data-action="session-goto" data-index="-1">Calent.</button>`;
  const items = a.items.map((item, i) => {
    const name = item.liftId ? LIFT_BY_ID[item.liftId]?.name : ROADMAP_BY_ID[item.roadmapId]?.name;
    const cls = [itemComplete(item) ? 'done' : '', a.warmupDone && a.current === i ? 'current' : ''].join(' ');
    return `<button class="chip ${cls}" data-action="session-goto" data-index="${i}">${itemComplete(item) ? icon('check', 14) : ''}${esc(name || '')}</button>`;
  }).join('');
  return `<nav class="chips" aria-label="Ejercicios">${warm}${items}</nav>`;
}

function warmupCard(a) {
  const legs = a.warmupKind === 'pierna';
  return `
    <section class="card exercise">
      <div class="eyebrow">Antes de empezar</div>
      <h2>Calentamiento${legs ? ' de pierna' : ''}</h2>
      <p class="muted">${legs ? '8-10 minutos para subir la temperatura y preparar tobillos y caderas.' : '5-6 minutos para preparar muñecas, hombros y caderas.'} Marca cada ejercicio al terminarlo.</p>
      <ul class="checklist">
        ${warmupList(a).map((w, i) => {
          const on = a.warmupChecks.includes(i);
          return `<li><button class="check-item ${on ? 'on' : ''}" data-action="warmup-check" data-i="${i}">
            <span class="box">${on ? icon('check', 16) : ''}</span>
            <span class="grow"><span class="check-name">${esc(w.name)}</span><span class="muted small block">${esc(w.detail)}</span></span>
          </button></li>`;
        }).join('')}
      </ul>
      <div class="row gap">
        <button class="btn primary grow" data-action="warmup-done">${icon('play', 18)} Empezar ejercicios</button>
        <button class="btn ghost" data-action="warmup-done">Saltar</button>
      </div>
    </section>`;
}

function setRow(item, set, i) {
  const unit = item.type === 'hold' ? 's' : 'reps';
  const met = Number(set.value) >= (item.goal ?? item.target);
  return `
    <li class="set ${set.done ? 'done' : ''}">
      <span class="set-n">${i + 1}</span>
      <div class="stepper">
        <button class="step-btn" data-action="set-dec" data-set="${i}" aria-label="Menos">${icon('minus', 18)}</button>
        <span class="val ${met ? 'met' : ''}">${set.value}<small>${unit}</small></span>
        <button class="step-btn" data-action="set-inc" data-set="${i}" aria-label="Más">${icon('plus', 18)}</button>
      </div>
      ${item.liftId
        ? `<span class="set-kg">${esc(fmtKg(set.kg).replace(' kg', ''))}<small>kg</small></span>`
        : item.type !== 'hold' ? ''
          : !set.done
            ? `<button class="icon-btn timer-btn" data-action="hold-start" data-set="${i}" aria-label="Cronometrar">${icon('timer', 20)}</button>`
            : '<span class="spacer"></span>'}
      <button class="check-btn ${set.done ? 'on' : ''}" data-action="set-toggle" data-set="${i}" aria-label="${set.done ? 'Desmarcar serie' : 'Serie hecha'}">${icon('check', 22)}</button>
    </li>`;
}

// Pie común: añadir/quitar series, valoración y navegación.
function cardFooter(a, item) {
  const isLast = a.current === a.items.length - 1;
  const anyDone = item.sets.some((s) => s.done);
  return `
      <div class="row between">
        <button class="link" data-action="set-add">${icon('plus', 16)} Añadir serie</button>
        ${item.sets.length > 1 ? `<button class="link muted" data-action="set-remove">Quitar última</button>` : ''}
      </div>
      ${anyDone ? `
        <div class="rate-inline">
          <span class="muted small">¿Qué tal te ha parecido?</span>
          ${ratingButtons(a.current, item.rating, true)}
        </div>` : ''}
      <div class="row gap nav-row">
        <button class="btn ghost square" data-action="session-prev" aria-label="Ejercicio anterior" title="Anterior" ${a.current === 0 ? 'disabled' : ''}>${icon('back', 20)}</button>
        ${isLast
          ? `<button class="btn primary grow" data-action="session-finish">${icon('check', 18)} Finalizar entreno</button>`
          : `<button class="btn ghost grow" data-action="session-next">Siguiente ${icon('next', 18)}</button>`}
      </div>`;
}

// Ejercicio de gimnasio: peso + repeticiones dentro de un rango.
function liftCard(state, a, item) {
  const lift = LIFT_BY_ID[item.liftId];
  const last = lastLift(state, item.liftId);
  const kg = item.kg;
  const lastText = last ? fmtLiftSeries(last.sets, last.loads) : '';
  return `
    <section class="card exercise lift-card">
      <div class="eyebrow">Gimnasio · ${esc(lift.muscle)}</div>
      <h2>${esc(lift.name)}</h2>
      <div class="target-line">
        <span class="pill accent">${icon('target', 16)} Hoy: ${item.plannedSets} × ${esc(unitLabel('reps', item.goal))} · ${esc(fmtKg(kg))}</span>
        <span class="muted small">Descanso ${fmtClock(item.rest)}</span>
      </div>
      <div class="muted small">Rango ${lift.min}–${lift.max} reps dejando ${esc(lift.rir)} en reserva. Cuando hagas ${lift.max} en todas las series, sube ${esc(fmtKg(lift.inc))}.</div>
      ${lastText ? `<div class="muted small">Última vez: ${esc(lastText)}</div>` : ''}
      <div class="load-row">
        <span class="load-label">Peso</span>
        <div class="stepper">
          <button class="step-btn" data-action="load-dec" aria-label="Menos peso">${icon('minus', 18)}</button>
          <label class="load-field">
            <input class="load-input" type="text" inputmode="decimal" autocomplete="off" value="${esc(kgInput(kg))}" placeholder="—" data-change="load-set" aria-label="Peso en kg">
            <small>kg</small>
          </label>
          <button class="step-btn" data-action="load-inc" aria-label="Más peso">${icon('plus', 18)}</button>
        </div>
      </div>
      ${kg == null ? '<p class="muted small">Apunta el peso con el que trabajas: la app te dirá cuándo subirlo.</p>' : ''}
      ${videoCard({ name: lift.name, video: lift.video || null, query: `${lift.name} técnica gimnasio` })}
      <details class="cues">
        <summary>${icon('info', 18)} Claves técnicas</summary>
        <ul>${lift.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </details>
      <ol class="sets">${item.sets.map((s, i) => setRow(item, s, i)).join('')}</ol>
      ${cardFooter(a, item)}
    </section>`;
}

function exerciseCard(state, a) {
  const item = a.items[a.current];
  if (item.liftId) return liftCard(state, a, item);
  const roadmap = ROADMAP_BY_ID[item.roadmapId];
  const step = roadmap.steps[item.stepIndex];
  const last = lastPerformance(state, item.roadmapId, item.stepIndex);
  const goal = item.goal ?? item.target;
  return `
    <section class="card exercise">
      <div class="eyebrow">${esc(roadmap.name)} · paso ${item.stepIndex + 1}/${roadmap.steps.length}</div>
      <h2>${esc(step.name)}</h2>
      <div class="target-line">
        <span class="pill accent">${icon('target', 16)} Hoy: ${item.plannedSets} × ${esc(unitLabel(item.type, goal))}${item.side ? ' por lado' : ''}</span>
        <span class="muted small">Descanso ${fmtClock(item.rest)}</span>
      </div>
      ${goal < item.target ? `<div class="muted small">Meta del paso: ${item.plannedSets} × ${esc(unitLabel(item.type, item.target))}. Tu valoración decide cuánto sube el objetivo.</div>` : ''}
      ${last ? `<div class="muted small">Última vez: ${esc(fmtSeries(item.type, last))}</div>` : ''}
      ${videoCard(step, roadmap.name)}
      <details class="cues">
        <summary>${icon('info', 18)} Claves técnicas</summary>
        <ul>${step.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </details>
      ${item.side ? '<p class="muted small">Haz cada serie con los dos lados y apunta el lado más débil.</p>' : ''}
      <ol class="sets">${item.sets.map((s, i) => setRow(item, s, i)).join('')}</ol>
      ${cardFooter(a, item)}
    </section>`;
}

function ratingButtons(index, current, compact = false) {
  return `<div class="rate-opts ${compact ? 'compact' : ''}" role="radiogroup" aria-label="Dificultad">${Object.entries(RATINGS).map(([key, r]) => `
    <button class="rate-btn ${key} ${current === key ? 'on' : ''}" role="radio" aria-checked="${current === key}"
      data-action="rate" data-item="${index}" data-value="${key}">
      <strong>${esc(r.label)}</strong>${compact ? '' : `<small>${esc(r.hint)}</small>`}
    </button>`).join('')}</div>`;
}

let lastPrompt = null;
function ratePanel(a) {
  if (a.ratePrompt == null) { lastPrompt = null; return ''; }
  const appear = lastPrompt !== a.ratePrompt;
  lastPrompt = a.ratePrompt;
  const item = a.items[a.ratePrompt];
  if (!item) return '';
  return `
    <div class="rate-panel">
      <div class="rate-q ${appear ? 'appear' : ''}">${a.finishing ? '<span class="eyebrow">Antes de terminar</span>' : ''}
        ¿Qué tal te ha parecido <strong>${esc(itemName(item))}</strong>?</div>
      ${ratingButtons(a.ratePrompt, item.rating)}
      <button class="link muted" data-action="rate-later">${a.finishing ? 'Omitir' : 'Ahora no'}</button>
    </div>`;
}

function bottomSheet(a) {
  const rating = ratePanel(a);
  if (!a.rest && !rating) { sheetShown = false; return ''; }
  const appear = !sheetShown;
  sheetShown = true;
  const remaining = a.rest ? Math.max(0, (a.rest.endsAt - Date.now()) / 1000) : 0;
  return `
    <div class="rest-bar ${rating ? 'with-rate' : ''} ${appear ? 'appear' : ''}" ${a.rest ? 'role="timer"' : ''}>
      ${a.rest ? `
        <div class="rest-progress"><span data-tick="rest-bar" style="width:${(remaining / a.rest.total) * 100}%"></span></div>
        <div class="row between">
          <div>
            <div class="eyebrow">Descanso</div>
            <div class="rest-clock" data-tick="rest">${fmtClock(Math.ceil(remaining))}</div>
          </div>
          <div class="row gap">
            <button class="btn ghost small" data-action="rest-add">+15 s</button>
            <button class="btn primary small" data-action="rest-skip">Saltar</button>
          </div>
        </div>` : ''}
      ${rating}
    </div>`;
}

function holdOverlay(a) {
  if (!a.hold) return '';
  const item = a.items[a.hold.item];
  const step = ROADMAP_BY_ID[item.roadmapId].steps[item.stepIndex];
  return `
    <div class="hold-overlay" role="dialog" aria-label="Cronómetro de isometría">
      <div class="eyebrow">${esc(step.name)} · serie ${a.hold.set + 1}</div>
      <div class="hold-phase" data-tick="hold-phase">Prepárate</div>
      <div class="hold-clock" data-tick="hold">3</div>
      <div class="muted">Objetivo: ${item.goal ?? item.target} s</div>
      <button class="btn primary huge" data-action="hold-stop">Parar</button>
      <button class="btn ghost" data-action="hold-cancel">Cancelar</button>
    </div>`;
}

export function render() {
  const state = getState();
  const a = state.active;
  if (!a) {
    return `
      <div class="empty">
        <p>No hay ningún entreno en curso.</p>
        <a class="btn primary" href="#/">Volver a Hoy</a>
      </div>`;
  }
  return `
    <header class="session-head">
      <button class="icon-btn" data-action="session-leave" aria-label="Salir">${icon('close')}</button>
      <div class="center">
        <div class="eyebrow">Tiempo</div>
        <div class="clock" data-tick="elapsed">${fmtClock((Date.now() - a.startedAt) / 1000)}</div>
      </div>
      <button class="btn primary small" data-action="session-finish">Terminar</button>
    </header>
    ${chips(a)}
    ${a.warmupDone ? exerciseCard(state, a) : warmupCard(a)}
    <div class="center session-foot">
      <button class="link muted" data-action="session-discard">Descartar entreno</button>
    </div>
    ${bottomSheet(a)}
    ${holdOverlay(a)}
  `;
}

export function tick(ctx) {
  const a = getState().active;
  if (!a) return;
  const now = Date.now();
  const elapsed = document.querySelector('[data-tick="elapsed"]');
  if (elapsed) elapsed.textContent = fmtClock((now - a.startedAt) / 1000);

  if (a.rest) {
    const remaining = (a.rest.endsAt - now) / 1000;
    if (remaining <= 0) {
      audio.beep({ times: 3 });
      vibrate([200, 100, 200]);
      update((s) => { s.active.rest = null; }, { silent: true });
      ctx.rerender();
      return;
    }
    const clock = document.querySelector('[data-tick="rest"]');
    const sec = Math.ceil(remaining);
    if (clock && clock.textContent !== fmtClock(sec)) {
      clock.textContent = fmtClock(sec);
      if (sec <= 5 || sec % 10 === 0) beat(clock);
    }
    const bar = document.querySelector('[data-tick="rest-bar"]');
    if (bar) bar.style.width = `${(remaining / a.rest.total) * 100}%`;
  }

  if (a.hold) {
    const item = a.items[a.hold.item];
    const ms = now - a.hold.startsAt;
    const phase = document.querySelector('[data-tick="hold-phase"]');
    const clock = document.querySelector('[data-tick="hold"]');
    if (ms < 0) {
      if (phase) phase.textContent = 'Prepárate';
      const n = String(Math.ceil(-ms / 1000));
      if (clock && clock.textContent !== n) { clock.textContent = n; beat(clock); }
    } else {
      if (beeped.holdStart !== a.hold.startsAt) {
        beeped.holdStart = a.hold.startsAt;
        audio.beep({ times: 1, freq: 660 });
      }
      const secs = Math.floor(ms / 1000);
      const goal = item.goal ?? item.target;
      if (secs >= goal && beeped.holdTarget !== a.hold.startsAt) {
        beeped.holdTarget = a.hold.startsAt;
        audio.beep({ times: 2, freq: 1046 });
        vibrate(200);
        burst(clock, { text: '¡OBJETIVO!', color: 'cyan', big: true });
      }
      if (phase) {
        phase.textContent = secs >= goal ? '¡Objetivo conseguido!' : '¡Aguanta!';
        phase.classList.toggle('met', secs >= goal);
      }
      if (clock && clock.textContent !== String(secs)) {
        clock.textContent = String(secs);
        beat(clock);
      }
    }
  }
}

function startRest(s, item) {
  s.active.rest = { endsAt: Date.now() + item.rest * 1000, total: item.rest };
}

function completeSet(s, itemIndex, setIndex) {
  const a = s.active;
  const item = a.items[itemIndex];
  item.sets[setIndex].done = true;
  a.lastActivityAt = Date.now();
  const allDone = a.items.every(itemComplete);
  if (!allDone) startRest(s, item);
  else a.rest = null;
  // Si el ejercicio queda completo, pregunta la dificultad (durante el descanso)
  // y pasa al siguiente ejercicio pendiente.
  if (itemComplete(item)) {
    if (!item.rating) a.ratePrompt = itemIndex;
    const next = a.items.findIndex((it, i) => i > itemIndex && !itemComplete(it));
    const any = next >= 0 ? next : a.items.findIndex((it) => !itemComplete(it));
    if (any >= 0) a.current = any;
  }
}

function adjust(el, delta) {
  update((s) => {
    const item = s.active.items[s.active.current];
    const set = item.sets[Number(el.dataset.set)];
    set.value = Math.max(0, (Number(set.value) || 0) + delta);
  });
}

// Cambia el peso del ejercicio actual (y de las series que faltan por hacer).
function setLoad(s, kg) {
  const item = s.active.items[s.active.current];
  if (!item?.liftId) return;
  item.kg = kg;
  for (const set of item.sets) if (!set.done) set.kg = kg;
}

function changeLoad(dir) {
  update((s) => {
    const item = s.active.items[s.active.current];
    const lift = LIFT_BY_ID[item?.liftId];
    if (!lift) return;
    const base = Number(item.kg) || 0;
    setLoad(s, Math.max(0, Math.round((base + dir * lift.inc) * 100) / 100));
  });
  bump(document.querySelector('.load-field'));
}

export const changes = {
  'load-set'(el) {
    const kg = parseKg(el.value);
    if (Number.isNaN(kg)) { toast('Escribe el peso en kg, por ejemplo 62,5'); return; }
    update((s) => setLoad(s, kg));
  },
};

function finish({ skipChecks = false } = {}) {
  const a = getState().active;
  if (!a) return;
  if (!skipChecks) {
    const anyDone = a.items.some((it) => it.sets.some((s) => s.done));
    if (!anyDone) {
      if (confirm('No has completado ninguna serie. ¿Descartar este entreno?')) discard();
      return;
    }
    const pending = a.items.some((it) => !itemComplete(it));
    if (pending && !confirm('Quedan series sin completar. ¿Terminar el entreno igualmente?')) return;
    // Antes de cerrar, pide la valoración de los ejercicios que falten.
    const unrated = nextUnrated(a);
    if (unrated != null) {
      update((s) => { s.active.finishing = true; s.active.ratePrompt = unrated; s.active.rest = null; });
      return;
    }
  }
  const xpBefore = totalXP(getState());
  const session = finishActiveSession();
  // Recompensas del héroe: XP, nivel, logros y artículos nuevos.
  let reward = null;
  update((s) => {
    const fresh = syncAchievements(s);
    const xpAfter = totalXP(s);
    const levelBefore = levelInfo(xpBefore).level;
    const levelAfter = levelInfo(xpAfter).level;
    reward = { xp: xpAfter - xpBefore, levelBefore, levelAfter, achievements: fresh, items: itemsUnlockedBy(levelBefore, levelAfter, fresh) };
    const rec = s.sessions.find((x) => x.id === session.id);
    if (rec) rec.game = reward;
  }, { silent: true });
  wakeLock.release();
  const loadUps = session.items.some((it) => it.outcome?.kind === 'load-up');
  pendingCelebration = session.levelUps.length > 0 || loadUps || reward.levelAfter > reward.levelBefore || reward.achievements.length > 0;
  navigate(`#/resumen/${session.id}`, { replace: true });
}

// Si estaba valorando para terminar y vuelve a los ejercicios, cancela el cierre.
function exitFinishing(s) {
  if (!s.active.finishing) return;
  s.active.finishing = false;
  s.active.ratePrompt = null;
}

function afterRating() {
  const a = getState().active;
  if (a?.finishing && a.ratePrompt == null) finish({ skipChecks: true });
}

function discard() {
  update((s) => { s.active = null; });
  wakeLock.release();
  navigate('#/', { replace: true });
}

export const actions = {
  'session-leave'() { navigate('#/'); },
  'session-finish'() { finish(); },
  'session-discard'() {
    if (confirm('¿Descartar este entreno? No se guardará nada.')) discard();
  },
  'session-goto'(el) {
    const i = Number(el.dataset.index);
    update((s) => {
      exitFinishing(s);
      if (i < 0) s.active.warmupDone = false;
      else { s.active.warmupDone = true; s.active.current = i; }
    });
    window.scrollTo({ top: 0 });
  },
  'session-prev'() {
    update((s) => { exitFinishing(s); s.active.current = Math.max(0, s.active.current - 1); });
    window.scrollTo({ top: 0 });
  },
  'session-next'() {
    update((s) => { s.active.current = Math.min(s.active.items.length - 1, s.active.current + 1); });
    window.scrollTo({ top: 0 });
  },
  'warmup-check'(el) {
    const i = Number(el.dataset.i);
    update((s) => {
      const checks = s.active.warmupChecks;
      const at = checks.indexOf(i);
      if (at >= 0) checks.splice(at, 1); else checks.push(i);
    });
  },
  'warmup-done'() {
    audio.unlock();
    update((s) => { s.active.warmupDone = true; s.active.lastActivityAt = Date.now(); });
    window.scrollTo({ top: 0 });
  },
  'set-inc'(el) { adjust(el, 1); bump(document.querySelectorAll('.set .val')[Number(el.dataset.set)]); },
  'set-dec'(el) { adjust(el, -1); bump(document.querySelectorAll('.set .val')[Number(el.dataset.set)]); },
  'set-toggle'(el) {
    audio.unlock();
    const i = Number(el.dataset.set);
    const before = getState().active.current;
    const wasDone = getState().active.items[before].sets[i].done;
    const rect = el.getBoundingClientRect();
    update((s) => {
      const a = s.active;
      const set = a.items[a.current].sets[i];
      if (set.done) {
        set.done = false;
      } else {
        completeSet(s, a.current, i);
      }
    });
    if (!wasDone) {
      burst({ getBoundingClientRect: () => rect });
      if (getState().active.current === before) replay(document.querySelectorAll('.check-btn')[i], 'stamp');
    }
    if (getState().active.current !== before) window.scrollTo({ top: 0 });
  },
  'set-add'() {
    update((s) => {
      const item = s.active.items[s.active.current];
      const last = item.sets[item.sets.length - 1];
      const set = { value: last ? last.value : item.goal ?? item.target, done: false };
      if (item.liftId) set.kg = item.kg;
      item.sets.push(set);
    });
  },
  'load-inc'() { changeLoad(1); },
  'load-dec'() { changeLoad(-1); },
  'set-remove'() {
    update((s) => {
      const item = s.active.items[s.active.current];
      if (item.sets.length > 1) item.sets.pop();
    });
  },
  'rate'(el) {
    const i = Number(el.dataset.item);
    const value = el.dataset.value;
    update((s) => {
      const a = s.active;
      a.items[i].rating = value;
      a.items[i].rateSkipped = false;
      if (a.ratePrompt === i) a.ratePrompt = a.finishing ? nextUnrated(a) : null;
    });
    burst(el, { text: RATING_WORDS[value], color: RATING_COLORS[value] });
    toast(`Anotado: ${RATINGS[value].label}`);
    afterRating();
  },
  'rate-later'() {
    update((s) => {
      const a = s.active;
      if (a.finishing && a.ratePrompt != null) {
        a.items[a.ratePrompt].rateSkipped = true;
        a.ratePrompt = nextUnrated(a);
      } else {
        a.ratePrompt = null;
      }
    });
    afterRating();
  },
  'rest-add'() {
    update((s) => {
      if (!s.active.rest) return;
      s.active.rest.endsAt += 15_000;
      s.active.rest.total += 15;
    });
  },
  'rest-skip'() {
    update((s) => { s.active.rest = null; });
  },
  'hold-start'(el) {
    audio.unlock();
    const set = Number(el.dataset.set);
    update((s) => {
      s.active.rest = null;
      s.active.hold = { item: s.active.current, set, startsAt: Date.now() + HOLD_COUNTDOWN };
    });
  },
  'hold-stop'() {
    const before = getState().active.current;
    update((s) => {
      const a = s.active;
      if (!a.hold) return;
      const secs = Math.floor((Date.now() - a.hold.startsAt) / 1000);
      const { item, set } = a.hold;
      a.hold = null;
      if (secs <= 0) return;
      a.items[item].sets[set].value = secs;
      completeSet(s, item, set);
    });
    burst(null, { big: true });
    if (getState().active.current !== before) window.scrollTo({ top: 0 });
  },
  'hold-cancel'() {
    update((s) => { s.active.hold = null; });
  },
};
