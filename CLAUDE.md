# Calisthenic Flow — contexto del proyecto

Documento de referencia para continuar el trabajo en sesiones futuras. Resume qué es la app, cómo está hecha, las decisiones tomadas y lo que queda pendiente. El README es la guía de uso; este archivo es la guía para desarrollar.

## El usuario y lo que quiere

- Habla **español**: toda la UI, los textos, los commits y las respuestas van en español.
- App **personal** de calistenia para su **iPhone**, como alternativa a una app de suscripción (Calisteniapp). No quiere pagar suscripción ni cuenta de desarrollador de Apple.
- **Privacidad:** "solo yo puedo ver mis datos". Se cumple porque todo vive en el `localStorage` del iPhone: sin servidor, sin cuentas y sin datos en GitHub.
- **Lo que pidió, en orden:**
  1. Progresiones por habilidad tipo hoja de ruta y tiempo de entreno.
  2. Calendario con los días entrenados.
  3. Valoración Fácil / Normal / Difícil de cada ejercicio, **preguntada durante el descanso**.
  4. Investigación exhaustiva sobre cómo progresar.
  5. Vídeo de YouTube por ejercicio.
  6. Diseño de cómic de alto contraste inspirado en Hi-Fi Rush, con animaciones.
  7. Gamificación: logros, artículos y un personaje que mejora.
  8. Plan semanal recomendado según sus objetivos.
  9. Pruebas e2e.
  10. Héroe, artículos y logros en **pixel art estilo Zelda**. Se hizo un estilo RPG retro **original**, sin copiar elementos de Zelda (nada de rupias, Trifuerza ni la ropa de Link).
- Después de la última sesión dijo que tiene **preguntas y ajustes pendientes**.

## Despliegue

- **Repositorio:** `MartianFlow/Calisthenic-Flow` (público), rama `main`. Se trabaja y se sube directamente a `main`, que es lo que el usuario espera.
- **Publicación:** GitHub Pages con *Deploy from a branch → main → / (root)*, en `https://martianflow.github.io/Calisthenic-Flow/`.
  - El usuario debía activarlo a mano y dijo "listo", pero no se ha podido verificar: github.io está bloqueado desde el entorno cloud.
- **Instalación en el iPhone:** Safari → Compartir → Añadir a pantalla de inicio.
- **Actualizaciones:** el service worker sirve primero la caché y actualiza en segundo plano, así que los cambios se ven la **segunda vez** que se abre la app.
  - **Al añadir archivos**, hay que incluirlos en `ASSETS` de `sw.js` y subir `VERSION` (ahora `cf-v5`).

## Arquitectura

PWA estática sin build. Usa ES modules nativos y vanilla JS. Para probarla en local: `python3 -m http.server`.

```
index.html               Shell, tab bar (Hoy · Calendario · Rutas · Héroe · Progreso). Ajustes = engranaje en Hoy/Héroe
sw.js                    Service worker (caché de la app; ignora peticiones de otros orígenes)
manifest.webmanifest     PWA
css/styles.css           Todo el estilo: tema cómic + tema pixel (sección "Héroe en pixel art")
fonts/                   Bangers (cómic), Press Start 2P y VT323 (pixel) — OFL, autoalojadas
icons/                   Iconos de la app (explosión amarilla con barras)
js/app.js                Rutas hash, delegación de eventos (data-action / data-change), tick 250 ms, sync de logros al cargar
js/router.js             Router por hash
js/store.js              Estado en localStorage (clave 'calisthenic-flow:v1'), normalize + migración v1→v2
js/logic.js              Sesiones, progresión doble, descansos, descarga, estadísticas
js/schedule.js           Plan semanal (recomendación de días, reparto A/B/S, reglas de brazos rectos, todayInfo)
js/game.js               XP, niveles/títulos, atributos, 43 logros, 33 artículos, syncAchievements
js/avatar.js             Héroe en pixel art 40×48 generado por capas (API avatarSVG)
js/pixel.js              Motor de pixel art (Grid, contorno/sombreado automáticos, toSVG) + iconos 16×16
js/fx.js                 Efectos de cómic (onomatopeyas, bump/beat, flash, stagger)
js/video.js              Tarjeta de vídeo + modal con iframe youtube-nocookie (fuera de #view)
js/device.js             Audio (WebAudio, desbloqueo por gesto), vibración, wake lock
js/ui.js                 esc, formatos, iconos SVG de trazo, toast, progressBar
js/charts.js             Gráficas SVG (barras semanales, línea de progreso)
js/data/roadmaps.js      Contenido: 14 rutas / 116 pasos, DAY_TEMPLATES, WARMUP
js/data/videos.js        Vídeo por paso (clave 'ruta/key') — 87 de 116
js/data/legacy.js        Nombres de pasos v1 para migrar progreso
js/views/*.js            home, session, roadmaps, progress (+resumen/detalle), calendar, settings (+onboarding), hero (+logros/equipo), plan
docs/                    Investigación con fuentes (principios y progresiones)
tests/e2e/               36 pruebas Playwright + fixtures.js
.github/workflows/e2e.yml  CI: Chromium + WebKit en cada push
```

### Patrones del código

- **Render:** cada vista devuelve un string HTML y `app.js` lo inserta en `#view`.
  - Cualquier `update()` del store vuelve a pintar la vista actual. Con `{ silent: true }` no lo hace.
  - La animación de entrada solo se lanza al **cambiar de ruta**: clase `.enter` y variable `--i` para el escalonado.
- **Acciones:** `data-action="nombre"` en el HTML y un handler en el `actions` exportado por la vista. Todas se combinan en `app.js`. Los cambios de formularios van con `data-change`.
- **Escapar todo** lo que venga del usuario con `esc()`.
- **Datos derivados:** la XP, los atributos y las estadísticas se calculan siempre a partir del historial. Solo se guardan las fechas de los logros desbloqueados (`state.game.unlocked`).
- **El progreso se guarda por índice de paso** (`progress[id].step`). Si se insertan o quitan pasos, hay que añadir una migración en `store.js`: subir `DATA_VERSION` y usar los nombres antiguos o `was: [...]` en los pasos.

### Modelo de estado (resumen)

```js
{ version: 2, onboarded,
  settings: { goals[≤3], daysPerWeek, passesToLevelUp (habilidades), sound, warmup, schedule: { days[7 bool] } | null },
  progress: { [rutaId]: { step, passes, done, work, stall, resets } },   // work = objetivo por serie actual
  levelLog[], sessions[], active, plan, lastDayType, deload: { start, until }, deloadSnoozeUntil,
  game: { name, unlocked: { achId: isoDate }, equipped: { slot: itemId }, look: { skin, hair, hairStyle }, videosWatched } }
```

Cada sesión del historial guarda:
- `items[]`, y cada uno lleva `roadmapId`, `stepIndex`, `type`, `target`, `goal`, `sets[]`, `rating`, `met`, `goalMet` y `outcome`.
- `levelUps`, `deload`, `warmupFull` y `game`. Este último tiene `xp`, `levelBefore`, `levelAfter`, `achievements` e `items`.

## Reglas de entrenamiento (basadas en la investigación de `docs/`)

- **Progresión doble.**
  - **Meta del paso:** casi siempre 3×8 en fuerza y de 3×8 a 15 s en las isometrías de habilidad.
  - **Objetivo de trabajo inicial:** el 60 % de la meta, o el mínimo de la última vez si ya hay registros.
- **Valoración = repeticiones en reserva (RIR):** Fácil = 3 o más, Normal = 1–2, Difícil = 0 o técnica rota.
- **Por debajo de la meta:**
  - **Fácil:** +2 reps; en holds, +18 % (mínimo 3 s).
  - **Normal:** +1 rep; en holds, +10 % (mínimo 2 s).
  - **En brazos rectos** (`straightArm`: front lever, planche, back lever), solo +2 s con Fácil y +1 s con Normal.
  - **Difícil cumpliendo el objetivo:** se mantiene.
  - **Difícil sin llegar:** el objetivo pasa al **mínimo conseguido**.
- **En la meta:**
  - **Fácil:** pasa al siguiente paso.
  - **Normal:** cuenta como sesión superada. Hace falta 1 en las rutas de **fuerza** y `passesToLevelUp` (2 por defecto) en **habilidades**.
  - **Difícil:** consolidar en el mismo paso.
- **Estancamiento:** 3 exposiciones sin subir reinician el objetivo al 80 %. Tras 2 reinicios se sugiere bajar un paso.
- **Descansos por paso** (`restFor`):
  - 1 a 5 reps: 180 s.
  - 6 a 12 reps: 120 s en dominadas, fondos, muscle-up y HSPU; 90 s en el resto.
  - Más de 12 reps: 75 s.
  - Holds de brazos rectos: 150 s; 180 s en straddle y completos (`step.rest`).
  - Otros holds: 75 s.
  - Core: 60 s.
  - Pino libre: 45 s.
- **Descarga:**
  - **Cuándo se sugiere:** cada 5 o más semanas con al menos 8 sesiones, o cuando hay 2 o más rutas con `stall ≥ 2`.
  - **Qué hace:** 7 días con una serie menos, objetivo al 65 % y sin cambios de progreso.
- **Habilidades por sesión:** máximo 2; con 3 objetivos se rotan. Las de brazos rectos van como mucho 3 días por semana y nunca en días seguidos.
- **Plan semanal:**
  - **Días recomendados:** principiante 3; intermedio 3, o 4 con objetivos; avanzado 4 o 5.
  - **Tipos de día:**
    - **A:** dominadas, fondos, piernas y core.
    - **B:** remo, flexiones, bisagra y core.
    - **S:** habilidades y core; solo con 5 o más días y objetivos.
  - **Plantilla de 3 días:** A-B-A en las semanas ISO pares y B-A-B en las impares. Por eso el 2/11/2026 (lunes, semana 45) toca B.
  - **Elección de días:** `pickDays` busca la máxima separación entre los días disponibles.
- **Calentamiento:** 9 elementos, entre ellos preparación de muñecas, flexiones escapulares, soporte y series de aproximación.
- **Rutas:**
  - **Fuerza:** dominadas, remo, flexiones, fondos (sin fondos en banco), piernas y bisagra (isquios; nueva ruta hasta el curl nórdico), además de core.
  - **Habilidades:** muscleup, pino, hspu, lsit, frontlever, planche y backlever.
  - Las habilidades tienen `prereq` con índices de paso. `p.step >= req.step` significa "has llegado a ese paso".

## Gamificación

- **XP por sesión:**
  - 40 por terminarla, 4 por cada serie y 3 por cada ejercicio valorado.
  - 1 por minuto, hasta 60.
  - 120 por cada paso superado y 600 por cada ruta completada.
- **XP por logros según rareza:** bronce 50, plata 150, oro 400, leyenda 1000.
- **Niveles:** `xpForLevel(L) = 150·(L−1)^1.6`.
  - **Títulos:** Novato (1), Aprendiz (3), Callejero (5), Atleta (8), Acróbata (12), Gimnasta (16), Maestro (20), Leyenda (25), Mito (30).
- **Atributos** (rango E–S): Tirón, Empuje, Piernas, Core, Equilibrio y Aguante.
  - Se calculan con la fracción de cada ruta. Las rutas básicas pesan el doble.
  - Aguante = √(minutos / 3000) · 100.
- **Logros:** 43 en 4 categorías (constancia, progreso, hitos y hábitos).
  - Se definen en `game.js` con `check(stats) → [actual, meta]`.
  - Se sincronizan al cargar la app (sin celebración), al terminar un entreno (con celebración en el resumen) y al ver vídeos.
- **Artículos:** 33, en los huecos head, face, top, neck, wrists, bottom, feet, back y aura.
  - Se desbloquean por `{ level }` o por `{ ach }`.
  - Por defecto se llevan: camiseta blanca, pantalón negro y zapatillas blancas.

## Diseño

- **Tema cómic de alto contraste** en toda la app (tokens en `:root`, claro y oscuro automáticos):
  - Paneles con borde de 3 px negro y sombra dura, colores amarillo `#ffe500`, rosa `#ff2d87` y cian `#18e0ff`.
  - Tipografía Bangers y tramas de semitonos.
  - Onomatopeyas «¡POW!» al completar series, latido en el descanso y explosión al subir de nivel.
  - Respeta la opción de reducir movimiento.
- **Tema pixel RPG** (clases `.px-*`) en Héroe, Logros, Equipo, el mini héroe de Hoy y las recompensas del resumen:
  - Ventana azul marino `#1b1e4b` con borde blanco y sombra negra.
  - Títulos en Press Start 2P y texto en **VT323**. Se descartó Pixelify Sans porque su «C» parecía una «O» y su «5» un «8».
  - Barras por segmentos y cuadro de texto «¡Has conseguido…!».
- **Héroe** (`avatar.js`):
  - **Proporciones según atributos:** `hs` (hombros) 6–10, `bic` 1–4, `armW` 3–5, `legW` 3–5.
  - **Pose y acabado:** doble bíceps, contorno y sombreado automáticos, aura con `glow`.
  - **Animación:** idle con `steps()`.
- **Iconos de artículos:** sprites de texto 16×16 en `ICONS` (`pixel.js`), solo con relleno porque el contorno se añade solo.
  - `C` es el color del artículo; los colores fijos están en `FIXED`.
  - Los bloqueados se pintan con `silhouette`.

## Pruebas e2e

- **Comandos:** `npm install`, luego `npx playwright test --project=iphone-chromium`. En el entorno cloud solo hay Chromium; WebKit corre en CI.
  - En este entorno, `@playwright/test` 1.63.0 usa los navegadores de `/opt/pw-browsers` sin configurar nada. **No** ejecutar `playwright install` aquí.
- **`fixtures.js`:**
  - **Reloj:** fijo en el **lunes 2/11/2026 a las 10:00**, en Madrid; se cambia con `test.use({ now })`.
  - **Red:** bloquea la externa.
  - **Errores:** falla si hay errores de JS.
  - **Ayudantes:** `seed()` (vía addInitScript, solo en el frame superior y una vez por pestaña), `makeState()`, `pastSession()`, `trainOnly()`, `completeCurrentExercise()` (solo las series del ejercicio actual) y `rate()`.
- **Configuración:** `reducedMotion: 'reduce'` (las animaciones infinitas hacen que los elementos no sean "estables"). Los artículos bloqueados llevan `aria-disabled` y para pulsarlos hay que usar `click({ force: true })`.
- **Resultados:** 36 pruebas; en local se ejecutaron 3 veces seguidas sin resultados inestables.
  - **En CI:** pasan las 36 en Chromium y 35 en WebKit. La prueba sin conexión se salta en WebKit por una limitación de Playwright: `setOffline` con service worker da un error interno al recargar.
- **CI:** `.github/workflows/e2e.yml`.
  - Usa checkout@v5 y setup-node@v5, e instala con `npx playwright install --with-deps chromium webkit`.
  - Se puede consultar con las herramientas MCP de GitHub (`actions_list`, `get_job_logs`).
- **Fallos reales que encontraron las pruebas, ya corregidos:**
  - La tab bar oculta en el entreno seguía siendo accesible. Ahora usa `visibility: hidden`.
  - El panel de descanso con la valoración tapaba las series en pantallas de 664 px. Ahora se compacta con `.rest-bar.with-rate` y el padding inferior usa `:has()`.

## Limitaciones del entorno cloud

- **Bloqueados por el proxy:** youtube.com, i.ytimg.com, reddit.com y github.io. No se pueden verificar vídeos ni la web publicada; las miniaturas fallan en las pruebas (es normal).
- **Disponibles:** fonts.googleapis.com, gstatic, npm, GitHub (git y MCP).
- **WebSearch** tiene un límite de 200 búsquedas por turno, compartido con los subagentes. Se agotó al buscar vídeos.
- Para servir la app durante las pruebas manuales: `(python3 -m http.server 8765 &)`.
  - Para pararlo, usar `pkill -f "^python3 -m http.server 8765"` con el `^`. Sin él, el patrón coincide con el propio comando y mata el shell.

## Pendiente o posibles mejoras

- **29 pasos sin vídeo.** Muestran un botón para buscar en YouTube. Son:
  - todo `backlever` y toda `bisagra`;
  - `planche/straddle-banda`, `planche/straddle` y `planche/completa`;
  - `core/dead-bug`, `core/plancha`, `core/hollow-tuck` y `core/rueda`;
  - `fondos/asistidos`, `fondos/soporte-anillas` y `fondos/anillas`;
  - `dominadas/asistida-una-mano`;
  - `pino/wall-walk` y `pino/rueda`;
  - `hspu/cajon` y `lsit/pies-apoyados`;
  - `frontlever/half-lay`.
  - Para añadirlos, editar `js/data/videos.js`.
- **Los 87 vídeos no se han verificado:** se eligieron por el título que mostraba el buscador. Algunos pueden ser demostraciones sin voz o no permitir incrustarlos.
- **No se ha probado en un iPhone real.** Solo en emulación con Chromium y WebKit.
- **La investigación solo usó resúmenes de búsqueda.** Los puntos dudosos están marcados como `[criterio propio]` o `[sin fuente verificada]` en `docs/`.
- **El aviso sonoro del descanso** solo suena con la app en pantalla: iOS suspende las PWA en segundo plano y no hay notificaciones push.
- **Ideas no hechas:**
  - superseries de antagonistas, que ahorrarían un 30–40 % de tiempo;
  - artículos de lectura sobre técnica (el usuario dijo "artículos" y se interpretó como objetos para equipar);
  - pregunta de dificultad por serie en vez de por ejercicio.

## Forma de trabajar que ha funcionado

1. Hacer los cambios, probar en el iPhone emulado (Playwright) y revisar las capturas en claro y oscuro.
2. Ejecutar `npx playwright test --project=iphone-chromium` y, cuando cambie una regla o una pantalla, añadir o ajustar la prueba correspondiente.
3. Hacer commit en español (con las líneas de atribución que pida el sistema), push a `main` y revisar la ejecución de CI con las herramientas MCP de GitHub.
4. Explicar al usuario en español qué cambió y cómo verlo en el iPhone (los cambios se ven la segunda vez que abre la app).
