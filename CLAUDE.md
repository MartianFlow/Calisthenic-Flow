# Calisthenic Flow

App **personal** de calistenia (PWA) que el usuario usa a diario en su **iPhone**, instalada desde GitHub Pages. Tiene rutas de progresión, entreno guiado con valoración Fácil/Normal/Difícil, plan semanal (con pierna en el gimnasio), calendario, progreso y un héroe en pixel art con logros. El README es la guía de uso; este archivo es el punto de partida para desarrollar.

## Reglas con el usuario

- **Todo en español:** la interfaz, los textos, los commits y las respuestas.
- **Privacidad:** los datos solo viven en el `localStorage` de su iPhone. Sin servidor, sin cuentas y nada de sus datos en GitHub.
- **Trabajo directo en `main`** del repositorio `MartianFlow/Calisthenic-Flow`. Sin pull requests salvo que los pida.
- **Explícale los cambios sin jerga**, con lo que verá en el iPhone y cómo actualizar. Si algo solo se puede comprobar en su móvil, pídele una captura.
- **Estado actual:** versión 12 (`cf-v12`). Lo pendiente de confirmar está en `docs/referencia/historial-usuario.md`.

## Cómo está hecha

- PWA estática sin compilación, con módulos ES y JavaScript sin frameworks. En local: `python3 -m http.server`.
- **Partes:**
  - `index.html`, `sw.js` y `css/styles.css`;
  - `js/app.js`: rutas por hash y delegación de eventos;
  - `js/store.js`: estado en localStorage;
  - `js/logic.js` y `js/schedule.js`: reglas de entreno y plan semanal;
  - `js/game.js`: gamificación;
  - `js/fx.js`: efectos y animaciones;
  - `js/views/*.js`: una vista por pantalla;
  - `js/data/*.js`: rutas, vídeos y gimnasio.
- **Patrones:**
  - Las vistas devuelven HTML como texto.
  - `data-action` / `data-change` apuntan a las funciones `actions` / `changes` de cada vista.
  - `update()` del store vuelve a pintar la vista.
  - Escapa con `esc()` todo lo que venga del usuario.
  - XP y estadísticas se calculan a partir del historial.
  - El progreso se guarda por índice de paso: cambiar pasos exige una migración en `store.js`.

## Reglas que no hay que olvidar

- **En cada publicación**, sube la versión en `sw.js` (`VERSION`) y en `js/version.js` (`APP_VERSION`).
- **Cada archivo nuevo** de la app va en `ASSETS` de `sw.js`.
- **Antes de subir:** `npx playwright test --project=iphone-chromium`. Después revisa CI, que también ejecuta WebKit, lo más parecido a Safari.
- **Pantalla nueva o cambiada:** auditoría de diseño a 320–430 px, y añadirla a `tests/tools/escenarios-diseno.js`.
- **Animaciones:** siempre con alternativa en «Reducir movimiento»; las reglas están en `docs/referencia/diseno.md`.
- **Pesos en kg:** campos `type="text" inputmode="decimal"`, porque iOS rompe la coma con `type=number`.
- **Entorno cloud:**
  - Bloqueados por el proxy: YouTube y github.io.
  - Solo hay Chromium.
  - No ejecutes `playwright install`.

## Skills del proyecto (`.claude/skills/`)

| Skill | Cuándo |
|---|---|
| `publicar` | Dejar un cambio publicado: versión, pruebas, commit, push, CI, Pages y qué decirle al usuario |
| `revisar-diseno` | Algo se ve mal, se corta o se solapa en el móvil; o se cambia o añade una pantalla |
| `pruebas-e2e` | Escribir o depurar pruebas Playwright y seguir con las pruebas exhaustivas pendientes |

## Documentos de referencia (`docs/referencia/`)

| Documento | Contenido |
|---|---|
| `historial-usuario.md` | Quién es el usuario, todo lo que ha pedido y lo pendiente de confirmar |
| `arquitectura.md` | Mapa de archivos, patrones, modelo de estado, despliegue, actualizaciones y límites del entorno |
| `reglas-entrenamiento.md` | Progresión doble, descansos, descarga, nivel, plan semanal y pierna en el gimnasio |
| `gamificacion.md` | XP, niveles, atributos, logros, artículos y héroe |
| `diseno.md` | Temas, estilo cómic y pixel, y reglas de maquetación en móvil |
| `pendiente.md` | Vídeos que faltan, ideas no hechas y huecos de pruebas |

La investigación con fuentes está en `docs/investigacion-*.md`.
