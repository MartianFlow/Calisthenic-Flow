# Calisthenic Flow

App personal de calistenia para iPhone: hojas de ruta de progresión por habilidad, entrenos recomendados según tu nivel, cronómetro de descansos e isometrías, y registro de tu evolución.

Es una **web app instalable (PWA)**: se añade a la pantalla de inicio del iPhone desde Safari y funciona como una app, también sin conexión. No necesita App Store, Xcode ni suscripción. **Tus datos se guardan solo en tu iPhone.**

## Qué incluye

- **13 rutas de progresión** (más de 100 pasos), cada una con objetivo de series × reps/segundos y claves técnicas:
  - **Fuerza:** Dominadas, Remo invertido, Flexiones, Fondos, Piernas (hasta la pistol squat), Core (hasta el dragon flag).
  - **Habilidades:** Muscle-up, Pino, Flexión de pino, L-sit, Front lever, Planche, Back lever.
- **Entreno recomendado del día:** alterna Día A y Día B de cuerpo completo con tus ejercicios de fuerza en tu nivel actual. Las habilidades que marques como objetivo (hasta 3) van al principio de cada sesión. Puedes editar el plan antes de empezar.
- **Subida de nivel automática:** cuando completas todas las series llegando al objetivo en 2 sesiones (configurable), pasas al siguiente paso de la ruta.
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

## Personalizar las rutas

Todo el contenido de las progresiones está en [`js/data/roadmaps.js`](js/data/roadmaps.js). Ahí puedes:

- cambiar objetivos (`sets`, `target`) o descansos (`rest`);
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
js/views/*.js           Pantallas: Hoy, Entreno, Rutas, Progreso y Ajustes
```
