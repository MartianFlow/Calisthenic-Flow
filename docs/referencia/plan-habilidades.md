# Plan: cambios en el entrenamiento de habilidades (pendiente de hacer)

La investigación con fuentes está en `docs/investigacion-habilidades.md`, en «Catorce cambios para la app». Este documento es el plan para hacerlos.

## Decisión del usuario (3/11/2026)

- **Hacer todos los cambios recomendados, salvo el n.º 2.**
- **El descanso sigue fijo en 80 s para todo, también en las habilidades** («el tiempo de descanso lo quiero seguir manteniendo así»).
  - No tocar `restSeconds` ni hacer que las habilidades descansen más.
  - Con la alternancia (cambio 10, aquí «B»), cada habilidad descansa entre sus series: 80 s + la serie de la otra + 80 s, unos 3 min. Así se recupera el descanso recomendado sin tocar los 80 s. Por eso la alternancia va pronto.
- Después de hacerlo: publicar (skill `publicar`), contárselo sin jerga y actualizar `historial-usuario.md`, `reglas-entrenamiento.md` y el README.

## Datos del código que hay que tener en cuenta

- **Pasos:** `js/data/roadmaps.js`, `ROADMAPS[].steps[]` = `{ key, name, type: 'reps'|'hold', sets, target, side?, rest?, cues[], was? }`.
  - Los vídeos van por `'ruta/key'` en `js/data/videos.js`.
  - Verifica las `key` reales con `grep -n "key:" js/data/roadmaps.js` antes de referenciarlas.
- **Migraciones:** el progreso se guarda por **índice** de paso. Cambiar `sets`, `target` o `cues` de un paso no exige migración. Insertar, quitar o reordenar pasos sí (ver `arquitectura.md`). `workFor` ya limita el objetivo a la nueva `target`.
- **Habilidades por sesión:**
  - `sessionGoals(state)` en `js/logic.js`: máximo `MAX_SKILLS_PER_SESSION = 2` y rotación si hay 3. Se usa en `defaultIds`.
  - Con plan semanal, el reparto real está en `buildWeek` (`js/schedule.js`):
    - `maxSkills`: 3 en el Día S y 2 en A, B, TA y TB;
    - brazos rectos: como mucho 2 por día, 3 días por semana y nunca en días seguidos (`lastDay[g] === wd - 1`).
- **Ítem del entreno** (`createSession`):
  - calistenia: `{ roadmapId, stepIndex, type, target, goal, plannedSets, side, rest, rating, sets[{ value, done }] }`;
  - gimnasio: `liftId`.
- **Sitios que leen los ítems** y habrá que adaptar a un ítem nuevo de tipo complementario:
  - `itemName` (logic.js);
  - `finishActiveSession` (logic.js, ~línea 480–530: aplica la progresión por `roadmapId`);
  - `lastPerformance`;
  - `estimateMinutes`;
  - `nextUnrated` e `itemComplete`;
  - en `session.js`: `chips()`, `exerciseCard()` (rama nueva, como `liftCard`), `completeSet()` y `ratePanel()`;
  - `progress.js` (`itemBlock` ~línea 136, resumen y detalle);
  - `calendar.js` (detalle del día);
  - `game.js` (~línea 169: cuenta rutas distintas por `roadmapId`; `sessionXP` cuenta series, y está bien que cuente las del complementario);
  - `home.js` (`exerciseRow`) y `plan.js` (`chipFor`), si se muestran.
- **Calentamiento:** `WARMUP` en `roadmaps.js`. Lo devuelve `warmupList(active)`, y `active.warmupChecks` guarda **índices**. Si la lista cambia según las habilidades, guarda los extras en el entreno al crearlo (`active.warmupExtra`), para que una recarga no la desordene.

## Orden de trabajo propuesto

### A. Complementarios por habilidad (cambios 1, 6, 13 y parte del 5)

- **Modelo:** campo nuevo `accessories` en cada ruta de habilidad.
  - Cada uno: `{ ref: 'ruta/key' }` (reutiliza nombre, claves y vídeo de un paso existente) o `{ id, name, type, cues }` si es nuevo.
  - Más `sets`, `target`, `fromStep` / `toStep` opcionales (desde qué paso de la habilidad aplica) y `prep: true` si va **antes** de los aguantes, como el german hang del back lever.
  - Series y repeticiones fijas, sin progresión ni valoración, así que **no hace falta migración**.
- **Ítem en el entreno:** `{ accessoryOf: '<id habilidad>', acc: '<ref o id>', type, target, goal: target, plannedSets, sets[], rest }`.
  - **No** llevar `roadmapId`, o `finishActiveSession` haría progresar esa otra ruta.
  - Sin pregunta de dificultad: que `nextUnrated` y el aviso de valorar los salten.
  - Guardarlos en el historial con sus series; contar las series para la XP y no para el progreso.
  - «Última vez» del complementario: buscar en el historial por `acc`.
- **Orden en la sesión:** práctica de pino (D) → aguantes de habilidades (alternados, B) → preparación (`prep`) justo antes de su habilidad → complementarios → básicos del día.
- **Propuesta de complementarios** (comprobar las `key` reales; las de «nuevo» necesitan claves y, sin vídeo, saldrá el botón de buscar en YouTube):

| Habilidad | Complementarios | Desde |
|---|---|---|
| Front lever | «Remo en tuck front lever» (`remo/…`) 3×6 · «Retracciones escapulares» (`dominadas/escapulares`) 3×10 · nuevo: jalón con brazos rectos con banda 3×10 (alternativo) | Siempre |
| Back lever | `prep`: «German hang» (`backlever/german-hang`) 2×20 s + «Skin the cat» 2×3 · dislocaciones con palo o banda en el calentamiento | Siempre |
| Planche | «Planche lean» (`planche/lean`) 3×20 s · «Flexiones pseudo planche» (`flexiones/pseudo-planche`) 3×8 · nuevo: flexiones de muñeca sobre el dorso (calentamiento) | Lean desde el paso 1; pseudo, siempre |
| L-sit | «Elevaciones de piernas sentado» (`lsit/…`) 3×8, al principio del bloque | Siempre |
| Muscle-up | «Transiciones en barra baja» (`muscleup/transiciones`) 3×4 · «Dominadas explosivas» 3×3 · «Fondos en barra recta» (`fondos/…`) 3×5 | Según el paso |
| Pino | «Despegues de la pared» 3×5 + «Patada y salida en rueda» 3×3 (cambio 6) | Desde «Pino de cara a la pared (1 min)», paso 3 |
| Flexión de pino | nuevo: encogimientos en pino contra la pared 3×8 | Siempre |
| L-sit en el core (cambio 13) | Si el L-sit es objetivo y no toca hoy: «Elevaciones de piernas sentado» 2×8 después del core | Cualquier día con core |

### B. Alternar las series de las dos habilidades (cambio 10)

- Si la sesión tiene 2 habilidades, al terminar una serie de la primera, y si a la segunda le quedan series, `completeSet` pasa a la segunda, y al revés.
- El descanso empieza igual (80 s).
- En la tarjeta: «Alternando con <habilidad>».
- Que no salte si la otra ya está completa. Los chips siguen permitiendo moverse a mano.
- La valoración de cada habilidad sale al completar sus series, como ahora.

### C. Más series cortas en los aguantes difíciles (cambio 4) y retoques de metas (cambio 14)

- En los pasos de brazos rectos con meta de 12 s o menos, subir de 3 a 5 o 6 series para acercarse a 40–60 s.
- Solo cambia `sets`, así que no hay migración.

| Ruta | Paso (key) | Ahora | Propuesta |
|---|---|---|---|
| Front lever | `tuck-avanzado` | 3×12 | 4×15 (meta 12 → 15, cambio 14) |
| Front lever | `una-pierna` (por lado) | 3×8 | 4×8 |
| Front lever | `straddle` / `half-lay` | 3×8 | 5×8 |
| Front lever | `completo` / `completo-10` | 3×5 / 3×10 | 6×5 / 5×10 |
| Planche | tuck / tuck 20 s / tuck avanzado / straddle con banda | 3×10 / 3×20 / 3×10 / 3×10 | 5×10 / 3×20 / 5×10 / 5×10 |
| Planche | straddle / completa | 3×5 | 6×5 |
| Back lever | tuck / tuck avanzado (cambio 5) | 3×15 / 3×10 | 3×20 / 4×15 |
| Back lever | una pierna / straddle / completo / 10 s | 3×8 / 3×8 / 3×5 / 3×10 | 4×8 / 5×8 / 6×5 / 5×10 |
| L-sit | V-sit | 3×5 | 5×5 |
| Planche | lean | — | En las claves: «hombros unos 10 cm por delante de las muñecas» |
| Flexión de pino | negativas de pino en pared | 3×5 | 4×3 (bajando en 3–5 s) |

- Comprobar después: `estimateMinutes`, que la sesión no pase de unos 75 min con 2 habilidades y la alternancia, y la auditoría de diseño del entreno.

### D. El pino, práctica corta aparte (cambio 3)

- Si el pino es objetivo:
  - no cuenta en el límite de 2 habilidades (`sessionGoals` y `buildWeek`);
  - va el primero en **todos** los días de entreno, como «Práctica de pino, 5–10 min», con el paso actual de su ruta y sus complementarios de A.
- En los días de descanso, Hoy ofrece «Solo pino (10 min)»: un entreno solo con el pino, sin calentamiento general.
- Mantener la progresión por pasos que ya tiene. Medir el tiempo acumulado es opcional y para más adelante.

### E. Frenar la subida en brazos rectos y back lever (cambios 5 y 9)

- En `applyProgress` (logic.js): en las rutas `straightArm`, un **Fácil en la meta cuenta como sesión superada**, no como subida inmediata, y se necesitan `passesRequired` (2 por defecto).
- Difícil sigue consolidando.
- Las rutas de fuerza y las demás habilidades no cambian.
- Ajustar la prueba «Fácil con la meta cumplida pasa al siguiente ejercicio» (`progression.spec.js`). Usa una ruta de fuerza, así que debería seguir pasando; añadir otra para los brazos rectos.

### F. Calentamiento según las habilidades del día (cambio 7)

- Al crear el entreno, añadir a `active.warmupExtra` según las habilidades:
  - planche, pino o flexión de pino: «Flexiones de muñeca sobre la palma y el dorso, 2×10»;
  - pino o flexión de pino: «Encogimientos en pino contra la pared, 2×8»;
  - back lever: «German hang suave con los pies apoyados, 2×15 s».
- Sin la frase «previene lesiones»: presentarlo como preparación (ver la encuesta Martonovich 2025 en el informe).

### G. Sustituir en vez de sumar (cambio 8)

- Al crear el entreno (o en `defaultIds` / `buildWeek`):
  - **muscle-up** hoy → quitar las `dominadas` de ese día, porque el muscle-up ocupa su lugar;
  - **flexión de pino** hoy → `fondos` o `flexiones` con una serie menos (mínimo 2);
  - **front lever** hoy en el paso `straddle` (3) o más → quitar el `remo` de ese día si su complementario ya es el remo en tuck front lever.
- Las demás rutas siguen apareciendo los otros días. Comprobar que en un plan de 3 días ninguna ruta básica se queda sin días.

### H. Frecuencia de la flexión de pino y el muscle-up (cambio 11)

- En `buildWeek`, nunca en días seguidos, como los brazos rectos, pero sin el tope de 3 días: ampliar la condición de `lastDay` a `['hspu', 'muscleup']`.

### I. No juntar back lever y planche (cambio 12)

- En `buildWeek` y en `sessionGoals`: si el día ya tiene la planche, saltar el back lever, y al revés. Preferir front lever + planche o front lever + back lever.

### J. Extras opcionales (de la conclusión del informe)

- Mostrar en la ficha de cada habilidad los plazos normales, por ejemplo front lever: tuck 1–3 meses, tuck avanzado 3–6 meses, completo 1–3 años. Así subir despacio no parece un fallo.
- Usar el historial de estancamientos para comparar antes y después de los cambios.

## Pruebas que añadir (skill `pruebas-e2e`)

- Complementarios:
  - aparecen después de la habilidad y antes de los básicos;
  - no piden valoración y no cambian el progreso de la ruta a la que pertenece su paso;
  - se ven en el resumen y el historial.
- Alternancia: tras una serie de la habilidad 1 pasa a la 2, y el descanso es de 80 s.
- Pino:
  - va el primero todos los días de entreno y no quita el hueco a otra habilidad;
  - en un día de descanso, «Solo pino».
- Brazos rectos: Fácil en la meta necesita 2 sesiones; en fuerza sigue subiendo con una.
- Calentamiento con extras según las habilidades, también tras recargar.
- Sustitución: con el muscle-up no hay dominadas ese día; con la flexión de pino, fondos con una serie menos.
- `buildWeek`:
  - flexión de pino y muscle-up nunca en días seguidos;
  - back lever y planche nunca el mismo día.
- Escenarios de diseño nuevos en `tests/tools/escenarios-diseno.js`: tarjeta de complementario, alternancia, práctica de pino y calentamiento con extras. Después, la auditoría a 320–430 px.

## Al publicar

- Versión siguiente (`cf-v16`) en `sw.js` y `js/version.js`.
- Actualizar:
  - `reglas-entrenamiento.md` (reglas nuevas);
  - el README;
  - la tabla de pruebas de la skill `pruebas-e2e`;
  - `historial-usuario.md` (petición 23: hecho);
  - este archivo, marcándolo como hecho o borrándolo.
