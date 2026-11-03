# Arquitectura

PWA estática sin compilación, con módulos ES nativos y JavaScript sin frameworks. Para probarla en local: `python3 -m http.server`.

## Mapa de archivos

```
index.html               Shell y tab bar (Hoy · Calendario · Rutas · Héroe · Progreso). Ajustes = engranaje de las cabeceras.
                         Script en línea que aplica el tema guardado antes de pintar.
sw.js                    Service worker (VERSION, ASSETS; ignora peticiones de otros orígenes)
manifest.webmanifest     PWA
css/styles.css           Todo el estilo: tema cómic, tema pixel («Héroe en pixel art») y @media (max-width: 359px)
fonts/                   Bangers (cómic), Press Start 2P y VT323 (pixel): OFL, autoalojadas
icons/                   Iconos de la app
js/app.js                Rutas, delegación de eventos (data-action / data-change), tick de 250 ms,
                         logros al cargar, tema, pixelCaps() y actualización de la app
js/version.js            APP_VERSION (igual que VERSION de sw.js) y versionLabel()
js/theme.js              applyTheme (data-theme en <html> y meta theme-color), effectiveTheme, fadeToTheme y
                         headActions: botones de tema (sol/luna) y Ajustes de las cabeceras de las 5 pestañas
js/router.js             Router por hash
js/store.js              Estado en localStorage (clave 'calisthenic-flow:v1'), normalize y migración v1→v2
js/logic.js              Sesiones, progresión doble (también con kg), descansos, descarga y estadísticas
js/schedule.js           Plan semanal: nivel, días recomendados, reparto A/B/S o torso/pierna (gymDays),
                         todayInfo, DAY_INFO y dayLabel
js/game.js               XP, niveles y títulos, atributos, 46 logros, 33 artículos y syncAchievements
js/avatar.js             Héroe en pixel art de 40×48 por capas (avatarSVG)
js/pixel.js              Motor de pixel art (Grid, contorno y sombreado automáticos, toSVG) e iconos de 16×16
js/fx.js                 Efectos y animaciones: burst, bump/beat, flash, stagger, staggerLists, tap, countUp,
                         reveal y confetti (ver diseno.md, «Animaciones»)
js/video.js              Tarjeta de vídeo y modal con iframe de youtube-nocookie
js/device.js             Audio (WebAudio, se desbloquea con un toque), vibración y wake lock
js/ui.js                 esc, formatos (fmtKg, parseKg, fmtSeries, fmtLiftSeries, fmtDurationHtml…), iconos SVG y toast
js/charts.js             Gráficas SVG (barras semanales y línea de progreso)
js/data/roadmaps.js      14 rutas / 116 pasos, DAY_TEMPLATES (A, B, S, TA, TB) y WARMUP
js/data/videos.js        Vídeo por paso ('ruta/key'): 87 de 116, y los 9 de gimnasio ('gym/<id>')
js/data/legacy.js        Nombres de los pasos de v1, para migrar el progreso
js/data/gym.js           LIFTS (9 ejercicios con kg), LEG_DAYS (P = rutina completa) y LEG_WARMUP
js/views/*.js            home, session, roadmaps, progress (resumen y detalle), calendar, settings,
                         onboarding (bienvenida paso a paso), hero (logros y equipo), plan, exercise (ficha de gimnasio)
                         y skills (piezas comunes de foco y mantenimiento: selector, avisos y sus acciones)
docs/                    Investigación con fuentes (investigacion-*.md) y esta referencia (referencia/)
tests/e2e/               Pruebas Playwright y fixtures.js (ver la skill pruebas-e2e)
tests/tools/             simular-actualizacion.js y la auditoría de diseño (ver la skill revisar-diseno)
.claude/skills/          Procedimientos: publicar, revisar-diseno y pruebas-e2e
.github/workflows/e2e.yml  CI: Chromium y WebKit en cada push
```

## Patrones del código

- **Pintar:** cada vista devuelve un texto HTML y `app.js` lo inserta en `#view`.
  - Cualquier `update()` del store vuelve a pintar la vista actual. Con `{ silent: true }` no lo hace.
  - La animación de entrada solo se lanza al **cambiar de ruta**, con la clase `.enter`, `data-dir` (`r`, `l` o `up`, según `routeDir`) y la variable `--i` para el escalonado.
  - Como cada `update()` sustituye el HTML, las transiciones CSS no se ven al cambiar un estado. Para eso, tras cada acción `app.js` aplica `tap()` (clase `.tapped`) al elemento tocado o a su copia nueva, buscada por sus atributos `data-*`; el CSS decide qué elementos rebotan.
- **Acciones:** `data-action="nombre"` en el HTML y su función en el objeto `actions` exportado por la vista. `app.js` las junta todas. Los cambios de formularios van con `data-change`.
- **Volver:** `data-action="go-back" data-fallback="#/…"` hace `history.back()`, o va a la ruta indicada si no hay historial.
- **Escapar** con `esc()` todo lo que venga del usuario.
- **Datos derivados:** la XP, los atributos y las estadísticas se calculan siempre a partir del historial. Solo se guardan las fechas de los logros desbloqueados (`state.game.unlocked`).
- **El progreso se guarda por índice de paso** (`progress[id].step`). Si se insertan o se quitan pasos, hay que añadir una migración en `store.js`: subir `DATA_VERSION` y usar los nombres antiguos o `was: [...]` en los pasos.
- **Pesos en kg:** se escriben en campos `type="text" inputmode="decimal"` y se leen con `parseKg` y `kgInput`. Con `type=number`, iOS rompe la coma.

## Modelo de estado

```js
{ version: 2, onboarded,
  settings: { focus, maintain[≤2], goals,                             // goals = [focus, ...maintain], derivada (setSkills)
              daysPerWeek, passesToLevelUp, sound, warmup, legs: 'calistenia'|'gym',
              theme: 'auto'|'light'|'dark', schedule: { days[7 bool] } | null,
              restMode: 'fixed'|'auto', restSec,                      // descanso: fijo (80 s por defecto) o por ejercicio
              holdPrep },                                             // cuenta atrás de las isometrías (5 s)
  progress: { [rutaId]: { step, passes, done, work, stall, resets } },   // work = objetivo actual por serie
  lifts: { [liftId]: { kg, reps, stall } },                              // gimnasio: peso y reps objetivo
  levelLog[], sessions[] (de la más antigua a la más reciente), active, plan, lastDayType,
  deload: { start, until }, deloadSnoozeUntil,
  weekMoves: { start, sig, from[7] } | null,   // entrenos movidos de día solo esta semana (ver reglas-entrenamiento.md)
  notices: { skills?, focusDone? },             // aviso de foco y mantenimiento pendiente; propuesta de «ya la tienes» descartada
  game: { name, unlocked: { achId: isoDate }, equipped: { slot: itemId }, look: { skin, hair, hairStyle }, videosWatched } }
```

- **Cada sesión del historial** guarda:
  - `items[]`;
  - `levelUps`, `deload` y `warmupFull`;
  - `game`, con `xp`, `levelBefore`, `levelAfter`, `achievements` e `items`.
- **Ítem de calistenia:** `roadmapId`, `stepIndex`, `type`, `target`, `goal`, `sets[]`, `rating`, `met`, `goalMet` y `outcome`.
  - `role: 'foco' | 'mantener'` si es una de tus habilidades; `trimmed` en el entreno si lleva una serie menos (sustituir en vez de sumar).
- **Complementario:** `accessoryOf` (la habilidad), `acc` (`'ruta/key'` o un id de `EXTRA_EXERCISES`), `prep`, `type`, `target`, `goal`, `plannedSets` y `sets[]`. Sin `roadmapId`, para que no haga progresar ninguna ruta, y sin valoración.
- **Entreno en curso:** `warmupKind` (`'base' | 'pierna' | 'pino'`) y `warmupExtra` (calentamiento según las habilidades, guardado al crearlo porque las casillas van por índice). `dayType: 'pino'` es «Solo pino», que no cuenta como entreno de la semana (`isWorkout`).
- **Ítem de gimnasio:** `liftId` en vez de `roadmapId`/`stepIndex`, y además `min`, `max`, `goal`, `sets` (reps), `loads` (kg por serie) y `outcome`.
  - Sus `outcome` posibles son `load-up`, `up`, `keep`, `consolidate`, `down`, `load-down`, `reset`, `no-kg` y `deload`.
  - Para pintar cualquier ítem, usa `itemName()` (logic.js) e `itemBlock()` / `liftPills()` (progress.js).
- **`dayType`** puede ser `A`, `B`, `S`, `TA`, `TB`, `P` o `libre`, y `PA`/`PB` en sesiones antiguas. Para mostrarlo, usa `dayLabel()` (schedule.js).
- **`active`** (el entreno en curso) guarda:
  - `items` y `current`;
  - `warmupDone`, `warmupChecks` y `warmupKind` (`'pierna'` si todos los ejercicios son de gimnasio);
  - `rest` (`{ endsAt, total }`), `hold` y `ratePrompt`;
  - `finishing` (al terminar se preguntan las valoraciones que faltan).

## Despliegue y actualizaciones

- **Repositorio:** `MartianFlow/Calisthenic-Flow` (público), rama `main`. Se sube directamente a `main`.
- **GitHub Pages:** *Deploy from a branch → main → / (root)*, en `https://martianflow.github.io/Calisthenic-Flow/`. Cada push lanza «pages build and deployment».
- **Instalación en el iPhone:** Safari → Compartir → Añadir a pantalla de inicio.
- **Service worker** (desde la versión 9):
  - Pide **primero a la red** con `cache: 'no-cache'`. Si no hay conexión o pasan 3 s, usa la caché.
  - Instala con `cache: 'reload'`, para no coger la caché HTTP de GitHub Pages (10 min).
- **Recarga automática:**
  - Al volver a la app (`visibilitychange`), se llama a `reg.update()`.
  - Si una versión nueva toma el control (`controllerchange`), la app se recarga sola. Durante un entreno espera a salir de `/entreno` (`pendingReload`).
- **En Ajustes** se ve la versión y hay un botón «Actualizar la app».
- **Versión:** está en dos sitios, `VERSION` de `sw.js` y `APP_VERSION` de `js/version.js`. Una prueba comprueba que coincidan. Hay que subirla en cada publicación (ver la skill `publicar`).
  - Sin subirla, al abrir la app en frío ya se ve lo nuevo, pero al volver de segundo plano no se recarga sola.
- **`ASSETS` de `sw.js`:** cada archivo nuevo de la app tiene que estar en la lista. Si falta uno, la instalación falla entera y se queda la versión vieja.
- **Paso de la 8 a la 9:** el service worker antiguo servía primero la caché, así que la versión nueva se veía a la **segunda** apertura.

## Limitaciones del entorno cloud

- **Bloqueados por el proxy:** youtube.com, i.ytimg.com, reddit.com y github.io.
  - No se pueden verificar los vídeos ni la web publicada.
  - Las miniaturas fallan en las pruebas, y es normal.
  - El despliegue se comprueba con la API: `curl -s "https://api.github.com/repos/MartianFlow/Calisthenic-Flow/actions/runs?per_page=4"`.
- **Disponibles:** fonts.googleapis.com, gstatic, npm y GitHub (git y MCP).
- **WebSearch:** tiene un límite de 200 búsquedas por turno, compartido con los subagentes.
- **Navegadores:** solo hay Chromium. WebKit corre en CI.
- **Servidor local:**
  - Para levantarlo: `(python3 -m http.server 8765 &)`.
  - Para pararlo: `pkill -f "^python3 -m http.server 8765"`. Con el `^`, porque sin él el patrón coincide con el propio comando y mata el shell.

## Bienvenida paso a paso (`js/views/onboarding.js`)

- **Pasos** (`steps(state)`, se recalculan en cada pintura): portada · experiencia · pierna · nivel de cada básico (sin `piernas` ni `bisagra` con la pierna en el gimnasio) · habilidades que ya domina (mantener) · la que quiere aprender (foco, con recomendadas si no domina ninguna) · nivel de cada una · días · entreno (descanso, calentamiento y sonido) · héroe · resumen.
- **Cada respuesta se guarda al momento** en el estado. El módulo solo recuerda el paso en curso y la experiencia elegida, en `sessionStorage` (`calisthenic-flow:bienvenida`), para que iOS pueda recargar la app a mitad sin volver a empezar. `resetWizard()` lo borra al terminar y al «Borrar todos los datos».
- **Experiencia:** `EXPERIENCE` fija un paso de partida para cada básico; luego se afina ruta por ruta. Elegir otra vez la misma experiencia no toca los niveles.
- **Cambiar desde el resumen** (`wiz.editing`): «Cambiar» y las pastillas de cada ruta abren solo esa pregunta. Al guardar, con atrás o al elegir una opción única, `move()` vuelve directo al resumen. Lo pidió el usuario: antes tenía que repasar todas las preguntas.
- **Días:** al llegar por primera vez, propone los días recomendados (`recommendDays`).
- **Habilidades:** `wiz-keep`, `wiz-keep-none` y `wiz-focus` llaman a `setFocus` / `toggleMaintain` / `clearMaintain` de skills.js. Elegir foco o «Aún no domino ninguna» avanza solo.
- **Reutiliza** acciones de otras vistas: `set-setting`, `toggle-setting`, `rest-*` (settings.js), `plan-day` (plan.js), `look` (hero.js), `video-open` e `import-data`.
