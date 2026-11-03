# Reglas de entrenamiento

Cómo decide la app objetivos, subidas, descansos y el plan semanal. Las fuentes y el razonamiento están en `docs/investigacion-principios.md`, `docs/investigacion-progresiones.md`, `docs/investigacion-pierna-gym.md` y, para las habilidades, `docs/investigacion-habilidades.md`. Los puntos sin fuente están marcados como `[criterio propio]`.

## Calistenia: progresión doble

- **Meta del paso:** casi siempre 3×8 en fuerza. En las isometrías de habilidad, de 3×8 a 20 s; los aguantes de brazos rectos de 12 s o menos llevan 4–6 series para sumar unos 40–60 s (por ejemplo, front lever straddle 5×8 s y completo 6×5 s).
- **Objetivo de trabajo inicial:** el 60 % de la meta, o el mínimo de la última vez si ya hay registros.
- **Valoración = repeticiones en reserva (RIR):** Fácil = 3 o más, Normal = 1–2, Difícil = 0 o técnica rota.
- **Por debajo de la meta:**
  - **Fácil:** +2 reps; en holds, +18 % (mínimo 3 s).
  - **Normal:** +1 rep; en holds, +10 % (mínimo 2 s).
  - **Brazos rectos** (`straightArm`: front lever, planche, back lever): solo +2 s con Fácil y +1 s con Normal.
  - **Difícil cumpliendo el objetivo:** se mantiene.
  - **Difícil sin llegar:** el objetivo pasa al **mínimo conseguido**.
- **En la meta:**
  - **Fácil:** pasa al siguiente paso. En **brazos rectos**, cuenta como sesión superada, igual que Normal: los tendones se adaptan en meses, no en semanas.
  - **Normal:** cuenta como sesión superada. Hace falta 1 en las rutas de **fuerza** y `passesToLevelUp` (2 por defecto) en las **habilidades**.
  - **Difícil:** consolida en el mismo paso.
- **Estancamiento:** 3 exposiciones sin subir reinician el objetivo al 80 %. Tras 2 reinicios se sugiere bajar un paso.

## Descanso entre series

- **Ajuste `settings.restMode`:**
  - `fixed` (por defecto): el mismo descanso en todo, `settings.restSec` (80 s por defecto, de 15 s a 10 min en pasos de 5 s). Lo pidió el usuario: suele descansar 80 s.
  - `auto` («Según ejercicio»): el recomendado de cada paso, en la tabla de abajo; en el gimnasio, `lift.rest`.
- `restSeconds(state, recomendado)` (logic.js) da el que se usa. Se aplica al empezar cada descanso, así que un cambio en Ajustes vale también para el entreno en curso.
- **Durante el descanso:** −15 / +15 s. Si se quita más de lo que queda, termina con su aviso.

## Cuenta atrás de las isometrías

- `settings.holdPrep`: 5 s por defecto (3, 5, 10 o 15 en Ajustes y en la bienvenida; se admite de 3 a 30). Lo pidió el usuario: con 3 s no le daba tiempo a colocarse.
- Mientras cuenta, «+5 s» la alarga. Suenan pitidos cortos en los 3 últimos segundos y uno más agudo al empezar.

## Descansos por paso (`restFor`, con «Según ejercicio»)

| Caso | Descanso |
|---|---|
| 1 a 5 reps | 180 s |
| 6 a 12 reps: dominadas, fondos, muscle-up y HSPU | 120 s |
| 6 a 12 reps: el resto | 90 s |
| Más de 12 reps | 75 s |
| Holds de brazos rectos | 150 s |
| Straddle y completos de brazos rectos (`step.rest`) | 180 s |
| Otros holds | 75 s |
| Core | 60 s |
| Pino libre | 45 s |

## Descarga

- **Cuándo se sugiere:**
  - cada 5 semanas o más, con al menos 8 sesiones;
  - o cuando hay 2 o más rutas o ejercicios con `stall ≥ 2`.
- **Qué hace:** 7 días con una serie menos, objetivos al 65 % y sin cambios de progreso.
- **En el gimnasio:** una serie menos, −10 % de peso y el mínimo del rango.

## Habilidades: foco y mantenimiento

- **Foco** (`settings.focus`, una): la que se aprende.
  - Va al principio en todos los días de torso, con todo el volumen del paso y sus complementarios.
  - Brazos rectos, flexión de pino y muscle-up: como mucho 3 días y nunca seguidos. El L-sit, todos los días de torso.
- **Mantener** (`settings.maintain`, hasta 2, o ninguna):
  - cada una 1–2 días por semana, nunca seguidos;
  - una por sesión, preferiblemente en los días sin foco;
  - como mucho 3 series del paso actual (`plannedSets`) y sin complementarios;
  - siguen progresando con la misma lógica.
  - Base: dosis mínima de fuerza (Spiering 2021, Bickel 2011); 1–2 días es `[criterio propio]` para conservar la técnica.
- **El pino** no cuenta en el límite de 2 habilidades por sesión.
  - Si es el foco, es una práctica corta (5–10 min) al principio de **todos** los días de entreno, también los de pierna.
  - En los días de descanso, «Solo pino» (`dayType: 'pino'`): con un calentamiento corto de muñecas y hombros, y no cuenta como entreno de la semana.
- **Brazos rectos, entre todas:** como mucho 2 por sesión, 3 días por semana y nunca en días seguidos.
- **Back lever y planche** nunca en la misma sesión. Si una de mantener no cabe por eso, ocupa el sitio del foco el último día en que aparece, si así le quedan al menos 2.
- **Sin plan semanal** (`sessionGoals`): pino de foco en todas, el foco en las de torso y una de mantener por turnos (cada una, una sesión de cada dos más o menos).
- **Sin ninguna habilidad dominada:**
  - «Recomendada para empezar» (`recommendedSkills`): las que ya cumplen sus prerrequisitos, de más fácil a más difícil (pino, L-sit, front lever, back lever, muscle-up, flexión de pino, planche), o las 2 más cercanas.
  - Si al foco le faltan prerrequisitos, Hoy dice qué básicos le acercan, y esos van primero en el día (`prioritizeBase`, salvo el core).
- **Al completar la ruta del foco:** Hoy y el resumen proponen pasarla a mantener (eligiendo cuál deja si ya hay 2) y elegir otra. También desde la ficha de la ruta: «¿Ya la dominas?».
- **Versiones anteriores:** los 3 «objetivos» de antes se convierten en el primero de foco y los otros dos de mantener, con un aviso en Hoy.

## Cómo se entrena la habilidad de foco

- **Complementarios** (`accessories` en cada ruta; `accessoriesFor` y `sessionLayout` en logic.js):
  - series y repeticiones fijas, sin valorar ni progreso. Se guardan en el historial con sus series, que cuentan para la EXP;
  - en los dos primeros pasos de la habilidad, como mucho uno; después, dos;
  - orden: práctica de pino y sus complementarios → preparación (`prep`) justo antes de su habilidad → habilidades → sus complementarios → básicos;
  - por habilidad: front lever, remo en tuck front lever y retracciones escapulares (o jalón con banda); back lever, german hang y skin the cat como preparación; planche, planche lean y flexiones pseudo planche; L-sit, elevaciones de piernas sentado; muscle-up, transiciones, dominadas explosivas o fondos en barra recta; pino, despegues y salida en rueda desde el paso 4; flexión de pino, encogimientos en pino;
  - no se repite un complementario que ya es el paso actual de una ruta de hoy;
  - con el L-sit entre tus habilidades, en un día con core y sin L-sit: 2×8 de elevaciones de piernas sentado después del core.
- **Alternancia:** con dos habilidades en el entreno (sin contar el pino), tras una serie de una se pasa a la otra si le quedan series. El descanso sigue siendo el fijo (80 s); cada habilidad descansa así 80 s + la serie de la otra + 80 s.
- **Calentamiento extra** (`SKILL_WARMUP`, guardado en `active.warmupExtra`), antes de las series de aproximación:
  - planche, pino o flexión de pino: flexiones de muñeca sobre la palma y el dorso, 2×10;
  - pino o flexión de pino: encogimientos en pino, 2×8;
  - back lever: german hang suave, 2×15 s.
  - Se presenta como preparación, no como prevención de lesiones.
- **Sustituir en vez de sumar** (`trimmedRoutes` y `buildWeek`):
  - con muscle-up, las dominadas de ese día salen del plan si otro día de la semana las tiene sin muscle-up; si no, llevan una serie menos;
  - con flexión de pino, los fondos (o las flexiones) llevan una serie menos (mínimo 2);
  - con el front lever en straddle o más y remo ese día, el complementario es el jalón con banda en vez del remo en tuck;
  - con una serie menos, cumplir la meta no sube de paso (`trimmed`): se sube cumpliéndola con todas.

## Nivel

- `trainingLevel` (schedule.js): la media de la fracción recorrida en cada ruta que se entrena. No exige un mínimo de entrenos.
  - Cuentan los 7 básicos. Con la pierna en el gimnasio, `piernas` y `bisagra` no cuentan.
  - Cuentan las habilidades que son objetivo o en las que hay progreso. Su escala va de la base de sus prerrequisitos al 100 %: `base + frac·(1−base)`.
  - Cortes `[criterio propio]`: menos del 30 % es principiante, menos del 60 % intermedio y el resto avanzado.

## Plan semanal

- **Días recomendados:**
  - principiante: 3;
  - intermedio: 3, o 4 si tiene objetivos;
  - avanzado: 4 o 5;
  - con la pierna en el gimnasio: 4, o 5 si es avanzado.
- **Tipos de día en calistenia:**
  - **A:** dominadas, fondos, piernas y core.
  - **B:** remo, flexiones, bisagra y core.
  - **S:** habilidades y core; solo con 5 o más días y con alguna habilidad elegida.
- **Plantilla de 3 días:** A-B-A en las semanas ISO pares y B-A-B en las impares. Por eso el 2/11/2026 (lunes, semana 45) toca B.
- **Elección de días:** `pickDays` busca la máxima separación entre los días disponibles.

## Cambios en la semana y otra rutina

- **Mover un entreno de día** (Plan semanal → «Mover» → «Aquí» o «Cambiar aquí»): intercambia lo que hay en los dos días, solo esta semana.
  - Se guarda en `state.weekMoves = { start, sig, from[7] }`: en cada día va el entreno que el plan ponía en el día `from[i]` (-1 = descanso).
  - Lo aplica `buildWeek`, así que Hoy, la semana de Hoy y el Plan lo ven igual.
  - Caduca solo: vale para la semana de `start` y mientras el plan no cambie (`sig`, los tipos de la semana sin mover). Si cambian los días, la pierna o los objetivos, se ignora.
  - Destinos: de hoy en adelante y sin entreno hecho. Origen: cualquier día con entreno sin hacer (también uno pasado que se saltó).
  - `weekWarning` avisa si quedan seguidos dos días de pierna, dos con brazos rectos o dos con la misma flexión de pino o muscle-up.
- **Otra rutina hoy:** «Entrenar hoy» en un día del Plan, o las rutinas de Hoy (en un día de descanso y al editar). Guarda `state.plan = { dayType, ids, picked: true }`; Hoy lo muestra como «Elegido para hoy». No mueve nada de la semana.

## Pierna en el gimnasio (`settings.legs = 'gym'`)

- **Días y tipos** (`gymDays`): prueba todas las combinaciones de días y tipos.
  - Nunca pierna en días seguidos, con la mayor separación posible (tope de 4 días).
  - Nunca torso en días seguidos; a igualdad, gana la que tenga menos días seguidos.
  - 1 día de pierna con 2–3 días de entreno, y 2 con 4 o más.
  - El torso alterna TA y TB, y empieza por TB en las semanas impares.
  - Con L–V queda TB-P-TA-P-TB. Con L–S, torso el lunes, el miércoles y el sábado, y pierna el martes y el viernes.
- **Torso A/B:** dominadas, fondos, remo, flexiones y core, con el orden de las parejas cambiado. Las habilidades solo van en los días de torso.
- **Pierna (`P`):** la rutina completa del usuario, 3 series por ejercicio y siempre en el mismo orden, para que el peso sea comparable entre sesiones.
  - Orden: hack (6–10), piernas rígidas (6–10), goblet (10–15), extensión, curl, aductor, abductor, gemelo de pie y gemelo sentado.
  - `LEG_DAYS.P.sets` permitiría cambiar las series solo en ese día.
  - `PA`/`PB` solo quedan en `DAY_INFO` como nombres para el historial antiguo.
- **Progresión doble con carga** (`applyLiftProgress`):
  - **Tope del rango con Fácil o Normal:** +`inc` kg y vuelta al mínimo.
  - **Tope del rango con Difícil:** consolida, salvo en las máquinas `failureOk`, que suben igual.
  - **Por debajo del tope:** +2 reps con Fácil y +1 con Normal.
  - **Difícil sin llegar al mínimo del rango:** −10 % (`lighterLoad`).
  - **3 sesiones sin avanzar:** −10 % y vuelta al mínimo.
  - El peso que cuenta es el de la serie más ligera.
- **Calentamiento:** `LEG_WARMUP` cuando todos los ejercicios son de gimnasio.
- **Pesos:** se apuntan en el Plan semanal, en la ficha del ejercicio o durante el entreno.

## Otros

- **Calentamiento de calistenia:** 9 elementos, entre ellos preparación de muñecas, flexiones escapulares, soporte y series de aproximación.
- **Rutas de fuerza:** dominadas, remo, flexiones, fondos (sin fondos en banco), piernas, bisagra (isquios, hasta el curl nórdico) y core.
- **Rutas de habilidad:** muscleup, pino, hspu, lsit, frontlever, planche y backlever.
  - Tienen `prereq` con índices de paso.
  - `p.step >= req.step` significa «has llegado a ese paso».
