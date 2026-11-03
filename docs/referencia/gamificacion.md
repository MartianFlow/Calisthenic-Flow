# Gamificación

Todo se calcula en `js/game.js` a partir del historial. Solo se guardan:
- las fechas de los logros desbloqueados (`game.unlocked`);
- las misiones cumplidas de cada semana (`game.missions`);
- unos pocos contadores para logros secretos (`game.pokes`, `game.themeFlips`).

## XP y niveles

- **XP por sesión:**
  - 40 por terminarla, 4 por cada serie y 3 por cada ejercicio valorado;
  - 1 por minuto, hasta 60;
  - 120 por cada paso superado, 600 por cada ruta completada y 30 por cada subida de peso en el gimnasio.
- **XP por récord personal:** 15 (`personalRecords`).
  - Cuenta la mejor serie de cada paso, de cada complementario y el mayor peso de cada ejercicio de gimnasio.
  - La primera vez que se hace algo no es récord.
- **XP por misión de la semana:** 60 cada una y 60 más si se cumplen las 3 (`missionXP`).
- **XP por logro según su rareza:** bronce 50, plata 150, oro 400 y leyenda 1000.
- **Niveles:** `xpForLevel(L) = 150·(L−1)^1.6`.
- **Títulos:** Novato (1), Aprendiz (3), Callejero (5), Atleta (8), Acróbata (12), Gimnasta (16), Maestro (20), Leyenda (25) y Mito (30).

## Atributos (rango E–S)

- Son seis: Tirón, Empuje, Piernas, Core, Equilibrio y Aguante.
- Salen de la fracción recorrida en cada ruta. Las rutas básicas pesan el doble.
- **Aguante:** √(minutos / 3000) · 100.
- **Piernas:** también cuenta las subidas de peso del gimnasio, √(subidas / 60) · 100, y se queda con el valor mayor.

## Logros (114, 15 secretos)

- **Seis categorías:** constancia, progreso, hitos de calistenia, tus habilidades (foco, mantener, «Solo pino», complementarios, alternancia), buenos hábitos y secretos.
- **Nuevos en las v20 y v21** (buenos hábitos): «Creador» (crear un ejercicio propio), «Marca de la casa» (10 entrenos con propios), «A salvo» (exportar una copia), «En la báscula» (4 registros de peso), «Dos por uno» (un entreno con superseries) y «Arquitecto» (semana «A tu manera» con 2 días tuyos o más).
- **Ejercicios propios en la EXP:** sus series y valoraciones cuentan como las demás; su récord es el mayor peso (si lleva) o la mejor serie. Sus subidas de peso dan los +30 de siempre, pero solo los de pierna cuentan para el atributo Piernas, los días de pierna y «Más discos».
- Se definen con `check(stats) → [actual, meta]`. Las estadísticas están en `gameStats` y `moreStats`.
- **Secretos** (`secret: true`, con `hint`):
  - hasta conseguirlos se ven como «???» con una pista;
  - en Equipo, su artículo dice «Logro secreto», sin el nombre (`unlockText`);
  - son de fechas (1 de enero, Navidad, viernes 13, de madrugada), del historial (dos entrenos el mismo día, volver tras 30 días, todo Fácil o todo Difícil, exprés, más de 2 h, 3 subidas en un entreno) o de la app (tocar al héroe 10 veces, cambiar de tema 10 veces, ponerle nombre, llevar algo en todas las ranuras).
- **Cuándo se sincronizan los logros y las misiones:**
  - al cargar la app, sin celebración;
  - al terminar un entreno, con celebración en el resumen;
  - al ver vídeos;
  - con `unlockCheck()` (hero.js): al tocar al héroe, cambiar el tema, cambiarle el nombre, equiparse, crear un ejercicio, exportar una copia, apuntar el peso y asignar tus días, con un aviso del logro conseguido.

## Misiones de la semana

- **Tres por semana** (`weekMissions`): «Completa N entrenos» (N = días del plan) y 2 más.
- Las 2 se eligen de un grupo con una mezcla fija según la semana, así que no cambian al reabrir la app. Algunas solo salen si tienes foco o el pino entre tus habilidades.
- **Al cumplirse** se guardan en `game.missions[lunes] = { ids }` (`syncMissions`), para que su EXP no cambie aunque luego cambien los ajustes.
- Se ven en Héroe (con su progreso), en el mini héroe de Hoy («Misiones 1/3») y en el resumen del entreno en que se cumplen.

## Artículos (70, en 10 ranuras)

- **Ranuras:** head, face, top, neck, wrists, bottom, feet, back, aura y pet (mascota).
- Se desbloquean por `{ level }` o por `{ ach }`; cada logro da como mucho un artículo.
- Por defecto se llevan la camiseta blanca, el pantalón negro y las zapatillas blancas.
- **Con forma propia:**
  - cabeza: gorra, corona, gorro (y de Navidad), auriculares, casco vikingo y halo;
  - cara: gafas de sol, gafas de estrella, antifaz, parche, bigote y visor;
  - cuello: medallas, toalla y cadena;
  - espalda: capas y alas;
  - camiseta: la de rayas;
  - aura: la de arcoíris (`rainbow`).
  - El resto cambia solo el color de su capa.
- **Mascotas** (`PET_SPRITES` en pixel.js, 8×8): gato, perro, pollito, slime, fantasma y dragón. Se sientan a la izquierda del héroe; su icono es el mismo sprite al doble.

## Héroe (`avatar.js`) e iconos (`pixel.js`)

- **Héroe:**
  - Pixel art de 40×48 por capas.
  - Sus proporciones dependen de los atributos: `hs` (hombros) 6–10, `bic` 1–4, `armW` 3–5 y `legW` 3–5.
  - Pose de doble bíceps, contorno y sombreado automáticos, aura con `glow` y animación en reposo con `steps()`.
  - Al tocarlo en Héroe da un salto (`poked`) y suelta una onomatopeya.
- **Iconos de artículos:**
  - Sprites de texto de 16×16 en `ICONS`, solo con relleno porque el contorno se añade solo.
  - `C` es el color del artículo; los colores fijos están en `FIXED`.
  - Los bloqueados se pintan con `silhouette`.
  - `itemIconName` (hero.js) elige el icono de cada artículo.
