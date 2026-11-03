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
  11. Nivel sin mínimo de 8 entrenos y contando las habilidades.
  12. **Pierna en el gimnasio.** Se considera avanzado y entrena 5 días, 2 de ellos de pierna.
      - Su rutina de pierna, que hace **completa en cada día de pierna**: sentadilla hack, peso muerto **piernas rígidas**, sentadilla goblet en hack, extensión de cuádriceps, curl femoral, aductor, abductor, gemelo de pie y gemelo sentado.
      - Primero se repartió en Pierna A y B; tras su respuesta, es un solo día «Pierna» (tipo `P`) dos veces por semana. El torso es Torso A / Torso B.
  13. **Modo noche:** en su iPhone no cambiaba. Se añadió en Ajustes un selector de tema (Automático / Claro / Oscuro). En su captura del iPhone ya se ve oscuro.
  14. **Ver un ejercicio sin empezar el entreno.**
      - Los ejercicios de Hoy y del Plan semanal son enlaces: los de calistenia van a `#/ruta/:id`, que ahora muestra arriba el vídeo y las claves del paso actual.
      - Los de gimnasio van a `#/ejercicio/:id` (`views/exercise.js`): vídeo, objetivo, peso editable, claves y un historial con la gráfica del peso.
  15. **«Toco el ejercicio y no pasa nada».** Era la versión antigua guardada en su iPhone. Se cambió la forma de actualizar (versión 9, ver Despliegue).
      - Se le pidió cerrar la app del todo y abrirla dos veces, y comprobar en Ajustes que pone «versión 9». **Falta que lo confirme.**
  16. **Lo siguiente que quiere:** una **serie de pruebas exhaustivas**. Ver la sección «Siguiente paso: pruebas exhaustivas».
  17. **«Hay cosas que no se ven bien o se solapan» en el móvil** (versión 10). Se auditaron todas las pantallas y estados a 320, 375, 390 y 430 px, en claro, oscuro y con notch. Ver «Maquetación en móvil».
      - **Fallos encontrados y corregidos:**
        - el botón «Empezar entreno» de Hoy cortaba su texto e icono;
        - en las filas de series, el ✓ se salía de la tarjeta (gimnasio e isometrías);
        - «Finalizar entreno» no cabía;
        - al editar el plan de Hoy, los textos se montaban y el desplegable se salía;
        - «Automático» se salía de su botón;
        - el candado de Ajustes partía la línea;
        - las mayúsculas pixel con tilde parecían minúsculas («TIRóN»);
        - el detalle del calendario y las duraciones largas se partían mal;
        - a 320 px se salían los días de la semana;
        - en Safari, el texto largo de un desplegable (nivel en la bienvenida) ensanchaba la página. Lo detectó WebKit en CI; los `select` recortan con «…» (versión 11).
- **Usa la app en su iPhone real.** En una captura suya se veía el tema oscuro y el plan con «Pierna» el lunes y descanso el martes, así que tiene sus propios días configurados.

## Despliegue

- **Repositorio:** `MartianFlow/Calisthenic-Flow` (público), rama `main`. Se trabaja y se sube directamente a `main`, que es lo que el usuario espera.
- **Publicación:** GitHub Pages con *Deploy from a branch → main → / (root)*, en `https://martianflow.github.io/Calisthenic-Flow/`.
  - Está activo: cada push lanza «pages build and deployment», y el usuario usa la app desde ahí.
  - Desde el entorno cloud no se puede abrir github.io (proxy). El despliegue se comprueba con la API: `curl -s "https://api.github.com/repos/MartianFlow/Calisthenic-Flow/actions/runs?per_page=4"`.
- **Instalación en el iPhone:** Safari → Compartir → Añadir a pantalla de inicio.
- **Actualizaciones** (cambiado en la versión 9, porque el usuario seguía viendo la versión vieja en su iPhone):
  - El service worker usa **primero la red** con `cache: 'no-cache'` y cae a la caché si no hay conexión o pasan 3 s.
  - Instala con `cache: 'reload'`, para no coger archivos de la caché HTTP de GitHub Pages (10 min).
  - Al volver a la app (`visibilitychange`) se llama a `reg.update()`. Si una versión nueva toma el control (`controllerchange`), la app se recarga sola; durante un entreno espera a salir de `/entreno`.
  - En Ajustes se ve la versión («versión 9») y hay un botón «Actualizar la app».
  - **En cada publicación hay que subir la versión en dos sitios:** `VERSION` de `sw.js` y `APP_VERSION` de `js/version.js`. Ahora es `cf-v11`, y una prueba de `data.spec.js` comprueba que coincidan.
  - Sin subir la versión, al abrir la app en frío ya se ve lo nuevo (red primero), pero al volver de segundo plano no se recarga sola.
  - **Al añadir archivos**, hay que incluirlos también en `ASSETS` de `sw.js`. Si falta uno, la instalación falla entera.
  - **Paso de la versión 8 a la 9 en el iPhone:** el service worker antiguo servía primero la caché, así que la versión nueva se ve a la **segunda** apertura. Hay que cerrar la app del todo desde el selector de apps.

## Arquitectura

PWA estática sin build. Usa ES modules nativos y vanilla JS. Para probarla en local: `python3 -m http.server`.

```
index.html               Shell, tab bar (Hoy · Calendario · Rutas · Héroe · Progreso). Ajustes = engranaje en Hoy/Héroe
sw.js                    Service worker (caché de la app; ignora peticiones de otros orígenes)
manifest.webmanifest     PWA
css/styles.css           Todo el estilo: tema cómic + tema pixel (sección "Héroe en pixel art")
fonts/                   Bangers (cómic), Press Start 2P y VT323 (pixel) — OFL, autoalojadas
icons/                   Iconos de la app (explosión amarilla con barras)
js/app.js                Rutas hash, delegación de eventos (data-action / data-change), tick 250 ms, sync de logros al cargar, aplica el tema
js/version.js            APP_VERSION (igual que VERSION de sw.js) y versionLabel() para Ajustes
js/theme.js              Tema claro/oscuro: applyTheme (data-theme en <html> + meta theme-color). index.html lo aplica antes de pintar
js/router.js             Router por hash
js/store.js              Estado en localStorage (clave 'calisthenic-flow:v1'), normalize + migración v1→v2
js/logic.js              Sesiones, progresión doble, descansos, descarga, estadísticas
js/schedule.js           Plan semanal (nivel, recomendación de días, reparto A/B/S o torso/pierna, reglas de brazos rectos, todayInfo, dayLabel)
js/game.js               XP, niveles/títulos, atributos, 46 logros, 33 artículos, syncAchievements
js/avatar.js             Héroe en pixel art 40×48 generado por capas (API avatarSVG)
js/pixel.js              Motor de pixel art (Grid, contorno/sombreado automáticos, toSVG) + iconos 16×16
js/fx.js                 Efectos de cómic (onomatopeyas, bump/beat, flash, stagger)
js/video.js              Tarjeta de vídeo + modal con iframe youtube-nocookie (fuera de #view)
js/device.js             Audio (WebAudio, desbloqueo por gesto), vibración, wake lock
js/ui.js                 esc, formatos, iconos SVG de trazo, toast, progressBar
js/charts.js             Gráficas SVG (barras semanales, línea de progreso)
js/data/roadmaps.js      Contenido: 14 rutas / 116 pasos, DAY_TEMPLATES, WARMUP
js/data/videos.js        Vídeo por paso (clave 'ruta/key') — 87 de 116; y de los 9 ejercicios de gimnasio (clave 'gym/<id>')
js/data/legacy.js        Nombres de pasos v1 para migrar progreso
js/data/gym.js           Pierna en el gimnasio: 9 ejercicios con kg (LIFTS), LEG_DAYS (P = rutina completa) y LEG_WARMUP
js/views/*.js            home, session, roadmaps, progress (+resumen/detalle), calendar, settings (+onboarding), hero (+logros/equipo), plan, exercise (ficha de gimnasio)
docs/                    Investigación con fuentes (principios, progresiones y pierna en el gimnasio)
tests/e2e/               135 pruebas Playwright (49 funcionales + 86 de maquetación en layout.spec.js) + fixtures.js
tests/tools/             simular-actualizacion.js (actualización de la app instalada) y auditoría de diseño:
                         auditar-diseno.js (capturas + informe), comprobar-diseno.js (las comprobaciones),
                         escenarios-diseno.js (pantallas y estados que se recorren)
.github/workflows/e2e.yml  CI: Chromium + WebKit en cada push
```

### Patrones del código

- **Render:** cada vista devuelve un string HTML y `app.js` lo inserta en `#view`.
  - Cualquier `update()` del store vuelve a pintar la vista actual. Con `{ silent: true }` no lo hace.
  - La animación de entrada solo se lanza al **cambiar de ruta**: clase `.enter` y variable `--i` para el escalonado.
- **Acciones:** `data-action="nombre"` en el HTML y un handler en el `actions` exportado por la vista. Todas se combinan en `app.js`. Los cambios de formularios van con `data-change`.
- **Volver:** `data-action="go-back" data-fallback="#/…"` hace `history.back()`, o va a la ruta indicada si no hay historial. Lo usan la ruta y la ficha de ejercicio.
- **Escapar todo** lo que venga del usuario con `esc()`.
- **Datos derivados:** la XP, los atributos y las estadísticas se calculan siempre a partir del historial. Solo se guardan las fechas de los logros desbloqueados (`state.game.unlocked`).
- **El progreso se guarda por índice de paso** (`progress[id].step`). Si se insertan o quitan pasos, hay que añadir una migración en `store.js`: subir `DATA_VERSION` y usar los nombres antiguos o `was: [...]` en los pasos.

### Modelo de estado (resumen)

```js
{ version: 2, onboarded,
  settings: { goals[≤3], daysPerWeek, passesToLevelUp (habilidades), sound, warmup, legs: 'calistenia'|'gym', theme: 'auto'|'light'|'dark', schedule: { days[7 bool] } | null },
  progress: { [rutaId]: { step, passes, done, work, stall, resets } },   // work = objetivo por serie actual
  lifts: { [liftId]: { kg, reps, stall } },                              // pierna en el gimnasio: peso y reps objetivo
  levelLog[], sessions[], active, plan, lastDayType, deload: { start, until }, deloadSnoozeUntil,
  game: { name, unlocked: { achId: isoDate }, equipped: { slot: itemId }, look: { skin, hair, hairStyle }, videosWatched } }
```

Cada sesión del historial guarda:
- `items[]`, y cada uno lleva `roadmapId`, `stepIndex`, `type`, `target`, `goal`, `sets[]`, `rating`, `met`, `goalMet` y `outcome`.
- `levelUps`, `deload`, `warmupFull` y `game`. Este último tiene `xp`, `levelBefore`, `levelAfter`, `achievements` e `items`.
- Los ejercicios de gimnasio llevan `liftId` en vez de `roadmapId`/`stepIndex`, y además `min`, `max`, `goal`, `sets` (reps), `loads` (kg por serie) y `outcome`.
  - Los `outcome` posibles son `load-up`, `up`, `keep`, `consolidate`, `down`, `load-down`, `reset`, `no-kg` y `deload`.
  - Para pintar cualquier ítem usa `itemName()` (logic.js) y `itemBlock()` (progress.js), que ya distinguen los dos tipos.
- `dayType` puede ser `A`, `B`, `S`, `TA`, `TB`, `P` o `libre`, y `PA`/`PB` en sesiones antiguas. Para mostrarlo usa `dayLabel()` (schedule.js).

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
- **Nivel** (`trainingLevel`, schedule.js): media de la fracción recorrida en cada ruta que se entrena.
  - Sin mínimo de entrenos.
  - Cuentan los 7 básicos; `piernas` y `bisagra` no cuentan con la pierna en el gimnasio.
  - Cuentan las habilidades que son objetivo o en las que hay progreso. Su escala va de la base de sus prerrequisitos al 100 %: `base + frac·(1−base)`.
  - Cortes [criterio propio]: < 30 % principiante, < 60 % intermedio, el resto avanzado.
- **Plan semanal:**
  - **Días recomendados:** principiante 3; intermedio 3, o 4 con objetivos; avanzado 4 o 5. Con la pierna en el gimnasio: 4, o 5 si es avanzado.
  - **Tipos de día:**
    - **A:** dominadas, fondos, piernas y core.
    - **B:** remo, flexiones, bisagra y core.
    - **S:** habilidades y core; solo con 5 o más días y objetivos.
  - **Plantilla de 3 días:** A-B-A en las semanas ISO pares y B-A-B en las impares. Por eso el 2/11/2026 (lunes, semana 45) toca B.
  - **Elección de días:** `pickDays` busca la máxima separación entre los días disponibles.
- **Pierna en el gimnasio** (`settings.legs = 'gym'`, investigación en `docs/investigacion-pierna-gym.md`):
  - **Días y tipos** (`gymDays`): prueba todas las combinaciones de días y tipos.
    - Nunca pierna en días seguidos, y la mayor separación posible (tope de 4 días).
    - Nunca torso en días seguidos; a igualdad, menos días seguidos.
    - Con L–V: TB-P-TA-P-TB. Con L–S: torso L-X-S y pierna M-V.
    - 1 día de pierna con 2–3 días de entreno, 2 con 4 o más. T alterna TA/TB (empieza por TB en las semanas impares).
  - **Torso A/B:** dominadas, fondos, remo, flexiones y core, con el orden de las parejas cambiado. Las habilidades solo van en los días de torso.
  - **Pierna (`P`):** la rutina completa del usuario, 3 series cada ejercicio y siempre en el mismo orden, para que el peso sea comparable entre sesiones.
    - Orden: hack 6–10, piernas rígidas 6–10, goblet 10–15, extensión, curl, aductor, abductor, gemelo de pie y gemelo sentado.
    - `LEG_DAYS.P.sets` permitiría cambiar las series solo en ese día.
    - `PA`/`PB` solo quedan en `DAY_INFO` como nombres para el historial.
  - **Progresión doble con carga** (`applyLiftProgress`):
    - Tope del rango con Fácil o Normal: +`inc` kg y vuelta al mínimo. Con Difícil: consolidar, salvo en las máquinas `failureOk`, que suben igual.
    - Por debajo del tope: +2 reps con Fácil y +1 con Normal.
    - Difícil sin llegar al mínimo del rango: −10 % (`lighterLoad`).
    - 3 sesiones sin avanzar: −10 % y vuelta al mínimo. Cuenta el peso de la serie más ligera.
  - **Descarga:** una serie menos, −10 % y el mínimo del rango.
  - **Calentamiento:** `LEG_WARMUP` cuando todos los ejercicios son de gimnasio (`active.warmupKind = 'pierna'`).
  - **Pesos:** se escriben en el Plan semanal o durante el entreno con `type="text" inputmode="decimal"`, para aceptar la coma (`parseKg` y `kgInput` en ui.js). Con `type=number`, iOS rompe la coma.
- **Calentamiento:** 9 elementos, entre ellos preparación de muñecas, flexiones escapulares, soporte y series de aproximación.
- **Rutas:**
  - **Fuerza:** dominadas, remo, flexiones, fondos (sin fondos en banco), piernas y bisagra (isquios; nueva ruta hasta el curl nórdico), además de core.
  - **Habilidades:** muscleup, pino, hspu, lsit, frontlever, planche y backlever.
  - Las habilidades tienen `prereq` con índices de paso. `p.step >= req.step` significa "has llegado a ese paso".

## Gamificación

- **XP por sesión:**
  - 40 por terminarla, 4 por cada serie y 3 por cada ejercicio valorado.
  - 1 por minuto, hasta 60.
  - 120 por cada paso superado, 600 por cada ruta completada y 30 por cada subida de peso.
- **XP por logros según rareza:** bronce 50, plata 150, oro 400, leyenda 1000.
- **Niveles:** `xpForLevel(L) = 150·(L−1)^1.6`.
  - **Títulos:** Novato (1), Aprendiz (3), Callejero (5), Atleta (8), Acróbata (12), Gimnasta (16), Maestro (20), Leyenda (25), Mito (30).
- **Atributos** (rango E–S): Tirón, Empuje, Piernas, Core, Equilibrio y Aguante.
  - Se calculan con la fracción de cada ruta. Las rutas básicas pesan el doble.
  - Aguante = √(minutos / 3000) · 100.
  - Piernas usa también las subidas de peso del gimnasio: √(subidas / 60) · 100, y se queda con el valor mayor.
- **Logros:** 46 en 4 categorías (constancia, progreso, hitos y hábitos). Tres son de pierna: `dia-pierna`, `pierna-25` y `mas-peso`.
  - Se definen en `game.js` con `check(stats) → [actual, meta]`.
  - Se sincronizan al cargar la app (sin celebración), al terminar un entreno (con celebración en el resumen) y al ver vídeos.
- **Artículos:** 33, en los huecos head, face, top, neck, wrists, bottom, feet, back y aura.
  - Se desbloquean por `{ level }` o por `{ ach }`.
  - Por defecto se llevan: camiseta blanca, pantalón negro y zapatillas blancas.

## Diseño

- **Tema claro y oscuro:**
  - El oscuro va por defecto en `:root`.
  - El claro se aplica con `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` o con `:root[data-theme="light"]`. El bloque de tokens claros está duplicado: si cambias uno, cambia los dos.
  - El usuario puede forzarlo en Ajustes → Apariencia.
- **Tema cómic de alto contraste** en toda la app:
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

### Maquetación en móvil (reglas tras la auditoría de la versión 10)

- **Anchos que deben funcionar:**
  - 320 px: iPhone SE de 1.ª generación, o cualquier iPhone con «Zoom de pantalla».
  - 375 px: SE de 2.ª y 3.ª generación.
  - 390 px: iPhone 12 a 16.
  - 430 px: Pro Max.
  - Por debajo de 360 px hay un bloque `@media (max-width: 359px)` al final del CSS: menos padding, letras algo menores y filas de series más compactas.
- **Botones:** `.btn` puede pasar a dos líneas (`text-wrap: balance`) si no cabe; es mejor que salirse. `.btn.small` no se parte (`nowrap`).
  - Si un botón principal comparte fila, el secundario va solo con icono: `.btn.square` (52 px, con `aria-label`). Así están «Editar»/«Listo» en Hoy y «Anterior» en el entreno.
- **Filas de series (`.set`):** la unidad va debajo del número (`.set .val small`).
  - Solo las isometrías llevan cronómetro o hueco (`.spacer`); las de repeticiones no.
  - A 375 px caben: número 28, −/+ 44, valor 52, cronómetro o kg 40–42 y ✓ 48.
- **Filas de Hoy (`.ex-row`):** son una rejilla de 3 columnas.
  - El objetivo es compacto: «3 × 8» y debajo «seg /lado» y «meta 10».
  - Los botones de edición van en una segunda línea.
- **Textos:**
  - «Última vez» lleva la unidad una sola vez: `fmtSeries` («16 · 16 · 15 s») y `fmtLiftSeries` («117,5 kg × 9 · 8 · 7»).
  - Las duraciones grandes usan `fmtDurationHtml`, con las unidades en `<small>`.
- **Iconos dentro de un texto:** `.icon` es `inline-block`. En flex o grid se comporta como bloque, así que un candado dentro de un párrafo ya no parte la línea.
- **Rejillas de 7 días:** `repeat(7, minmax(0, 1fr))`. Con `1fr` a secas, el contenido mínimo las ensancha.
- **`select` dentro de `.field`:** necesita `min-width: 0`, porque si no la opción más larga ensancha la tarjeta.
  - En Safari además hace falta `overflow: hidden`: si no, el texto de la opción elegida se sale y la página se puede desplazar en horizontal.
  - Cuando hay scroll horizontal, la prueba nombra el elemento culpable aunque sea interno (como el texto de un `select`).
- **Letra pixel:** Press Start 2P dibuja las mayúsculas con tilde más bajas y parecen minúsculas.
  - `pixelCaps()` (app.js) quita la tilde en `.px-h`, `.px-sub`, `.px-title`, `.px-attr-label`, `.px-btn`, `.px-tabs button` y `.px-rarity`.
  - La ñ se mantiene.
  - Si añades otra clase pixel en mayúsculas, inclúyela en `PX_CAPS`.

## Pruebas e2e

- **Comandos:** `npm install`, luego `npx playwright test --project=iphone-chromium`. En el entorno cloud solo hay Chromium; WebKit corre en CI.
  - En este entorno, `@playwright/test` 1.63.0 usa los navegadores de `/opt/pw-browsers` sin configurar nada. **No** ejecutar `playwright install` aquí.
- **`fixtures.js`:**
  - **Reloj:** fijo en el **lunes 2/11/2026 a las 10:00**, en Madrid; se cambia con `test.use({ now })`.
  - **Red:** bloquea la externa.
  - **Errores:** falla si hay errores de JS.
  - **Ayudantes:** `seed()` (vía addInitScript, solo en el frame superior y una vez por pestaña), `makeState()`, `pastSession()`, `trainOnly()`, `completeCurrentExercise()` (solo las series del ejercicio actual) y `rate()`.
- **Configuración:** `reducedMotion: 'reduce'` (las animaciones infinitas hacen que los elementos no sean "estables"). Los artículos bloqueados llevan `aria-disabled` y para pulsarlos hay que usar `click({ force: true })`.
- **Resultados:** 135 pruebas: 49 funcionales y 86 de maquetación.
  - `gym.spec.js` cubre el modo de pierna en el gimnasio.
  - **`layout.spec.js`** recorre los 86 escenarios de `tests/tools/escenarios-diseno.js` a 320, 375, 390 y 430 px con las comprobaciones de `tests/tools/comprobar-diseno.js`:
    - scroll horizontal y elementos fuera de la pantalla;
    - texto, icono o caja que se sale de la caja que lo contiene;
    - texto recortado y textos que se pisan;
    - contenido tapado siempre por una barra fija;
    - contraste menor que 3:1.
  - La letra San Francisco se sustituye por Inter. CI instala `fonts-inter`.
  - **Pantalla o estado nuevo:** añádelo a `escenarios-diseno.js`.
  - **Auditoría con capturas:** `node tests/tools/auditar-diseno.js [--anchos=320,375,390,430] [--temas=dark,light] [--capturas=375,390] [--notch] [--solo=texto]`.
    - Escribe `test-results/diseno/informe.txt` y una captura por pantalla.
    - `--notch` simula la app instalada (márgenes seguros de 47 y 34 px).
    - Para revisar las capturas sirve juntarlas en hojas de 3 o 4 con PIL.
  - En `navigation.spec.js` están las del tema forzado, con `colorScheme` claro y oscuro.
  - **En CI:** pasan todas en Chromium y todas menos una en WebKit. La prueba sin conexión se salta en WebKit por una limitación de Playwright: `setOffline` con service worker da un error interno al recargar.
- **CI:** `.github/workflows/e2e.yml`.
  - Usa checkout@v5 y setup-node@v5, e instala con `npx playwright install --with-deps chromium webkit`.
  - Se puede consultar con las herramientas MCP de GitHub (`actions_list`, `get_job_logs`).
- **Fallos reales encontrados, ya corregidos:**
  - Con «Reducir movimiento», las líneas de las gráficas no se veían: dependían de la animación `draw`. Se corrigió en el bloque `prefers-reduced-motion`. Cualquier estilo que solo se vea al terminar una animación tiene que corregirse ahí también.
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
- **Los 87 vídeos de calistenia y los 9 de gimnasio no se han verificado:** se eligieron por el título que mostraba el buscador. Algunos pueden ser demostraciones sin voz o no permitir incrustarlos.
- **iPhone real:** el usuario ya la usa, pero cada función nueva solo se ha probado en emulación (Chromium en local, WebKit en CI).
- **La investigación solo usó resúmenes de búsqueda.** Los puntos dudosos están marcados como `[criterio propio]` o `[sin fuente verificada]` en `docs/`.
- **El aviso sonoro del descanso** solo suena con la app en pantalla: iOS suspende las PWA en segundo plano y no hay notificaciones push.
- **Ideas no hechas:**
  - que el pino (equilibrio, poca fatiga) no cuente para el límite de 2 habilidades por sesión;
  - un editor de ejercicios de gimnasio desde la app (ahora se cambian en `js/data/gym.js`);
  - superseries de antagonistas, que ahorrarían un 30–40 % de tiempo;
  - artículos de lectura sobre técnica (el usuario dijo "artículos" y se interpretó como objetos para equipar);
  - pregunta de dificultad por serie en vez de por ejercicio.

## Siguiente paso: pruebas exhaustivas (lo pidió el usuario)

### Qué cubren hoy las pruebas funcionales (49) y la de maquetación (86 escenarios)

| Archivo | Pruebas |
|---|---|
| `onboarding.spec.js` (3) | Bienvenida; guardar niveles, objetivos y días; máximo 3 objetivos |
| `workout.spec.js` (3) | Flujo completo con isometría, descanso, valoración y resumen; recargar a mitad; +/− y descartar |
| `progression.spec.js` (7) | Fácil +2, Normal +1, Fácil en la meta sube de paso, 2 pases en habilidades, recalibrado, reinicio al 80 %, descanso por paso |
| `plan.spec.js` (6) | Recomendación a principiantes; nivel con habilidades; cambiar días; front lever sin días seguidos; día de descanso; «Misión cumplida» |
| `gym.spec.js` (9) | Semana L–V; separación de 72 h con el sábado; recomendación de 5 días y 9 pesos; coma decimal; subida de peso; bajada de ~10 %; cambio de peso a mitad; ficha desde Hoy; ruta desde el Plan |
| `navigation.spec.js` (9) | 14 rutas; visor de vídeo; búsqueda sin vídeo; nivel a mano; calendario; progreso; pestañas; tema forzado oscuro y claro |
| `gamification.spec.js` (5) | Héroe; logros al abrir; artículos bloqueados; apariencia y nombre; mini héroe |
| `deload.spec.js` (2) | Sugerencia por estancamiento y efecto; «Ahora no» |
| `data.spec.js` (5) | Migración v1; exportar e importar; borrar datos; sin conexión (solo Chromium); versión igual en sw.js y version.js |
| `layout.spec.js` (86) | Todas las pantallas y estados a 320, 375, 390 y 430 px:<br>• bienvenida, Hoy (normal, editando, descanso, hecho, descargas y entreno a medias), calendario y su detalle, las 14 rutas, Héroe, Logros, Equipo, Progreso, sesión, resumen, Ajustes y Plan con 3, 4 y 6 días;<br>• entreno: calentamiento, isometría, cronómetro, descanso, valorar, valorar al terminar, vídeo y último ejercicio;<br>• gimnasio: Hoy, Plan, las 9 fichas, entreno, descanso, valorar, resumen y calendario |

### Huecos detectados (candidatos para las pruebas nuevas)

- **Gimnasio, progresión:**
  - Consolidar en un multiarticular (hack o piernas rígidas en el tope con Difícil) frente a una máquina `failureOk` (en el tope con Difícil, sube).
  - `no-kg` (tope del rango sin peso apuntado).
  - Estancamiento de 3 sesiones: −10 % y vuelta al mínimo.
  - Descarga con ejercicios de gimnasio: una serie menos, −10 %, mínimo del rango y `outcome: deload`.
- **Gimnasio, interfaz:**
  - `set-add` copia el peso; botón «−» del peso; peso no válido muestra un aviso.
  - Calentamiento de pierna y `warmupFull`.
  - Gráfica e historial de la ficha con 2 o más sesiones; editar el peso en la ficha.
- **Plan:**
  - Variantes de `gymDays` (2, 3, 4, 6 y 7 días y días sueltos).
  - `nextDayType` sin plan semanal en modo gimnasio.
  - «Cambiar de día» TA → TB → P; volver a «Calistenia» recupera A/B.
  - Bienvenida eligiendo Gimnasio.
  - 3 objetivos rotando solo en días de torso.
  - «Añadir ejercicio» con los de gimnasio.
- **Nivel:** los cortes del 30 % y el 60 %; que el modo gimnasio excluya `piernas` y `bisagra`; la base de cada habilidad.
- **Gamificación:**
  - XP por subida de peso (+30).
  - Logros `dia-pierna`, `pierna-25` y `mas-peso`.
  - Atributo Piernas con las subidas de peso; título «¡MÁS PESO!» en el resumen.
- **Datos:**
  - Exportar e importar con `lifts` y `theme`.
  - `normalize` con `lifts` o `theme` no válidos.
  - Sesiones antiguas `PA`/`PB` en el historial (`dayLabel`).
  - Calendario y progreso con ejercicios de gimnasio.
- **Tema:** el script en línea de index.html aplica el tema antes de pintar; `theme-color` en automático.
- **Actualización:**
  - El botón «Actualizar la app».
  - Que durante un entreno espere a salir de `/entreno`.
  - `tests/tools/simular-actualizacion.js` como prueba automática, o al menos ejecutado antes de cada publicación.
- **Movimiento reducido:** la línea de la gráfica visible (`stroke-dashoffset: 0`).
- **Maquetación:** hecho en la versión 10 (`layout.spec.js`). Falta probar en WebKit real del iPhone (en CI se usa el WebKit de Playwright).
- **Robustez:** fechas en cambio de semana y de año (semana ISO 53 o 1); sesiones de más de 3 h; historial grande (cientos de sesiones).

### Trucos aprendidos

- `page.waitForFunction` **no espera** a una función `async`: la promesa cuenta como verdadera. Hay que hacer el bucle en Node con `page.evaluate`.
- Si falta un archivo de `ASSETS` (por ejemplo, uno sin commit al copiar con `git ls-files` sin `--others`), la instalación del service worker falla entera y se queda la versión vieja.
- Una vista que solo cambia el hash (`#/…`) no recarga la página: el estado del módulo, como `pendingReload`, se mantiene.
- Si las pruebas empiezan en `/`, tras «Volver» la URL queda sin `#/`. Comprueba el encabezado en vez de la URL.
- **Con el reloj simulado** (`page.clock.install`), `page.waitForFunction` y `page.waitForURL` tras un cambio de hash pueden no avanzar. Espera desde Node: un bucle con `page.evaluate` y `page.waitForTimeout`.
- En las pruebas no hay tiempo límite por acción: un `click()` sobre un elemento que ya no existe espera hasta agotar los 45 s de la prueba.
- **Al sembrar datos:** hazlo antes de que cargue la app (`addInitScript`). Si se cargan después, la app ya ha redirigido a `#/bienvenida` y al recargar se queda allí.
- **Pistas falsas en la auditoría:**
  - El contenido de un `<details>` cerrado tiene posiciones aunque no se pinta.
  - Las insignias con `position: absolute` sobresalen a propósito.
  - En las capturas de página entera, la tab bar fija sale a media página.

## Forma de trabajar que ha funcionado

1. Hacer los cambios, probar en el iPhone emulado (Playwright) y revisar las capturas en claro y oscuro.
2. Ejecutar `npx playwright test --project=iphone-chromium` y, cuando cambie una regla o una pantalla, añadir o ajustar la prueba correspondiente.
3. Hacer commit en español (con las líneas de atribución que pida el sistema), push a `main` y revisar la ejecución de CI con las herramientas MCP de GitHub o con `curl` a la API pública (`api.github.com/repos/MartianFlow/Calisthenic-Flow/actions/runs`).
4. Subir `VERSION` (sw.js) y `APP_VERSION` (js/version.js) en cada publicación.
5. Explicar al usuario en español qué cambió y cómo verlo en el iPhone: se actualiza sola al abrirla o al volver a ella, y la versión se ve en Ajustes.
