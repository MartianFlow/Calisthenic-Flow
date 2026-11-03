# Gamificación

Todo se calcula en `js/game.js` a partir del historial. Solo se guardan las fechas de los logros desbloqueados.

## XP y niveles

- **XP por sesión:**
  - 40 por terminarla, 4 por cada serie y 3 por cada ejercicio valorado;
  - 1 por minuto, hasta 60;
  - 120 por cada paso superado, 600 por cada ruta completada y 30 por cada subida de peso en el gimnasio.
- **XP por logro según su rareza:** bronce 50, plata 150, oro 400 y leyenda 1000.
- **Niveles:** `xpForLevel(L) = 150·(L−1)^1.6`.
- **Títulos:** Novato (1), Aprendiz (3), Callejero (5), Atleta (8), Acróbata (12), Gimnasta (16), Maestro (20), Leyenda (25) y Mito (30).

## Atributos (rango E–S)

- Son seis: Tirón, Empuje, Piernas, Core, Equilibrio y Aguante.
- Salen de la fracción recorrida en cada ruta. Las rutas básicas pesan el doble.
- **Aguante:** √(minutos / 3000) · 100.
- **Piernas:** también cuenta las subidas de peso del gimnasio, √(subidas / 60) · 100, y se queda con el valor mayor.

## Logros y artículos

- **Logros:** 46, en 4 categorías: constancia, progreso, hitos y hábitos.
  - Tres son de pierna: `dia-pierna`, `pierna-25` y `mas-peso`.
  - Se definen con `check(stats) → [actual, meta]`.
- **Cuándo se sincronizan los logros:**
  - al cargar la app, sin celebración;
  - al terminar un entreno, con celebración en el resumen;
  - al ver vídeos.
- **Artículos:** 33, repartidos en los huecos head, face, top, neck, wrists, bottom, feet, back y aura.
  - Se desbloquean por `{ level }` o por `{ ach }`.
  - Por defecto se llevan la camiseta blanca, el pantalón negro y las zapatillas blancas.

## Héroe (`avatar.js`) e iconos (`pixel.js`)

- **Héroe:**
  - Pixel art de 40×48 por capas.
  - Sus proporciones dependen de los atributos: `hs` (hombros) 6–10, `bic` 1–4, `armW` 3–5 y `legW` 3–5.
  - Pose de doble bíceps, contorno y sombreado automáticos, aura con `glow` y animación en reposo con `steps()`.
- **Iconos de artículos:**
  - Sprites de texto de 16×16 en `ICONS`, solo con relleno porque el contorno se añade solo.
  - `C` es el color del artículo; los colores fijos están en `FIXED`.
  - Los bloqueados se pintan con `silhouette`.
