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
