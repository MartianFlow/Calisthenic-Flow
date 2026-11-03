# Calisthenic Flow

App personal de calistenia para iPhone: hojas de ruta de progresión por habilidad, entrenos recomendados según tu nivel, cronómetro de descansos e isometrías, y registro de tu evolución.

Es una **web app instalable (PWA)**: se añade a la pantalla de inicio del iPhone desde Safari y funciona como una app, también sin conexión. No necesita App Store, Xcode ni suscripción.

**Privacidad:** tus entrenos, niveles y notas se guardan solo en tu iPhone. No hay cuentas ni servidor, y nada se sube a GitHub. Quien abra la dirección de la app verá una app vacía con sus propios datos, nunca los tuyos. Los vídeos se cargan desde YouTube en modo de privacidad mejorada y no envían ningún dato de entreno.

## Qué incluye

- **14 rutas de progresión (116 pasos) revisadas con investigación.** Fuentes: r/bodyweightfitness Recommended Routine, Overcoming Gravity, GMB, estudios sobre descansos y RIR, etc. Cada paso tiene una meta de series × reps/segundos y claves técnicas:
  - **Fuerza:** Dominadas, Remo invertido, Flexiones, Fondos, Piernas (hasta pistol y camarón), Isquios y cadera (hasta el curl nórdico) y Core (hasta el dragon flag).
  - **Habilidades:** Muscle-up, Pino, Flexión de pino, L-sit, Front lever, Planche y Back lever, con prerrequisitos de fuerza.
- **Vídeo de técnica por ejercicio** (87 de 116 pasos y los 9 de pierna en el gimnasio), que se ve dentro de la app. Los pasos sin vídeo tienen un botón para buscarlo en YouTube.
  - **Sin empezar el entreno:** toca cualquier ejercicio en Hoy o en el Plan semanal para ver su vídeo, sus claves técnicas y tu objetivo. Los de gimnasio muestran además tu historial de pesos con una gráfica.
- **Plan semanal recomendado:** según tu nivel (principiante, intermedio o avanzado), tus habilidades objetivo y los días que tienes libres, la app te recomienda cuántos días entrenar y reparte la semana:
  - Día A: tirón vertical, fondos, piernas y core.
  - Día B: tirón horizontal, flexiones, isquios y core.
  - Día S: habilidades y core; aparece con 5 o más días y objetivos.
  - Deja descanso entre sesiones y nunca pone habilidades de brazos rectos en días seguidos ni más de 3 días por semana.
  - **Nivel:** media de lo recorrido en tus rutas de fuerza y en las habilidades que trabajas. Las habilidades cuentan desde el nivel que piden sus prerrequisitos. Sin mínimo de entrenos.
- **Pierna en el gimnasio (opcional):** en *Plan semanal* eliges «Pierna: Gimnasio» y la semana pasa a torso/pierna.
  - **Reparto:** con 5 días, torso L-X-V y pierna M-J. Si también tienes libre el sábado, pierna martes y viernes, con 72 h de separación.
  - **Torso A / Torso B:** dominadas, fondos, remo, flexiones y core, con tus habilidades al principio. A y B cambian el orden.
  - **Pierna:** tu rutina completa, siempre en el mismo orden: sentadilla hack, peso muerto piernas rígidas, goblet en hack, extensión, curl femoral, aductor, abductor, gemelo de pie y gemelo sentado.
  - Apuntas el peso de cada ejercicio y la app usa **progresión doble con carga**: cuando haces el tope del rango en todas las series, te sube el peso (+5 kg o +2,5 kg) y vuelves al mínimo del rango. Si no llegas al mínimo con Difícil, te baja ~10 %.
  - Calentamiento propio de pierna, XP por cada subida de peso y logros de pierna.
  - La pantalla Hoy te dice qué toca, si es día de descanso y cuál es el próximo entreno. Puedes editar el entreno antes de empezar.
- **Gamificación (pixel art, estilo RPG retro de 16 bits):**
  - **Héroe en pixel art** cuyo físico crece con tu progreso real (bíceps, hombros, piernas y abdominales).
  - **Atributos** con rango de E a S: Tirón, Empuje, Piernas, Core, Equilibrio y Aguante.
  - **Experiencia (XP) y nivel**, con títulos de Novato a Mito. Ganas XP con cada serie, cada entreno, cada paso superado y cada logro.
  - **Tabla de 46 logros** de bronce, plata, oro y leyenda, con progreso visible. Premian constancia, progreso, hitos reales (primera dominada, pino libre, front lever…) y buenos hábitos.
  - **33 artículos** con iconos de 16×16 para equipar (cintas, gafas, muñequeras, capas, medallas, auras, corona…). Se desbloquean por nivel o por logro. También puedes elegir piel, pelo y peinado.
  - Al terminar cada entreno ves la XP ganada, si subes de nivel y los logros y artículos nuevos.
- **Descanso entre series a tu medida:** por defecto el mismo para todo (80 s), que cambias en Ajustes con −/+ o con atajos (1 min, 1:20, 1:30, 2 min, 3 min). Durante el descanso, los botones −15 y +15 lo acortan o lo alargan.
  - Si prefieres, «Según ejercicio» usa el recomendado para cada paso: unos 3 min en series de 1–5 reps, 1,5–2 min en las de 6–12, 2,5–3 min en holds de brazos rectos, 45–60 s entre intentos de pino libre y 60 s en core.
- **Progresión según cómo te sientes:** al terminar cada ejercicio, mientras corre el descanso, la app pregunta si te pareció **Fácil, Normal o Difícil**.
  - La valoración equivale a las reps que te quedaban en reserva: Fácil = 3 o más, Normal = 1–2 (la zona ideal), Difícil = ninguna o perdiste técnica.
  - Mientras no llegas a la meta del paso, el objetivo sube +2 (Fácil) o +1 (Normal). En holds de brazos rectos sube solo +2 s o +1 s, porque los tendones se adaptan más despacio. Con Difícil se mantiene, y si no llegaste baja a tu mínimo del día.
  - Al alcanzar la meta: **Fácil** te pasa al siguiente ejercicio de la escala. **Normal** cuenta como sesión superada: con 1 subes en fuerza, y en habilidades necesitas 2 (configurable). **Difícil** te hace consolidar ese nivel.
  - **Estancamiento:** si una ruta no avanza en 3 sesiones, el objetivo se reinicia al 80 % para volver a subir.
- **Semana de descarga:** la app la sugiere cada 5–6 semanas o si tienes 2 rutas estancadas. Durante 7 días hay una serie menos, los objetivos bajan al 65 % y no se sube de nivel.
- **Tema claro u oscuro:** el botón del sol o la luna, arriba en las pantallas principales, cambia entre claro y oscuro al momento. En Ajustes → Apariencia puedes volver a «Automático», que sigue al iPhone. El engranaje de al lado abre Ajustes.
- **Calendario:** marca los días entrenados y las subidas de nivel. Al tocar un día ves qué entrenaste, tus series, cómo valoraste cada ejercicio y qué cambió en tu progreso.
- **Durante el entreno:** calentamiento guiado, contador +/− por serie, cronómetro para isometrías con 5 s para colocarte (ajustable, y con «+5 s» mientras cuenta), temporizador de descanso con aviso sonoro y pantalla siempre encendida.
- **Progreso:** tiempo total, racha de semanas cumpliendo tu objetivo, minutos por semana, historial de subidas de nivel, gráfica de tu mejor serie en cada paso e historial completo de entrenos con notas.
- **Copia de seguridad:** exporta e importa tus datos en JSON desde Ajustes.
- **Bienvenida paso a paso:** la primera vez, unas preguntas de una en una con una barra de progreso: tu experiencia, dónde entrenas pierna, tu nivel en cada ruta (tocando el primer ejercicio que aún no te sale, con su vídeo a mano), tus habilidades objetivo, tus días, tu descanso y tu héroe. Al final, un resumen con «Cambiar» en cada punto. También puedes importar una copia desde la portada.

## Instalarla en el iPhone

1. Publica la app con GitHub Pages (solo hace falta una vez):
   en GitHub, entra en **Settings → Pages**. En **Build and deployment**, elige **Source: Deploy from a branch**, la rama **`main`** y la carpeta **`/ (root)`**, y pulsa **Save**.
   En uno o dos minutos estará en `https://martianflow.github.io/Calisthenic-Flow/`.
2. Abre esa dirección en **Safari** en el iPhone.
3. Pulsa **Compartir** y luego **Añadir a pantalla de inicio**.

Cuando se publiquen cambios, la app se actualiza sola al abrirla o al volver a ella si hay conexión. La versión instalada se ve al final de Ajustes, donde también hay un botón «Actualizar la app».

> Los datos viven en el almacenamiento de la app en ese iPhone. Si borras la app de la pantalla de inicio o los datos de Safari, se pierden, así que exporta una copia de vez en cuando desde Ajustes.

## Probarla en el Mac

No hay que compilar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Después abre `http://localhost:8000`.

## Diseño

Estilo cómic de alto contraste, con:
- paneles con tinta gruesa, sombras duras y tramas de semitonos;
- onomatopeyas al completar series («¡POW!», «¡BAM!»);
- un temporizador que late con el descanso;
- transiciones entre pantallas que entran desde el lado de la pestaña o del detalle al que vas;
- una pastilla amarilla que se desliza por la barra de pestañas;
- listas que entran fila a fila, cifras que cuentan desde cero, barras que se llenan y paneles que aparecen al bajar;
- un rebote en cada botón, interruptor o casilla que tocas;
- en el entreno, la tarjeta del ejercicio entra de lado, la serie hecha destella y los últimos 5 s del descanso se ponen en rosa;
- confeti al terminar un entreno y una explosión de color al subir de nivel.

Respeta el ajuste del iPhone «Reducir movimiento»: con él activado no hay animaciones. Tiene tema oscuro y claro automáticos.

Está probado pantalla por pantalla en anchos de 320 a 430 px, que cubren todos los iPhone. La comprobación automática busca textos que se pisen, botones que se corten, contenido que se salga de la pantalla o quede tapado por las barras, y poco contraste.

## Investigación

El razonamiento y las fuentes de cada decisión están en:
- [`docs/investigacion-principios.md`](docs/investigacion-principios.md): descansos, series, RIR, estancamiento, descarga, calentamiento y seguridad.
- [`docs/investigacion-progresiones.md`](docs/investigacion-progresiones.md): revisión ruta por ruta.
- [`docs/investigacion-pierna-gym.md`](docs/investigacion-pierna-gym.md): rutina de pierna en el gimnasio, plan torso/pierna y cuántas habilidades trabajar a la vez.

## Pruebas funcionales (e2e)

La carpeta [`tests/e2e`](tests/e2e) tiene una batería de pruebas con [Playwright](https://playwright.dev). Simulan un iPhone 13 y recorren la app como lo harías tú:

| Archivo | Qué comprueba |
|---|---|
| `onboarding.spec.js` | Bienvenida paso a paso: experiencia, pierna, niveles, objetivos (máx. 3), días, descanso, héroe y resumen; atrás, «Cambiar», recargar a mitad e importar una copia |
| `rest.spec.js` | Descanso fijo de 80 s por defecto, −15/+15 durante el descanso, cambiarlo en Ajustes y «Según ejercicio» |
| `motion.spec.js` | Con las animaciones activadas: todo acaba visible, sin scroll horizontal, y las cabeceras fijas siguen en su sitio |
| `workout.spec.js` | Entreno completo: calentamiento, series, cronómetro de isometrías, descanso, valoración durante el descanso, resumen con EXP. También recargar a mitad de entreno y descartar |
| `progression.spec.js` | Fácil, Normal y Difícil: subida del objetivo, cambio de paso, 2 sesiones en habilidades, recalibrado, reinicio por estancamiento y descanso según el paso |
| `plan.spec.js` | Recomendación de días, nivel con habilidades, cambio de días disponibles, reglas de brazos rectos, día de descanso y «Misión cumplida» |
| `gym.spec.js` | Pierna en el gimnasio: semana torso/pierna, separación de los días de pierna, recomendación de 5 días, pesos con coma, subida y bajada de peso, cambio de peso durante el entreno y ficha del ejercicio con vídeo desde Hoy y el Plan |
| `gamification.spec.js` | Héroe en pixel art, atributos, logros desbloqueados, artículos bloqueados y desbloqueados, apariencia y nombre |
| `navigation.spec.js` | Rutas, visor de vídeo, búsqueda en YouTube, cambio manual de nivel, calendario, progreso, pestañas, tema claro u oscuro y su botón en las cabeceras |
| `deload.spec.js` | Sugerencia y efecto de la semana de descarga |
| `data.spec.js` | Migración desde la v1, exportar e importar la copia, borrar datos y funcionamiento sin conexión |
| `layout.spec.js` | Diseño en móvil: 97 pantallas y estados a 320, 375, 390 y 430 px. Comprueba que nada se sale de la pantalla, que ningún texto se pisa, se corta o se sale de su botón, que nada queda tapado por las barras y que el contraste es suficiente |

Las pruebas usan un reloj fijo (lunes 2/11/2026) y bloquean internet, así que siempre dan el mismo resultado. Además fallan si la app lanza cualquier error de JavaScript.

**Ejecutarlas en el Mac:**

```bash
npm install
npx playwright install chromium webkit   # solo la primera vez
npm run test:e2e            # todas, con Chromium y WebKit (Safari)
npm run test:e2e:webkit     # solo WebKit
npm run test:e2e:ui         # modo visual: ves cada paso en el navegador
npm run test:e2e:report     # informe HTML de la última ejecución
```

**Auditoría del diseño con capturas** (genera `test-results/diseno/` con un informe y una captura de cada pantalla):

```bash
node tests/tools/auditar-diseno.js              # 320, 375, 390 y 430 px, claro y oscuro
node tests/tools/auditar-diseno.js --notch      # como la app instalada en un iPhone con notch
```

**En GitHub** se ejecutan solas en cada cambio (pestaña *Actions* → *Pruebas e2e*). Si alguna falla, el informe con capturas y trazas se descarga desde la propia ejecución.

## Personalizar las rutas

Todo el contenido de las progresiones está en [`js/data/roadmaps.js`](js/data/roadmaps.js). Ahí puedes:

- cambiar objetivos (`sets`, `target`) o descansos (`rest`, por paso);
- cambiar o añadir vídeos en [`js/data/videos.js`](js/data/videos.js) (clave `ruta/paso` e id del vídeo de YouTube);
- añadir, quitar o reordenar pasos;
- crear rutas nuevas;
- cambiar las plantillas de Día A y Día B y de Torso A y B (`DAY_TEMPLATES`) y el calentamiento (`WARMUP`).

Los ejercicios de gimnasio y los días de pierna están en [`js/data/gym.js`](js/data/gym.js): rango de reps, series, descanso, subida de peso y qué ejercicios lleva cada día.

Si añades archivos nuevos, inclúyelos también en la lista `ASSETS` de `sw.js`. En cada publicación sube la versión en `sw.js` (`VERSION`) y en `js/version.js` (`APP_VERSION`), que deben coincidir: así los iPhone con la app instalada detectan la versión nueva y se recargan solos.

## Estructura

```
index.html              Página principal y barra de pestañas
manifest.webmanifest   Metadatos de la app instalable
sw.js                   Service worker (funcionamiento sin conexión)
css/styles.css          Estilos (tema oscuro y claro)
js/app.js               Rutas, eventos y temporizadores
js/store.js             Estado guardado en localStorage
js/logic.js             Generación de entrenos, subidas de nivel y estadísticas
js/data/roadmaps.js     Contenido: rutas, plantillas y calentamiento
js/data/videos.js       Vídeo de técnica de cada paso
js/data/legacy.js       Nombres de pasos de la v1 (migración del progreso)
js/data/gym.js          Pierna en el gimnasio: ejercicios con peso, día de pierna y su calentamiento
js/theme.js             Tema claro u oscuro elegido en Ajustes
js/fx.js                Efectos y animaciones (onomatopeyas, latidos, confeti, cifras, apariciones)
js/version.js           Versión de la app (la misma que en sw.js)
js/game.js              XP, niveles, atributos, logros y artículos
js/avatar.js            Héroe en pixel art (generado por capas)
js/pixel.js             Motor de pixel art e iconos 16×16
js/schedule.js          Plan semanal recomendado
js/video.js             Visor de vídeos de YouTube
js/views/*.js           Pantallas: Bienvenida, Hoy, Calendario, Entreno, Rutas, Héroe, Plan, Ejercicio, Progreso y Ajustes
fonts/                  Tipografías Bangers, Press Start 2P y VT323 (SIL Open Font License 1.1)
docs/                   Investigación con fuentes
tests/e2e/              Pruebas funcionales (Playwright)
```

Los vídeos pertenecen a sus autores y se reproducen con el reproductor oficial de YouTube.
