# Calisthenic Flow

App personal de calistenia para iPhone: hojas de ruta de progresión por habilidad, entrenos recomendados según tu nivel, cronómetro de descansos e isometrías, y registro de tu evolución.

Es una **web app instalable (PWA)**: se añade a la pantalla de inicio del iPhone desde Safari y funciona como una app, también sin conexión. No necesita App Store, Xcode ni suscripción.

**Privacidad:** tus entrenos, niveles y notas se guardan solo en tu iPhone. No hay cuentas ni servidor, y nada se sube a GitHub. Quien abra la dirección de la app verá una app vacía con sus propios datos, nunca los tuyos. Los vídeos se cargan desde YouTube en modo de privacidad mejorada y no envían ningún dato de entreno.

## Qué incluye

- **14 rutas de progresión (116 pasos) revisadas con investigación.** Fuentes: r/bodyweightfitness Recommended Routine, Overcoming Gravity, GMB, estudios sobre descansos y RIR, etc. Cada paso tiene una meta de series × reps/segundos y claves técnicas:
  - **Fuerza:** Dominadas, Remo invertido, Flexiones, Fondos, Piernas (hasta pistol y camarón), Isquios y cadera (hasta el curl nórdico) y Core (hasta el dragon flag).
  - **Habilidades:** Muscle-up, Pino, Flexión de pino, L-sit, Front lever, Planche y Back lever, con prerrequisitos de fuerza.
- **Vídeo de técnica por ejercicio** (87 de 116 pasos), que se ve dentro de la app. Los pasos sin vídeo tienen un botón para buscarlo en YouTube.
- **Entreno recomendado del día:** alterna Día A (dominadas, fondos, piernas, core) y Día B (remo, flexiones, isquios, core). Las habilidades objetivo van al principio, con un máximo de 2 por sesión (si eliges 3, se rotan). Puedes editar el plan antes de empezar.
- **Descansos según el paso:** unos 3 min en series de 1–5 reps, 1,5–2 min en las de 6–12, 2,5–3 min en holds de brazos rectos, 45–60 s entre intentos de pino libre y 60 s en core.
- **Progresión según cómo te sientes:** al terminar cada ejercicio, mientras corre el descanso, la app pregunta si te pareció **Fácil, Normal o Difícil**.
  - La valoración equivale a las reps que te quedaban en reserva: Fácil = 3 o más, Normal = 1–2 (la zona ideal), Difícil = ninguna o perdiste técnica.
  - Mientras no llegas a la meta del paso, el objetivo sube +2 (Fácil) o +1 (Normal). En holds de brazos rectos sube solo +2 s o +1 s, porque los tendones se adaptan más despacio. Con Difícil se mantiene, y si no llegaste baja a tu mínimo del día.
  - Al alcanzar la meta: **Fácil** te pasa al siguiente ejercicio de la escala. **Normal** cuenta como sesión superada: con 1 subes en fuerza, y en habilidades necesitas 2 (configurable). **Difícil** te hace consolidar ese nivel.
  - **Estancamiento:** si una ruta no avanza en 3 sesiones, el objetivo se reinicia al 80 % para volver a subir.
- **Semana de descarga:** la app la sugiere cada 5–6 semanas o si tienes 2 rutas estancadas. Durante 7 días hay una serie menos, los objetivos bajan al 65 % y no se sube de nivel.
- **Calendario:** marca los días entrenados y las subidas de nivel. Al tocar un día ves qué entrenaste, tus series, cómo valoraste cada ejercicio y qué cambió en tu progreso.
- **Durante el entreno:** calentamiento guiado, contador +/− por serie, cronómetro con cuenta atrás para isometrías, temporizador de descanso con aviso sonoro y pantalla siempre encendida.
- **Progreso:** tiempo total, racha de semanas cumpliendo tu objetivo, minutos por semana, historial de subidas de nivel, gráfica de tu mejor serie en cada paso e historial completo de entrenos con notas.
- **Copia de seguridad:** exporta e importa tus datos en JSON desde Ajustes.

## Instalarla en el iPhone

1. Publica la app con GitHub Pages (solo hace falta una vez):
   en GitHub, entra en **Settings → Pages**. En **Build and deployment**, elige **Source: Deploy from a branch**, la rama **`main`** y la carpeta **`/ (root)`**, y pulsa **Save**.
   En uno o dos minutos estará en `https://martianflow.github.io/Calisthenic-Flow/`.
2. Abre esa dirección en **Safari** en el iPhone.
3. Pulsa **Compartir** y luego **Añadir a pantalla de inicio**.

Cuando se publiquen cambios, la app se actualiza sola: los verás la segunda vez que la abras.

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
- transiciones entre pantallas y una explosión de color al subir de nivel.

Respeta el ajuste del iPhone «Reducir movimiento». Tiene tema oscuro y claro automáticos.

## Investigación

El razonamiento y las fuentes de cada decisión están en:
- [`docs/investigacion-principios.md`](docs/investigacion-principios.md): descansos, series, RIR, estancamiento, descarga, calentamiento y seguridad.
- [`docs/investigacion-progresiones.md`](docs/investigacion-progresiones.md): revisión ruta por ruta.

## Personalizar las rutas

Todo el contenido de las progresiones está en [`js/data/roadmaps.js`](js/data/roadmaps.js). Ahí puedes:

- cambiar objetivos (`sets`, `target`) o descansos (`rest`, por paso);
- cambiar o añadir vídeos en [`js/data/videos.js`](js/data/videos.js) (clave `ruta/paso` e id del vídeo de YouTube);
- añadir, quitar o reordenar pasos;
- crear rutas nuevas;
- cambiar las plantillas de Día A y Día B (`DAY_TEMPLATES`) y el calentamiento (`WARMUP`).

Si añades archivos nuevos, inclúyelos también en la lista `ASSETS` de `sw.js` y sube el valor de `VERSION`.

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
js/fx.js                Efectos de cómic (onomatopeyas, latidos, destellos)
js/video.js             Visor de vídeos de YouTube
js/views/*.js           Pantallas: Hoy, Calendario, Entreno, Rutas, Progreso y Ajustes
fonts/                  Tipografía Bangers (SIL Open Font License 1.1, de Vernon Adams)
docs/                   Investigación con fuentes
```

Los vídeos pertenecen a sus autores y se reproducen con el reproductor oficial de YouTube.
