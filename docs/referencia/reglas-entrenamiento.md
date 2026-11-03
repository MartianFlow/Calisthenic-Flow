# Reglas de entrenamiento

Cómo decide la app objetivos, subidas, descansos y el plan semanal. Las fuentes y el razonamiento están en `docs/investigacion-principios.md`, `docs/investigacion-progresiones.md` y `docs/investigacion-pierna-gym.md`. Los puntos sin fuente están marcados como `[criterio propio]`.

## Calistenia: progresión doble

- **Meta del paso:** casi siempre 3×8 en fuerza, y de 3×8 a 15 s en las isometrías de habilidad.
- **Objetivo de trabajo inicial:** el 60 % de la meta, o el mínimo de la última vez si ya hay registros.
- **Valoración = repeticiones en reserva (RIR):** Fácil = 3 o más, Normal = 1–2, Difícil = 0 o técnica rota.
- **Por debajo de la meta:**
  - **Fácil:** +2 reps; en holds, +18 % (mínimo 3 s).
  - **Normal:** +1 rep; en holds, +10 % (mínimo 2 s).
  - **Brazos rectos** (`straightArm`: front lever, planche, back lever): solo +2 s con Fácil y +1 s con Normal.
  - **Difícil cumpliendo el objetivo:** se mantiene.
  - **Difícil sin llegar:** el objetivo pasa al **mínimo conseguido**.
- **En la meta:**
  - **Fácil:** pasa al siguiente paso.
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

## Habilidades y nivel

- **Habilidades por sesión:** máximo 2; con 3 objetivos se van rotando.
- **Brazos rectos:** como mucho 3 días por semana y nunca en días seguidos.
- **Nivel** (`trainingLevel`, schedule.js): la media de la fracción recorrida en cada ruta que se entrena. No exige un mínimo de entrenos.
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
  - **S:** habilidades y core; solo con 5 o más días y con objetivos.
- **Plantilla de 3 días:** A-B-A en las semanas ISO pares y B-A-B en las impares. Por eso el 2/11/2026 (lunes, semana 45) toca B.
- **Elección de días:** `pickDays` busca la máxima separación entre los días disponibles.

## Cambios en la semana y otra rutina

- **Mover un entreno de día** (Plan semanal → «Mover» → «Aquí» o «Cambiar aquí»): intercambia lo que hay en los dos días, solo esta semana.
  - Se guarda en `state.weekMoves = { start, sig, from[7] }`: en cada día va el entreno que el plan ponía en el día `from[i]` (-1 = descanso).
  - Lo aplica `buildWeek`, así que Hoy, la semana de Hoy y el Plan lo ven igual.
  - Caduca solo: vale para la semana de `start` y mientras el plan no cambie (`sig`, los tipos de la semana sin mover). Si cambian los días, la pierna o los objetivos, se ignora.
  - Destinos: de hoy en adelante y sin entreno hecho. Origen: cualquier día con entreno sin hacer (también uno pasado que se saltó).
  - `weekWarning` avisa si quedan seguidos dos días de pierna o la misma habilidad de brazos rectos.
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
