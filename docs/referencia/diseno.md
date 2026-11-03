# Diseño visual y maquetación en móvil

El estilo está en `css/styles.css`. Para revisar o corregir pantallas, sigue la skill `revisar-diseno`.

## Temas

- **Oscuro y claro:**
  - El oscuro va por defecto en `:root`.
  - El claro se aplica con `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` o con `:root[data-theme="light"]`.
  - **El bloque de colores claros está duplicado:** si cambias uno, cambia los dos.
  - El usuario puede forzar el tema en Ajustes → Apariencia (`js/theme.js`). Un script en línea de `index.html` lo aplica antes de pintar.
- **Cómic de alto contraste** (toda la app):
  - Paneles con borde negro de 3 px y sombra dura.
  - Colores: amarillo `#ffe500`, rosa `#ff2d87` y cian `#18e0ff`.
  - Letra Bangers y tramas de semitonos.
  - Onomatopeyas «¡POW!» al completar series, latido en el descanso y explosión al subir de nivel.
- **Pixel RPG** (clases `.px-*`): en Héroe, Logros, Equipo, el mini héroe de Hoy y las recompensas del resumen.
  - Ventana azul marino `#1b1e4b` con borde blanco y sombra negra.
  - Títulos en Press Start 2P y texto en VT323. Se descartó Pixelify Sans porque su «C» parecía una «O» y su «5» un «8».
  - Barras por segmentos y cuadro de texto «¡Has conseguido…!».
- **Reducir movimiento:** se respeta con el bloque `prefers-reduced-motion`.
  - Todo lo que solo se ve al terminar una animación tiene que corregirse también ahí.
  - Por ejemplo, la línea de las gráficas necesita `stroke-dashoffset: 0`.

## Maquetación en móvil (reglas de la auditoría de las versiones 10 y 11)

- **Anchos que deben funcionar:**
  - 320 px: iPhone SE de 1.ª generación, o cualquiera con «Zoom de pantalla»;
  - 375 px: SE de 2.ª y 3.ª generación;
  - 390 px: iPhone 12 a 16;
  - 430 px: Pro Max.
- **Por debajo de 360 px:** el bloque `@media (max-width: 359px)` del final del CSS reduce el padding, la letra y las filas de series.
- **Márgenes seguros** (app instalada, con barra de estado `black-translucent`): usan `--safe-top` y `--safe-bottom`.
- **Botones:**
  - `.btn` puede pasar a dos líneas (`text-wrap: balance`) si no cabe; es mejor que salirse.
  - `.btn.small` no se parte (`nowrap`). Si se pudiera partir, flex repartiría la falta de espacio entre todos y encogería botones que sí caben, como «+15 s».
  - Si un botón principal comparte fila, el secundario va solo con icono: `.btn.square` (52 px, con `aria-label`). Así están «Editar»/«Listo» en Hoy y «Anterior» en el entreno.
- **Filas de series (`.set`):**
  - La unidad va debajo del número (`.set .val small`).
  - Solo las isometrías llevan cronómetro o hueco (`.spacer`).
  - A 375 px caben: número 28, −/+ 44, valor 52, cronómetro o kg 40–42 y ✓ 48.
- **Filas de Hoy (`.ex-row`):**
  - Son una rejilla de 3 columnas.
  - El objetivo va compacto: «3 × 8» y debajo «seg /lado» y «meta 10».
  - Los botones de edición van en una segunda línea.
- **Textos compactos:**
  - `fmtSeries` («16 · 16 · 15 s») y `fmtLiftSeries` («117,5 kg × 9 · 8 · 7») para «Última vez».
  - `fmtDurationHtml` para las duraciones grandes (las unidades en `<small>`).
  - `liftPills` pone el peso una sola vez en el historial de gimnasio.
- **Iconos:** `.icon` es `inline-block`. En flex o grid se comporta como bloque; dentro de un párrafo no parte la línea.
- **Rejillas de 7 días:** `repeat(7, minmax(0, 1fr))`. Con `1fr` a secas, el contenido mínimo las ensancha.
- **`select`:**
  - Dentro de `.field` necesita `min-width: 0`.
  - En Safari, además, `overflow: hidden` y `text-overflow: ellipsis`. Sin eso, el texto de la opción elegida se sale y la página se puede desplazar en horizontal.
- **Letra pixel:**
  - Press Start 2P dibuja las mayúsculas con tilde más bajas, y parecen minúsculas.
  - `pixelCaps()` (app.js) quita la tilde (la ñ se queda) en las clases de `PX_CAPS`.
  - Si añades otra clase pixel en mayúsculas, inclúyela en `PX_CAPS`.
- **Tab bar oculta en el entreno:** usa `visibility: hidden` para no ser accesible.
- **Panel de descanso con valoración:** se compacta con `.rest-bar.with-rate`, y el padding inferior de la vista usa `:has()`.

## Animaciones (versión 12)

El usuario pidió «muchas más animaciones» para que la app se sienta más profesional. Están en `css/styles.css` («Movimiento…» y «Efectos») y en `js/fx.js`.

- **Qué hay:**
  - Transiciones entre pantallas según la dirección (`data-dir`): entre pestañas, según su orden; al entrar en un detalle, desde la derecha; al volver, desde la izquierda; el entreno, el resumen y la bienvenida, desde abajo.
  - Pastilla amarilla deslizante en la tab bar (`.tab-ind`): `app.js` solo pone `--tab` (0–4) y el CSS calcula `left` en porcentaje. Con píxeles medidos en JS, WebKit no la recolocaba a tiempo al cambiar el ancho y se salía de la pantalla.
  - Filas de las listas escalonadas (`staggerLists` pone `--i`), cifras que cuentan desde cero (`countUp`), segmentos de experiencia que se encienden, paneles que aparecen al bajar (`reveal`, con IntersectionObserver) y destello en el botón principal (`.cta`).
  - Rebote al tocar (`tap` / `.tapped`), interruptores que deslizan y el tema que cambia con un fundido (`fadeToTheme`).
  - En el entreno: la tarjeta entra de lado al cambiar de ejercicio, la fila de ejercicios se centra en el actual, la serie hecha destella (`.set-pop`), los últimos 5 s del descanso van en rosa (`.rest-bar.ending`) y al acabar sale «¡A POR ELLA!».
  - Confeti al terminar un entreno y la bienvenida.
  - Bienvenida: los pasos entran por la derecha o la izquierda, y la barra de progreso se llena por tramos.
- **Reglas:**
  - **Reducir movimiento:** el bloque `prefers-reduced-motion` lo quita todo y `fx.js` no hace nada. Nada puede depender de que una animación termine: con `reveal`, sin movimiento no se añade la clase.
  - **Si el elemento ya tiene `transform`** (rotaciones de pegatina, `.rest-bar`, `.on`), anima `translate`, `scale` o `rotate` (propiedades sueltas), no `transform`: si no, al acabar salta a su posición.
  - **`.view { overflow-x: clip }`** solo con movimiento, para que lo que entra de lado no cree scroll horizontal. Con `clip` (no `hidden`), `position: sticky` sigue funcionando. Sin movimiento no se aplica, para no esconder desbordes a la auditoría.
  - **Animaciones infinitas** (`.cta`, el ▶ del vídeo): en las pruebas con movimiento hay que pulsar con `dispatchEvent('click')`.
  - **La auditoría y casi todas las pruebas desactivan el movimiento.** Lo animado lo cubre `tests/e2e/motion.spec.js`, que en CI también corre en WebKit.

## Números grandes que laten (Safari)

- Bangers sobresale de su caja (el «7», por la derecha) y la sombra de cómic, aún más. Mientras el número late (`beat`), Safari recorta lo que sobresale: el usuario vio cortado el «27» del cronómetro de isometrías.
- **Solución:** padding y el mismo margen en negativo, con `pointer-events: none`. La caja crece sin mover nada. Está en `.hold-clock` y `.rest-clock`. Hazlo igual en cualquier número grande que se anime.
- **Comprobarlo:** pon un `outline` al elemento en una captura. Todo lo pintado tiene que quedar dentro.

## Cabeceras de las pestañas

- Las 5 pantallas principales llevan arriba a la derecha `headActions()` (theme.js):
  - el botón de tema muestra el sol en oscuro y la luna en claro, y alterna al momento;
  - el engranaje abre Ajustes.
- El engranaje antiguo (un círculo con rayos) parecía un sol y el usuario lo confundía con el modo claro: el icono `gear` ahora tiene dientes.
- **Bangers:** la «IJ» de «FIJO» parece una «U». En ese botón hay un espacio finísimo (`&#8202;`) entre las dos letras.
