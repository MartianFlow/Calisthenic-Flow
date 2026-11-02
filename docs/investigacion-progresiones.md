# Auditoría de progresiones — Calisthenic Flow (`js/data/roadmaps.js`)

Fecha: 2026-11-02. Documento de trabajo. Propone cambios y **no modifica el archivo**.

## 0. Cómo se hizo y límites

- Leí de principio a fin una copia del **r/bodyweightfitness Recommended Routine (RR)** alojada en una gist de GitHub y un resumen de terceros, también en gist, con las escaleras de cada progresión. Reddit está bloqueado en esta sesión.
- El resto viene de **resúmenes de resultados de WebSearch**: espejos de la wiki de r/bodyweightfitness, GMB, Antranik, Hybrid Calisthenics, Wikipedia, fragmentos de las tablas de *Overcoming Gravity 2ª ed.* (OG) y guías de coaching. No pude abrir esas páginas: WebFetch y la shell solo llegan a dominios permitidos. Además, la búsqueda se cortó porque se agotó el **presupuesto de búsquedas del turno**, así que no se buscaron estos temas:
  - el estudio de descansos de Schoenfeld,
  - la profundidad del fondo según la wiki del RR,
  - las correcciones de equilibrio del pino,
  - el agarre en el back lever.
- Cuando una recomendación sale de **consenso de coaching o de mi criterio y no de una fuente verificada aquí**, la marco con **[criterio propio]**.
- No he podido confirmar los niveles exactos de las tablas de OG. Solo cito el **orden** de los elementos, no números de nivel, salvo un fragmento concreto.

## 1. Criterios generales que propongo para toda la app

### 1.1 Objetivos (series × reps/segundos)
La app ya usa **progresión doble**: empieza en un ~60 % de la meta y sube hasta ella (`defaultWork = round(target*0.6)`). Encaja directamente con el RR:

- **Pasos de fuerza por repeticiones: 3×8.** El RR dice: *"Perform the hardest exercise in each progression that you can do for 3 sets of 5 to 8 repetitions… When you hit 3 sets of 8 reps with good form, move to the next exercise… and start the next workout with 3 sets of 5 reps again."* Con meta 8, la app arranca en 5, que es justo el esquema del RR.
- **Isometrías de fuerza y soporte: 3×30 s.** El RR dice: *"one set here consists of simply holding the position statically for 10-30 seconds. Move on to the next harder progression once you hit 30 seconds for all 3 sets."*
- **Unilaterales difíciles** (arquero, camarón, pistol, a una mano): **3×5–6 por lado**. Pasos finales de élite: 3×1–3.
- **Isometrías de skill** (levers, planche): **3×8–15 s por etapa** y 3×10 s en la etapa final. Las guías consultadas sitúan el paso de tuck a tuck avanzado en ~15–20 s en varias series, y el tuck avanzado en ~10 s con espalda plana. El "60 s totales / 30 s" del RR se considera excesivo para los elementos de élite. Ver Front lever.
- **Core:** el RR usa **3×8–12** con 60 s de descanso en el *core triplet*. Meta 10–12 para pasos fáciles y 5–8 para los duros.
- **Pasos "de volumen"** que sirven de prerrequisito (dominadas 3×10, fondos 3×12) se mantienen: son los umbrales que piden las guías de muscle-up.

### 1.2 Descansos
- La app **no hace superseries**: `rest` es el descanso entre series del mismo ejercicio. En el RR las parejas tienen 90 s entre ejercicios, *"so that there is minimum 3 minutes rest between each set… This rest time is where there is 99% replenishment of ATP"*, y además *"If 90 seconds is not enough, you can rest up to 3 minutes"*.
- Propuesta:
  - **150 s** para las rutas de fuerza de tren superior (dominadas, fondos).
  - **120 s** para remo y flexiones, que se trabajan algo menos al fallo.
  - **90 s** para piernas, porque con `side: true` la otra pierna ya descansa mientras trabajas.
  - **60 s** para core (RR).
  - **150–180 s** para skills de fuerza (levers, planche, HSPU, muscle-up).
  - **90 s** para el pino (equilibrio).
- **Sugerencia de esquema** [criterio propio]: añadir un campo opcional `rest` por paso, porque descansar igual en "flexión en pared" que en "flexión a una mano" no tiene sentido. Mientras no exista, uso el valor por ruta indicado arriba.

### 1.3 Prerrequisitos: semántica actual (¡importante!)
En `logic.js`, `prereqStatus` evalúa `ok: p.step >= req.step`. Es decir, `{id, step: N}` se cumple cuando el usuario **ha llegado** al paso de índice N (0-based), o sea, cuando **ha superado los pasos 0…N-1**.

Por eso los prerrequisitos actuales son más flojos de lo que parecen. Ejemplo: muscle-up pide `dominadas step 5`, que solo exige haber superado "Dominadas 3×5", y `fondos step 5`, que solo exige "Fondos 3×6". En las propuestas de abajo escribo "**superar X**" y doy el índice que hay que poner en el código según la **nueva** lista de pasos.

### 1.4 Aviso de migración [criterio propio]
El progreso se guarda **por índice de paso** (`progress[id].step`). Si se insertan o borran pasos, los usuarios existentes quedarán en otro ejercicio. Propongo dar a cada paso un `key` estable, o escribir una migración que mapee índice antiguo → índice nuevo, ya sea por nombre o con una tabla. Para cada ruta indico en "Cambios" qué pasos desaparecen o se insertan.

---

## 2. FUERZA

### 2.1 Dominadas (`dominadas`)
**Problemas actuales**
- "Dominadas" 3×5 → "Dominadas (volumen)" 3×10 es un salto grande. Con progresión doble basta con un paso de 3×8 (RR) y otro de volumen de 3×10.
- "Dominadas en L" no lleva hacia la dominada a una mano. El RR solo la lista como *alternativa* tras 3×8, junto a las typewriter y las lastradas.
- Entre las arqueras y las negativas a una mano falta la **dominada asistida a una mano** (toalla o banda).

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Colgado activo | hold | 3×30 s | – |
| 1 | Retracciones escapulares | reps | 3×8 | – |
| 2 | Isometría arriba | hold | 3×20 s | – |
| 3 | Negativas de dominada | reps | 3×5 (5 s cada una) | – |
| 4 | Dominadas | reps | 3×8 | – |
| 5 | Dominadas (volumen) | reps | 3×10 | – |
| 6 | Dominadas arqueras (o typewriter) | reps | 3×5 | sí |
| 7 | Dominada asistida a una mano (toalla o banda) | reps | 3×3 | sí |
| 8 | Negativas a una mano | reps | 3×3 (≥5 s) | sí |
| 9 | Dominada a una mano | reps | 3×1 | sí |

Claves:
- 0 · Agarre prono a la anchura de los hombros, brazos rectos. · Hombros algo activos: no cuelgues "de las orejas". · Cuerpo quieto y piernas juntas; respira con calma.
- 1 · Codos rectos: el movimiento sale de las escápulas. · Baja los hombros y saca un poco el pecho; pausa 1–2 s arriba. · Cuando sea fácil, haz la pausa en colgado arqueado (pecho hacia la barra, codos rectos).
- 2 · Sube con un salto o un banco. · Barbilla por encima de la barra, codos pegados y hombros abajo. · Si tiemblas, baja despacio en vez de soltarte.
- 3 · Empieza arriba con un salto o un banco. · Baja en ~5 s hasta tener los brazos totalmente estirados. · Si tienes una banda elástica, las dominadas asistidas con banda son una alternativa válida.
- 4 · Parte de colgado con brazos estirados y escápulas activas. · Cuerpo ligeramente hueco, piernas rectas y juntas; nada de balanceo. · Barbilla por encima de la barra en cada repetición.
- 5 · Misma técnica estricta. · Si fallas, termina la serie con negativas lentas. · Alternativa del RR: dominadas lastradas (mochila) a 3×5–8.
- 6 · Agarre ancho; sube hacia una mano. · El brazo de apoyo se queda casi recto y solo ayuda. · Baja controlando. (Typewriter: desplázate de lado a lado arriba.)
- 7 · Una mano en la barra y la otra en una toalla o banda colgada de ella. · Cuanto más abajo agarres la toalla, menos ayuda. · Cuerpo compacto para no girar.
- 8 · Sube con las dos manos y suelta una arriba. · Baja lo más lento posible (≥5 s). · Agarre supino (palma hacia ti) suele ser más fácil.
- 9 · Agarre fuerte, piernas juntas y glúteos apretados. · Calidad > cantidad: descansa 3 min o más entre intentos. · Codos y bíceps bien calentados; no más de 2 días por semana [criterio propio].

**Prerrequisitos:** ninguno.

**Justificación**
- El RR propone *scapular pulls → arch hangs → negative pull-ups → pull-ups → weighted pull-ups* ([gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb)).
- La wiki da como cues cuerpo "ligeramente hueco", codos rectos en los scapular pulls y ayuda con bandas o pies. Tras 3×8 permite caminos alternativos (L-sit pull-ups, typewriter) ([espejo wiki pull-up](https://axebps-redlib.hf.space/r/bodyweightfitness/wiki/exercises/pullup)).
- Hacia la dominada a una mano las guías coinciden en arqueras → asistida con toalla o banda → negativas a una mano → OAP. Recomiendan el lastre (~40–50 % del peso corporal a 3–5 reps) como apoyo, no como requisito ([FitnessVolt OAP](https://fitnessvolt.com/calisthenics/one-arm-pull-up/), [BullBarFit](https://bullbarfit.com/blogs/q-as/how-do-i-progress-to-one-arm-pull-ups-safely), [CalisthenicsWorld archer](https://calisthenicsworld.org/how-to-do-archer-pull-ups/)).
- Un fragmento de las tablas de OG sitúa las *archer pull-ups* bastante por debajo de las variantes de *one-arm chin* (excéntrica de OAC, OAC, OAC lastrada) ([tablas OG, copia](https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf)).

**Cambios:**
- "Dominadas 3×5" pasa a **3×8**.
- Se **elimina** "Dominadas en L".
- Se **inserta** "Dominada asistida a una mano".
- "Retracciones" pasa a 3×8.

---

### 2.2 Remo invertido (`remo`)
**Problemas actuales:** el orden es correcto y coincide con el RR (vertical → inclinado → horizontal → ancho → arquero → remo en tuck front lever). Solo hay que unificar los objetivos con el RR. "Remo a una mano" 3×3 es poco para reps de tirón horizontal.

**Propuesta** (descanso **120 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Remo inclinado (cuerpo casi vertical) | reps | 3×8 | – |
| 1 | Remo australiano rodillas dobladas | reps | 3×8 | – |
| 2 | Remo australiano | reps | 3×8 | – |
| 3 | Remo australiano pies elevados (o agarre ancho) | reps | 3×8 | – |
| 4 | Remo arquero | reps | 3×6 | sí |
| 5 | Remo en tuck front lever | reps | 3×6 | – |
| 6 | Remo a una mano | reps | 3×5 | sí |

Claves:
- 0 · Barra a la altura del pecho y cuerpo casi vertical. · Lleva el pecho a la barra juntando las escápulas. · Cuanto más horizontal, más difícil.
- 1 · Pies apoyados, rodillas a 90° y cadera alta. · Cuerpo recto de hombros a rodillas. · Toca la barra con el pecho.
- 2 · Piernas estiradas y talones apoyados. · Glúteos y abdomen apretados: cuerpo como una tabla. · Codos a unos 45° del cuerpo.
- 3 · Pies sobre un banco a la altura de la barra (o manos muy abiertas). · Pausa de 1 s con el pecho en la barra. · No dejes caer la cadera.
- 4 · Agarre ancho; tira hacia una mano. · El otro brazo se estira y solo ayuda. · Controla la bajada.
- 5 · Colgado en barra alta en tuck front lever, con la espalda horizontal. · Lleva la barra a la parte baja del pecho sin que la cadera caiga. · Brazos rectos abajo en cada repetición.
- 6 · Piernas abiertas para tener estabilidad. · Evita girar el torso hacia el brazo libre. · Si cuesta, empieza con el cuerpo más vertical.

**Prerrequisitos:** ninguno.

**Justificación**
- Escalera horizontal del RR: *vertical row, incline row, row, wide row, archer row* y después tuck front lever row ([gráfico BWF Progressions](https://studylib.net/doc/27324942/bwf-progressions-v2), [espejo wiki row](https://redlib.hackliberty.org/r/bodyweightfitness/wiki/exercises/row), [gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb)).
- Objetivos según la regla 3×5–8 del RR ([gist RR](https://gist.github.com/fi0/d13d851347c8e29e1a3e0ec7042fe149)).

**Cambios:** solo los objetivos. El orden y el número de pasos se mantienen, así que no hace falta migración.

---

### 2.3 Flexiones (`flexiones`)
**Problemas actuales**
- Las "Flexiones de rodillas" van **después** de las inclinadas, lo cual es redundante. El RR no las usa y prefiere bajar la inclinación, que mantiene la plancha.
- Falta la **flexión a una mano inclinada**, el paso clave antes de la flexión a una mano en suelo.
- Objetivos de 12–15 en pasos de fuerza, mientras el RR usa 3×8.

**Propuesta** (descanso **120 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Flexiones en pared | reps | 3×8 | – |
| 1 | Flexiones inclinadas | reps | 3×8 | – |
| 2 | Flexiones | reps | 3×8 | – |
| 3 | Flexiones diamante | reps | 3×8 | – |
| 4 | Flexiones con pies elevados | reps | 3×8 | – |
| 5 | Flexiones pseudo planche | reps | 3×8 | – |
| 6 | Flexiones arqueras | reps | 3×6 | sí |
| 7 | Flexión a una mano inclinada | reps | 3×5 | sí |
| 8 | Flexión a una mano | reps | 3×3 | sí |

Claves:
- 0 · Manos en la pared a la altura del pecho. · Cuerpo recto de cabeza a talones. · Pecho casi hasta la pared.
- 1 · Manos en un banco o mesa; baja la altura cuando llegues a la meta. · Codos a ~45°, no abiertos en cruz. · Si aún no puedes, apóyate de rodillas manteniendo la cadera alineada.
- 2 · Plancha sólida: glúteos y abdomen activos. · Pecho casi al suelo y brazos estirados arriba. · Cuello neutro.
- 3 · Manos juntas bajo el pecho. · Codos pegados al cuerpo. · No dejes caer la cadera.
- 4 · Pies en un banco o silla. · No hundas la zona lumbar. · Más carga en la parte alta del pecho y los hombros.
- 5 · Manos a la altura de la cintura, dedos hacia fuera o atrás. · Hombros por delante de las manos y espalda alta redondeada (escápulas separadas). · Glúteos apretados y la inclinación constante durante toda la serie.
- 6 · Manos muy abiertas; baja hacia un lado. · El brazo estirado solo ayuda. · Cadera y hombros paralelos al suelo.
- 7 · Una mano en un banco o barra; cuanto más bajo, más difícil. · Piernas abiertas y mano bajo el hombro. · No gires el torso.
- 8 · Piernas abiertas como base. · Mano bajo el hombro y el brazo libre a la espalda. · Controlar la rotación cuenta más que la fuerza del brazo.

**Prerrequisitos:** ninguno.

**Justificación**
- Escalera del RR: *Wall → Incline → Push-up → Diamond → Pseudo Planche Push-up*, a 3×5–8 ([gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb), [gist RR](https://gist.github.com/fi0/d13d851347c8e29e1a3e0ec7042fe149)).
- Hacia la flexión a una mano, las guías ponen la **inclinada** como punto de entrada, con la mano en alto y bajando la altura progresivamente. También destacan que el reto principal es controlar la rotación ([Hybrid Calisthenics one-arm](https://www.hybridcalisthenics.com/onearm-pushups), [FitnessVolt OAPU](https://fitnessvolt.com/one-arm-pushup-progression/)).
- Para la pseudo planche: retroceder acercando las manos a los hombros y progresar aumentando la inclinación ([Skool planche breakdown](https://www.skool.com/awesome-ninja-fitness/full-planche-training-breakdown)).

**Cambios:**
- Se **elimina** "Flexiones de rodillas"; queda como regresión en las claves del paso 1.
- Se **inserta** "Flexión a una mano inclinada".
- La pseudo planche pasa antes que las arqueras, para que el prerrequisito de planche quede limpio.
- Objetivos a 3×8.

---

### 2.4 Fondos (`fondos`)
**Problemas actuales**
- Los dos primeros pasos son **fondos en banco**. Varias fuentes los consideran de riesgo para el hombro (extensión más rotación interna con los hombros adelantados) y el RR **no** los usa: empieza con el soporte. Hay que eliminarlos.
- Falta un paso **asistido** (banda o pies) entre las negativas y el fondo completo.
- "Fondos lentos (tempo)" es un método, no un nivel. Lo paso a las claves.
- Faltan las variantes en **anillas** (el siguiente nivel del RR).

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Soporte en paralelas | hold | 3×30 s | – |
| 1 | Negativas de fondos | reps | 3×5 (4–5 s) | – |
| 2 | Fondos asistidos (banda o pies apoyados) | reps | 3×8 | – |
| 3 | Fondos en paralelas | reps | 3×8 | – |
| 4 | Fondos en paralelas (volumen) | reps | 3×12 | – |
| 5 | Fondos en barra recta | reps | 3×8 | – |
| 6 | Soporte en anillas | hold | 3×30 s | – |
| 7 | Fondos en anillas (sin anillas: fondos lastrados 3×6) | reps | 3×8 | – |

Claves:
- 0 · Brazos bloqueados y hombros abajo, lejos de las orejas. · Cuerpo ligeramente hueco y piernas juntas. · Sin dolor en el hombro.
- 1 · Empieza arriba en soporte. · Baja en 4–5 s hasta ~90° de codo, o un poco más si no molesta. · Sube con ayuda de los pies.
- 2 · Banda bajo las rodillas o los pies, o pies en un apoyo. · Rango completo y controlado. · Reduce la ayuda en cuanto llegues a la meta.
- 3 · Torso un poco inclinado hacia delante. · Baja hasta que el hombro quede a la altura del codo o un poco por debajo, siempre sin dolor. · Bloquea arriba en cada repetición.
- 4 · Misma técnica y sin balanceo de piernas. · Si te estancas, usa tempo 3-1-1 (3 s bajando, 1 s de pausa, 1 s subiendo). · Hombros abajo también en el punto bajo.
- 5 · Manos a la anchura de los hombros sobre una barra. · Piernas un poco adelantadas para contrapesar; la barra llega a la parte baja del pecho. · Es la fase final del muscle-up.
- 6 · Anillas pegadas al cuerpo y brazos bloqueados. · Gira un poco las anillas hacia fuera cuando te sientas estable. · Controla el temblor sin encoger los hombros.
- 7 · Anillas cerca del cuerpo en todo el recorrido. · Baja controlando y sin abrir los codos. · Si no tienes anillas: fondos con mochila, 3×6.

**Prerrequisitos:** ninguno.

**Justificación**
- Escalera del RR: *Parallel Bar Support Hold → Negative Dips → Parallel Bar Dips → Ring Dips*. El RR añade el *support hold* al calentamiento una vez llegas a las negativas ([gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb), [gist RR](https://gist.github.com/fi0/d13d851347c8e29e1a3e0ec7042fe149)).
- Criterios de preparación de una guía: soporte de 30 s, excéntricas y asistidos a 3×8 antes del fondo estricto ([Bible of Calisthenics dips](https://bibleofcalisthenics.substack.com/p/dips-progression-from-beginner-to)).
- Riesgo del fondo en banco y de la profundidad excesiva (cizalla en la cápsula anterior; limitar a ~90° si molesta): [Athlean-X bench dips](https://athleanx.com/articles/how-to-do-bench-dips), [Breaking Muscle](https://breakingmuscle.com/the-3-building-blocks-to-performing-a-proper-dip/), [GymnasticBodies, dips](https://gymnasticbodies.com/?p=12925).

**Cambios:**
- Se **eliminan** los fondos en banco (×2) y los "Fondos lentos".
- Se **insertan** "Asistidos", "Soporte en anillas" y "Fondos en anillas".
- Habría que actualizar `equipment` a "Paralelas (anillas opcionales)".

---

### 2.5 Piernas (`piernas`)
**Problemas actuales**
- No hay **trabajo de bisagra ni de isquios**. El RR tiene una progresión de bisagra propia (*Romanian deadlift → single-leg deadlift → banded Nordic curl → Nordic curl*). Propongo una ruta nueva (2.7).
- Falta la **sentadilla del camarón principiante**, el camino principal del RR. La versión avanzada aparece solo al final.
- 75 s de descanso es poco para pistol y camarón.

**Propuesta** (descanso **90 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Sentadilla asistida | reps | 3×8 | – |
| 1 | Sentadilla | reps | 3×8 | – |
| 2 | Sentadilla dividida / zancada atrás | reps | 3×8 | sí |
| 3 | Sentadilla búlgara | reps | 3×8 | sí |
| 4 | Sentadilla del camarón (principiante) | reps | 3×6 | sí |
| 5 | Pistol a banco | reps | 3×6 | sí |
| 6 | Pistol asistida (o con contrapeso) | reps | 3×6 | sí |
| 7 | Pistol squat | reps | 3×5 | sí |
| 8 | Sentadilla del camarón (avanzada) | reps | 3×5 | sí |

Claves:
- 0 · Agárrate a un marco de puerta o una mesa. · Cadera atrás y pecho alto. · Rodillas en la dirección de las puntas de los pies.
- 1 · Pies a la anchura de los hombros. · Baja hasta que la cadera pase la rodilla. · Talones siempre apoyados.
- 2 · Paso largo y torso erguido. · La rodilla trasera casi roza el suelo. · Empuja con toda la planta de la pierna delantera.
- 3 · Pie trasero sobre un banco. · Baja en vertical con la rodilla delantera estable. · Rango completo en cada repetición.
- 4 · Pierna libre doblada detrás, sin agarrarla. · Baja hasta que rodilla y pie traseros toquen el suelo a la vez. · Brazos al frente y torso inclinado para equilibrar.
- 5 · Siéntate en un banco con una sola pierna, controlando la bajada. · Levántate sin impulso. · Baja la altura del banco cuando llegues a la meta.
- 6 · Agárrate a un poste, o sujeta un peso ligero al frente como contrapeso. · Pierna libre estirada al frente. · Si se te levanta el talón, eleva un poco el talón (disco o calzado) y trabaja la movilidad de tobillo.
- 7 · Brazos al frente como contrapeso. · Baja hasta el fondo con el talón apoyado. · Sube sin rebotar.
- 8 · Sujeta el pie de la pierna libre por detrás. · Solo la rodilla toca el suelo. · Baja controlando y sin dejarte caer.

**Prerrequisitos:** ninguno.

**Justificación**
- Escalera del RR: *Assisted Squat → Squat → Split Squat → Bulgarian Split Squat → Beginner / Intermediate / Advanced Shrimp Squat*. En el camarón principiante tocan rodilla y pie; en el intermedio y el avanzado solo la rodilla, y en el avanzado se sujeta el pie ([gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb), [espejo wiki squat](https://asdjflk.github.io/r/bodyweightfitness/wiki/exercises/squat), [espejo 2](https://r.datuan.dev/r/bodyweightfitness/wiki/exercises/squat)).
- El camarón exige menos equilibrio que el pistol ([GMB shrimp vs pistol](https://gmb.io/shrimp-squats-vs-pistol-squats/)).
- Pistol: banco cada vez más bajo, contrapeso de 5–10 kg, talón elevado para limitar la dorsiflexión y test de tobillo en pared ([Antranik pistol](https://antranik.org/beginners-guide-to-pistol-squats/), [Breaking Muscle pistol](https://breakingmuscle.com/whats-preventing-you-from-doing-pistol-squats-how-to-progress-pistols/), [Squat University](https://squatuniversity.com/2016/06/24/6-steps-to-perfecting-your-pistol-squat/amp/)).

**Cambios:**
- Se **inserta** "Camarón principiante".
- "Zancadas atrás" pasa a "dividida / zancada atrás".
- Objetivos ajustados al RR (3×8, y 3×5–6 en unilaterales duros).
- Descanso de 75 a 90 s.

---

### 2.6 Core (`core`)
**Problemas actuales**
- No hay **anti-extensión dinámica** (rueda abdominal o rollouts), que es el núcleo del *core triplet* del RR.
- El dragon flag no tiene paso en **tuck**.
- La plancha de 45 s se puede bajar a 30 s y pasar antes a ejercicios más difíciles (regla del RR).

**Propuesta** (descanso **60 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Dead bug | reps | 3×10 | sí |
| 1 | Plancha frontal | hold | 3×30 s | – |
| 2 | Hollow body encogido | hold | 3×30 s | – |
| 3 | Hollow body hold | hold | 3×30 s | – |
| 4 | Elevaciones de rodillas colgado | reps | 3×12 | – |
| 5 | Rueda abdominal / rollouts de rodillas | reps | 3×10 | – |
| 6 | Elevaciones de piernas colgado | reps | 3×10 | – |
| 7 | Toes to bar | reps | 3×8 | – |
| 8 | Negativas de dragon flag (tuck → piernas rectas) | reps | 3×5 | – |
| 9 | Dragon flag | reps | 3×5 | – |

Claves:
- 0 · Boca arriba con la lumbar pegada al suelo. · Estira el brazo y la pierna contrarios sin despegar la espalda. · Lento y controlado.
- 1 · Antebrazos bajo los hombros. · Glúteos apretados y pelvis en retroversión. · Si 30 s es fácil, pasa al siguiente paso: no alargues la plancha.
- 2 · Lumbar pegada al suelo. · Rodillas al pecho y hombros despegados. · Brazos estirados hacia los pies.
- 3 · Piernas estiradas y juntas, a pocos centímetros del suelo. · Brazos por encima de la cabeza. · Si se despega la lumbar, sube las piernas.
- 4 · Colgado con las escápulas activas. · Rodillas al pecho sin balancearte. · Baja despacio.
- 5 · De rodillas, rueda o anillas delante. · Avanza solo hasta donde puedas sin arquear la lumbar. · Vuelve tirando desde el abdomen, con glúteos apretados.
- 6 · Piernas estiradas hasta 90° o más. · Enrolla la pelvis arriba. · Controla el balanceo en la bajada.
- 7 · Lleva los pies a tocar la barra. · Brazos estirados y hombros activos. · Estricto, sin impulso.
- 8 · Tumbado en un banco, agárrate a algo firme detrás de la cabeza. · El peso va en la parte alta de la espalda, **nunca en el cuello**. · Empieza con las rodillas dobladas y baja en ~5 s sin doblar la cadera.
- 9 · Cuerpo recto de hombros a pies. · Sin flexionar la cadera ni arquear la lumbar. · Control total en todo el recorrido.

**Prerrequisitos:** ninguno.

**Justificación**
- *Core triplet* del RR: 3×8–12 con 60 s de descanso. En anti-extensión, *plank → ring ab rollouts → ab wheel rollouts* ([gist RR](https://gist.github.com/fi0/d13d851347c8e29e1a3e0ec7042fe149), [gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb)).
- Dragon flag: progresión tuck → tuck avanzado → straddle o media → completo. El peso va en la parte alta de la espalda y no en el cuello; las negativas se pueden hacer con las rodillas dobladas ([espejo wiki dragon flag](https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/dragonflag), [12 Minute Athlete](https://www.12minuteathlete.com/dragon-flag-tutorial/)).
- La extensión de cadera y lumbar (la *reverse hyper* del RR) queda cubierta por la ruta nueva de bisagra (2.7).

**Cambios:**
- Se **inserta** "Rueda abdominal".
- Plancha a 3×30 s y hollow encogido a 3×30 s.
- Se aclara la clave del cuello en el dragon flag.

---

### 2.7 (NUEVA) Bisagra e isquios (`bisagra`)
El RR dedica una pareja completa a la bisagra (*Second Pair: Dips & Hinge*) y la app no tiene nada equivalente. Propongo añadirla al **Día B** junto a piernas, o alternarla con piernas [criterio propio sobre la plantilla].

Descanso **90 s**. `equipment`: "Anclaje para los pies (sofá, barra baja o compañero); banda opcional".

| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Puente de glúteos a una pierna | reps | 3×10 | sí |
| 1 | Peso muerto rumano a una pierna | reps | 3×10 | sí |
| 2 | Negativas de curl nórdico (rango parcial) | reps | 3×5 | – |
| 3 | Curl nórdico asistido con banda | reps | 3×8 | – |
| 4 | Curl nórdico | reps | 3×5 | – |

Claves:
- 0 · Pie cerca del glúteo y la otra pierna estirada. · Sube apretando el glúteo, sin arquear la lumbar. · Pausa de 1 s arriba.
- 1 · Cadera hacia atrás con la rodilla ligeramente flexionada. · Cadera nivelada, sin abrirla hacia fuera. · Espalda neutra; si pierdes el equilibrio, apoya un dedo en la pared.
- 2 · Talones bien anclados y cuerpo recto de rodillas a cabeza. · Baja tan lento como puedas **sin doblar la cadera**. · Frena con las manos y vuelve empujando desde el suelo.
- 3 · Banda anclada por encima y por detrás, pasada por el pecho. · Misma técnica: cadera extendida. · Usa una banda más fina al llegar a 3×8.
- 4 · Baja y sube con el cuerpo recto. · Si hace falta, ayúdate con un leve empujón de manos abajo. · Introdúcelo con poco volumen: produce mucha agujeta.

**Prerrequisitos:** ninguno.

**Justificación**
- Escalera de bisagra del RR: *Romanian Deadlift → Single-Leg Deadlift → Banded Nordic Curl → Nordic Curl* ([gist RR resumen](https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb)). La wiki indica que se progresa "piking your hips less" ([espejo wiki hinge](https://asdjflk.github.io/r/bodyweightfitness/wiki/exercises/hinge)).
- Una guía pide 3×10–12 por pierna en el peso muerto a una pierna antes de las negativas con banda, sigue el orden parcial → con banda → completo, y propone cambiar a una banda más fina a 3×8 ([Bible of Calisthenics hinge](https://bibleofcalisthenics.substack.com/p/hinge-progression-from-beginner-to), [BodySpec nordic](https://www.bodyspec.com/blog/post/nordic_curls_form_variations_progression)).
- El puente de glúteos como entrada es [criterio propio].

---

## 3. HABILIDADES

### 3.1 Muscle-up (`muscleup`)
**Problemas actuales**
- **El prerrequisito es demasiado flojo.** `dominadas step 5` y `fondos step 5` solo exigen haber superado 3×5 dominadas y 3×6 fondos. Las guías piden ~10 dominadas explosivas, **pecho a barra** y fondos profundos (en torno a 10 o más, a ser posible en barra recta).
- El orden pone las explosivas antes de las pecho a barra estrictas. Es mejor dominar primero el pecho a barra estricto.

**Propuesta** (descanso **180 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Dominadas pecho a barra | reps | 3×5 | – |
| 1 | Transiciones en barra baja | reps | 3×6 | – |
| 2 | Dominadas explosivas | reps | 4×5 | – |
| 3 | Negativas de muscle-up | reps | 3×3 | – |
| 4 | Dominadas a la cintura | reps | 4×3 | – |
| 5 | Muscle-up con impulso (o con banda) | reps | 4×2 | – |
| 6 | Muscle-up estricto | reps | 3×3 | – |
| 7 | Muscle-ups encadenados | reps | 3×5 | – |

Claves:
- 0 · Toca la barra con la parte baja del pecho. · Codos hacia abajo y atrás; inclina un poco el torso hacia atrás. · Cuerpo hueco, sin patada.
- 1 · Barra a la altura del pecho y pies en el suelo. · Pasa de colgado a apoyo llevando el pecho por encima de la barra. · El agarre falso (muñeca sobre la barra) ayuda en la transición.
- 2 · Tira lo más rápido posible. · Objetivo: el pecho pasa claramente por encima de la barra. · Baja controlado entre repeticiones.
- 3 · Empieza en apoyo sobre la barra. · Baja lento pasando por la transición, con los codos cerca del cuerpo. · Termina en colgado con los brazos estirados.
- 4 · Tirón explosivo hasta que la barra llegue al ombligo. · Lleva la barra "hacia la cadera", no solo hacia arriba. · Es la potencia que necesita el muscle-up.
- 5 · Balanceo controlado (kip) para ganar altura, o una banda en los pies. · Inclínate sobre la barra en el punto más alto. · Termina con un fondo completo.
- 6 · Sin balanceo: piernas juntas y quietas. · Tirón explosivo hacia la cintura. · Gira los codos rápido por encima de la barra.
- 7 · Repeticiones seguidas sin soltar la barra. · Baja controlado hasta colgado entre cada una. · Técnica limpia en todas.

**Prerrequisitos** (índices según las listas nuevas):
- `{ id: 'dominadas', step: 6 }`: haber **superado "Dominadas (volumen)" 3×10**.
- `{ id: 'fondos', step: 6 }`: haber **superado "Fondos en barra recta" 3×8**, lo que implica haber superado antes los fondos 3×12.

**Justificación**
- Wiki: los prerrequisitos son *chest-to-bar pull-ups* y fondos profundos. La progresión es pull-ups con agarre falso → negativas → kipping → estricto ([espejo wiki muscle-up](https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/muscle-up)).
- Las guías consultadas van de ~5 pecho a barra estrictas a 15 dominadas y 15 fondos. El consenso está en ~10 dominadas explosivas y ~10 fondos, con pecho a barra; una de ellas pide 10 o más fondos en barra recta ([StrengthLog](https://www.strengthlog.com/bar-muscle-up/), [Breaking Muscle](https://breakingmuscle.com/dissecting-muscle-up-mastery/), [CrossFit ring training 3](https://www.crossfit.com/essentials/crossfit-ring-training-part-3)).
- Descanso de 180 s por tratarse de trabajo explosivo [criterio propio, coherente con el máximo de 3 min del RR].

**Cambios:**
- Se intercambian los pasos 0 y 1 (pecho a barra antes que explosivas) y las transiciones suben al paso 1.
- "Dominadas a la cintura" pasa a 4×3.
- Prerrequisitos más estrictos y descanso de 150 a 180 s.

---

### 3.2 Pino (`pino`)
**Problemas actuales**
- Faltan las **subidas por la pared** (cómo entrar y salir) y la práctica de **salida en rueda**. GMB y otras guías piden dominar la salida segura antes del pino libre.
- Las claves de corrección son ambiguas: "si caes hacia la espalda" o "hacia delante" no dice hacia dónde.
- "Pino libre 5 s" y "15 s" se pueden fusionar en un solo paso de 5×10 s.

**Propuesta** (descanso **90 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Pica con pies elevados | hold | 3×30 s | – |
| 1 | Subidas por la pared (wall walk) | reps | 3×3 | – |
| 2 | Pino de cara a la pared | hold | 3×30 s | – |
| 3 | Pino de cara a la pared (1 min) | hold | 3×60 s | – |
| 4 | Patada al pino y salida en rueda | reps | 3×5 | – |
| 5 | Despegues de la pared | reps | 3×5 | – |
| 6 | Pino libre | hold | 5×10 s | – |
| 7 | Pino libre 30 s | hold | 3×30 s | – |
| 8 | Pino libre 60 s | hold | 3×60 s | – |

Claves:
- 0 · Pies en un banco y cadera alta, en forma de "L" invertida. · Empuja el suelo y mete las orejas entre los brazos. · Acostumbra muñecas y hombros a la carga.
- 1 · Empieza en plancha con los pies junto a la pared. · Sube los pies por la pared mientras acercas las manos. · Baja deshaciendo el camino, sin dejarte caer.
- 2 · Manos a 10–20 cm de la pared y cuerpo recto. · Hombros empujando hacia arriba ("crece"), con las orejas tapadas. · Abdomen y glúteos apretados, sin arquear la espalda.
- 3 · Alinea muñecas, hombros, cadera y tobillos. · Puntas estiradas y piernas apretadas. · Respira de forma controlada.
- 4 · Patada suave desde un pie, sin pared. · Si te pasas, gira una mano y sal "en rueda" hacia un lado. · Practica la salida hacia los dos lados.
- 5 · Desde el pino de cara a la pared, separa los pies unos segundos. · Aguanta 2–3 s en cada despegue. · Corrige con los dedos y con la base de la palma.
- 6 · Muchos intentos cortos y de calidad. · Si te pasas (las piernas van hacia tu espalda), **clava los dedos**. · Si te quedas corto (vuelves hacia donde subiste), **empuja con la base de la palma**.
- 7 · Línea recta y cuerpo tenso. · Hombros totalmente abiertos y empujando. · Mirada entre las manos.
- 8 · Consolida: la calidad manda sobre la cantidad. · Prueba variantes (piernas abiertas, tuck). · Es la base de la flexión de pino libre.

**Prerrequisitos:** `{ id: 'flexiones', step: 2 }`, es decir, haber superado las flexiones inclinadas y estar ya en flexiones completas (la misma exigencia que hoy, con el índice nuevo).

**Justificación**
- GMB prefiere el pino de cara a la pared como paso previo al equilibrio libre. Propone 20–30 s en 3 o más series como señal para empezar a equilibrar, y la salida en rueda desde ese pino ([GMB freestanding](https://gmb.io/freestanding-handstand/), [GMB](https://gmb.io/?p=333594)).
- De espaldas a la pared es más fácil arquear la lumbar; otras guías piden 30 s de cara a la pared antes del pino libre ([FitnessVolt handstand](https://fitnessvolt.com/calisthenics/handstand/)).
- Las subidas por la pared, las salidas controladas a cada lado como subobjetivo y los despegues breves están en [Griply](https://griply.app/goal-plans/sport-health/handstand-progression) y [Ganbaru Method](https://join.ganbarumethod.com/handstand-drills-to-get-you-off-the-wall/).
- Las correcciones dedos / base de la palma son la técnica estándar [criterio propio; no pude verificar una fuente concreta en esta sesión].

**Cambios:**
- Se **insertan** "Subidas por la pared" y "Patada al pino y salida en rueda".
- Los pasos de pino libre de 5 s y 15 s se **fusionan** en uno de 5×10 s.
- Se reescriben las claves de corrección.

---

### 3.3 Flexión de pino (`hspu`)
**Problemas actuales**
- Falta el paso intermedio **pica en cajón** (cadera sobre los hombros, torso vertical), que OG lista como *Box HeSPU*.
- Falta un puente entre la HSPU con déficit y la HSPU libre: las **negativas libres**.
- La HSPU libre exige un pino libre sólido, pero el prerrequisito de la ruta solo pide `pino step 1`.

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Flexiones en pica | reps | 3×10 | – |
| 1 | Flexiones en pica pies elevados | reps | 3×8 | – |
| 2 | Flexiones en pica en cajón | reps | 3×8 | – |
| 3 | Negativas de pino en pared | reps | 3×5 (5 s) | – |
| 4 | Flexiones de pino en pared parciales | reps | 3×5 | – |
| 5 | Flexiones de pino en pared | reps | 3×5 | – |
| 6 | Flexiones de pino en pared (volumen) | reps | 3×8 | – |
| 7 | Flexiones de pino con déficit | reps | 3×5 | – |
| 8 | Negativas de flexión de pino libre | reps | 3×3 | – |
| 9 | Flexión de pino libre | reps | 3×3 | – |

Claves:
- 0 · Cadera alta, en forma de "V" invertida. · La cabeza baja por delante de las manos y forma un triángulo con ellas. · Codos hacia atrás, no abiertos.
- 1 · Pies en un banco. · Torso lo más vertical posible. · La cabeza toca el suelo suavemente.
- 2 · Rodillas o pies en un cajón alto, con la cadera justo encima de los hombros. · Mismo triángulo cabeza-manos. · Empuja hasta bloquear los codos.
- 3 · Pino de espaldas a la pared (o de cara, si quieres una línea más estricta). · Baja la cabeza al suelo en 5 s. · Baja de la pared para volver a subir.
- 4 · Pon un cojín o libros bajo la cabeza para acortar el recorrido. · Reduce la altura progresivamente. · Bloquea los codos arriba.
- 5 · Rango completo: cabeza al suelo. · Codos a unos 45°, no hacia los lados. · Abdomen apretado para no arquear.
- 6 · Misma técnica y ritmo constante. · Sin patear la pared para subir. · Respira arriba.
- 7 · Manos en paralettes o en dos apoyos. · Baja la cabeza por debajo del nivel de las manos. · Rango extra = más fuerza.
- 8 · Requiere un **pino libre de 30 s o más**. · Baja en 3–5 s manteniendo la línea. · Sal en rueda si pierdes el equilibrio.
- 9 · Sin pared: fuerza y equilibrio juntos. · Baja controlando la línea del cuerpo. · Pocas repeticiones de calidad.

**Prerrequisitos:**
- `{ id: 'flexiones', step: 3 }`: haber superado las flexiones 3×8.
- `{ id: 'pino', step: 3 }`: haber superado el pino de cara a la pared 3×30 s.

Recomendación adicional en las claves de los pasos 8 y 9: tener superado el "Pino libre 30 s".

**Justificación**
- Pica → pies elevados → cajón → negativas en pared → pared → libre. Los fragmentos de OG muestran *Pike HeSPU → Box HeSPU* en los primeros niveles junto a *Wall HS* ([tablas OG, copia](https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf)).
- La pica debe imitar la HSPU ([Antranik pike push-up](https://antranik.org/?p=5984)). Otras guías: subir la altura de los pies al llegar a 8–10 reps, ~60 s de pino en pared antes de las negativas, y la HSPU libre como etapa separada que exige un pino dominado ([StrongFirst HSPU 3](https://www.strongfirst.com/journey-handstand-push-part-3/), [Bible of Calisthenics wall HSPU](https://bibleofcalisthenics.substack.com/p/wall-handstand-push-up-progression)).
- Codos a 45° y el triángulo cabeza-manos: [criterio propio / técnica estándar].

**Cambios:**
- Se **insertan** "Pica en cajón" y "Negativas de flexión de pino libre".
- La HSPU en pared de volumen pasa de 3×10 a 3×8.
- Prerrequisito de pino más exigente y descanso de 120 a 150 s.

---

### 3.4 L-sit (`lsit`)
**Problemas actuales**
- Falta el **L-sit con pies apoyados**, el primer paso de la wiki del RR.
- Faltan el paso al **suelo** (más difícil que en paralelas) y el soporte como prerrequisito.
- Hay tres pasos solo de tiempo (10, 20 y 30 s). Se pueden reducir a dos gracias a la progresión doble.

**Propuesta** (descanso **90 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Elevaciones de piernas sentado (compresión) | reps | 3×10 | – |
| 1 | L-sit con pies apoyados | hold | 3×30 s | – |
| 2 | Tuck L-sit | hold | 3×20 s | – |
| 3 | L-sit a una pierna | hold | 3×15 s | sí |
| 4 | L-sit | hold | 3×15 s | – |
| 5 | L-sit 30 s | hold | 3×30 s | – |
| 6 | L-sit en el suelo | hold | 3×15 s | – |
| 7 | V-sit en tuck / inicial | hold | 3×5 s | – |

Claves:
- 0 · Sentado con las piernas estiradas y las manos junto a las rodillas. · Levanta ambas piernas unos centímetros. · Inclínate hacia delante para comprimir.
- 1 · Manos en paralelas o paralettes y brazos bloqueados. · Glúteos en el aire y talones apoyados en el suelo. · Hombros empujando hacia abajo.
- 2 · Rodillas al pecho y pies en el aire. · Brazos bloqueados. · Hombros lejos de las orejas.
- 3 · Una pierna estirada y la otra recogida. · Cambia de pierna en cada serie. · Puntas de los pies estiradas.
- 4 · Ambas piernas estiradas a 90° y rodillas bloqueadas. · Hombros abajo y pecho abierto. · Si no llegas, haz series más cortas pero limpias.
- 5 · Piernas paralelas al suelo. · Respiración corta y controlada. · Es la base para el V-sit y para la planche.
- 6 · En el suelo hay menos espacio: más compresión y más empuje de hombros. · Manos junto a la cadera, dedos hacia delante o hacia los lados. · Empuja el suelo lejos de ti.
- 7 · Sube las piernas por encima de la horizontal, en tuck al principio. · Empuja hacia atrás con las manos y lleva la cadera adelante. · Requiere mucha compresión y flexibilidad en pica.

**Prerrequisitos:**
- `{ id: 'core', step: 3 }`: haber superado el hollow encogido.
- `{ id: 'fondos', step: 1 }`: haber superado el soporte en paralelas 3×30 s.

**Justificación**
- Wiki: L-sit con pies apoyados → tuck elevado → tuck avanzado o a una pierna → L-sit completo; si el tuck cuesta, añadir trabajo de compresión ([espejo wiki L-sit](https://reddit.sudovanilla.org/r/bodyweightfitness/wiki/exercises/l-sit)).
- Una guía propone 10–15 s de tuck y de una pierna antes del L-sit completo; otra propone hasta 30 s por pierna ([Bodybuilding.com L-sit](https://bodybuilding.com/content/ultimate-beginners-guide-to-the-l-sit.html), [akuaku](https://akuaku.org/Sarco+/progression-l-sit-progression.html)).
- Antranik: el L-sit en el suelo es requisito del V-sit, que empieza en tuck ([Antranik V-sit](https://antranik.org/?p=5820)).

**Cambios:**
- Se **insertan** "L-sit con pies apoyados" y "L-sit en el suelo".
- "L-sit 10 s" y "L-sit 20 s" se **fusionan** en "L-sit 3×15 s".
- Una pierna pasa a 3×15 s por lado, y se añade el prerrequisito de soporte.

---

### 3.5 Front lever (`frontlever`)
**Problemas actuales**
- Falta el **half lay** (piernas juntas, rodillas flexionadas), un puente muy usado cuando el straddle está limitado por la flexibilidad.
- "Colgado en hollow" no es un paso estándar.
- "Front lever a una pierna" debería ser `side: true`.
- Tuck 10 s y tuck 20 s son el mismo ejercicio; se fusionan.
- Prerrequisito: `dominadas step 4` solo exige haber superado las negativas.

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Tuck front lever | hold | 3×15 s | – |
| 1 | Tuck avanzado | hold | 3×12 s | – |
| 2 | Front lever a una pierna | hold | 3×8 s | sí |
| 3 | Front lever straddle | hold | 3×8 s | – |
| 4 | Front lever half lay | hold | 3×8 s | – |
| 5 | Front lever completo | hold | 3×5 s | – |
| 6 | Front lever 10 s | hold | 3×10 s | – |

Claves:
- 0 · Rodillas al pecho y espalda horizontal. · Brazos rectos, empujando la barra hacia la cadera. · Escápulas abajo (depresión); que la cadera no caiga por debajo de los hombros.
- 1 · Espalda **plana**, con la cadera abierta a ~90° y las rodillas por debajo de la cadera. · Si la espalda se redondea o la cadera cae, vuelve al tuck. · Mucho más exigente que el tuck.
- 2 · Una pierna estirada y la otra en tuck avanzado. · Cambia de pierna en cada serie. · Cadera alineada con los hombros.
- 3 · Piernas estiradas y abiertas: cuanto más abiertas, más fácil. · Cierra el ángulo poco a poco. · Glúteos y piernas apretados.
- 4 · Piernas juntas con las rodillas dobladas a ~90° y la cadera extendida. · Útil si te falta apertura para el straddle. · Cuerpo de hombros a rodillas en línea.
- 5 · Piernas juntas y cuerpo totalmente horizontal. · Brazos bloqueados. · Entra desde el tuck o desde una dominada invertida, con control.
- 6 · Consolida la posición. · Añade remos y elevaciones en front lever como accesorio. · Calidad sobre cantidad.

**Prerrequisitos:**
- `{ id: 'dominadas', step: 5 }`: haber superado las dominadas 3×8.
- `{ id: 'core', step: 4 }`: haber superado el hollow body 3×30 s.
- Opcional: `{ id: 'remo', step: 3 }`, haber superado el remo australiano 3×8.

**Justificación**
- Orden: tuck → tuck avanzado (espalda plana) → una pierna → straddle → half lay → completo ([Wikipedia: Front lever](https://en.wikipedia.org/wiki/Front_lever)). Los fragmentos de OG van en el mismo orden ([tablas OG, copia](https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf)).
- Umbrales: ~15–20 s de tuck en varias series antes de avanzar, y tuck avanzado de ~10 s con espalda plana ([FitnessVolt front lever](https://fitnessvolt.com/calisthenics/front-lever/), [calisthenai adv tuck](https://calisthenai.duckdns.org/en/exercises/adv-tuck-fl)).
- En el foro de GymnasticBodies hay un hilo sobre la "regla de los 60 s", que recomienda llegar a holds largos en los estáticos básicos ([hilo "60 seconds rule"](https://www.gymnasticbodies.com/forum/topic/8632-60-seconds-rule)). Otros posts del mismo foro discrepan: unos proponen avanzar ya con 5–10 s y otros no entrenar una progresión que no se aguante 15–20 s. Elijo 8–15 s por etapa como término medio [criterio propio].
- Descanso de 150 s: isometría de alta intensidad [criterio propio].

**Cambios:**
- Se **elimina** "Colgado en hollow".
- Se **fusionan** los dos pasos de tuck.
- Se **inserta** "Half lay".
- "A una pierna" pasa a `side: true`.
- Prerrequisitos más estrictos y descanso de 120 a 150 s.

---

### 3.6 Planche (`planche`)
**Problemas actuales**
- El salto de **tuck avanzado a straddle** es enorme. Conviene un paso intermedio de straddle con **banda**.
- El prerrequisito `flexiones step 5` exige haber superado las "Flexiones con pies elevados" pero **no la pseudo planche**, que es el acondicionamiento específico.
- Las claves no mencionan el **acondicionamiento de muñecas**.

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Planche lean | hold | 3×30 s | – |
| 1 | Frog stand (cuervo) | hold | 3×20 s | – |
| 2 | Tuck planche | hold | 3×10 s | – |
| 3 | Tuck planche 20 s | hold | 3×20 s | – |
| 4 | Tuck avanzado | hold | 3×10 s | – |
| 5 | Straddle planche con banda | hold | 3×10 s | – |
| 6 | Planche straddle | hold | 3×5 s | – |
| 7 | Planche completa | hold | 3×5 s | – |

Claves:
- 0 · Posición de flexión con los hombros por delante de las manos y los dedos hacia fuera o atrás. · Brazos bloqueados y escápulas separadas (protracción), con glúteos apretados. · Avanza la inclinación poco a poco y calienta bien las muñecas.
- 1 · Rodillas apoyadas en la parte trasera de los brazos, cerca de los codos. · Inclínate hasta levantar los pies. · Mirada un poco por delante de las manos.
- 2 · Brazos **rectos**, rodillas al pecho y pies en el aire. · Espalda redondeada y hombros adelantados (protracción). · Las paralettes ayudan a las muñecas.
- 3 · Sube la cadera hasta la altura de los hombros. · Empuja el suelo lejos de ti durante todo el hold. · Muñecas bien calentadas.
- 4 · Espalda plana y cadera a la altura de los hombros. · Rodillas alejadas del pecho. · Mucha protracción y depresión.
- 5 · Banda anclada arriba y pasada por la cadera. · Piernas abiertas y estiradas, con el cuerpo paralelo al suelo. · Usa una banda más fina al llegar a la meta.
- 6 · Piernas estiradas y abiertas. · Cuerpo paralelo al suelo, sin perder la protracción. · Cuenta cada segundo: el progreso es lento.
- 7 · Piernas juntas y cuerpo horizontal. · Brazos bloqueados. · Tendones y articulaciones se adaptan más despacio que el músculo: sube el volumen con prudencia.

**Prerrequisitos:**
- `{ id: 'flexiones', step: 6 }`: haber superado las **flexiones pseudo planche 3×8**.
- `{ id: 'fondos', step: 4 }`: haber superado los fondos 3×8.
- Opcional: `{ id: 'lsit', step: 5 }`, haber superado el L-sit 3×15 s (opinión de comunidad).

**Justificación**
- Las tablas de OG empiezan la planche con el *frog stand* y siguen con tuck, tuck avanzado, straddle y completa ([tablas OG, copia](https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf)).
- Camino típico: preparación de muñecas → pseudo planche → tuck → tuck avanzado. Un benchmark de lean es tener la punta de los dedos más allá de la cadera durante 10 s o más. La protracción activa es la clave técnica, y saltarse la preparación de muñecas es la vía rápida a la lesión ([Skool planche breakdown](https://www.skool.com/awesome-ninja-fitness/full-planche-training-breakdown), [FitnessVolt planche](https://fitnessvolt.com/calisthenics/planche/)).
- Un post del foro de GymnasticBodies, visto en resultados de búsqueda sin que pueda identificar el hilo exacto, propone 3×30 s de L-sit como requisito mínimo para empezar la planche. Es una opinión, no un estándar, y por eso queda como opcional.
- Straddle con banda: [criterio propio / práctica habitual].

**Cambios:**
- Se **inserta** "Straddle con banda".
- Lean de 3×20 a 3×30 s.
- Prerrequisito de flexiones apuntando a la pseudo planche.
- Claves de muñeca y de brazos rectos, y descanso de 120 a 150 s.

---

### 3.7 Back lever (`backlever`)
**Problemas actuales**
- El salto de tuck avanzado a straddle no tiene paso **a una pierna**.
- "German hang 3×20 s" se queda corto respecto al criterio habitual de ~30 s sin dolor.
- La clave **"Relaja y deja que los hombros se estiren"** es arriesgada: carga pasiva en el rango final del hombro y el bíceps.
- No hay ninguna advertencia sobre el tendón del bíceps ni sobre el agarre.

**Propuesta** (descanso **150 s**)
| # | Paso | Tipo | Objetivo | Lado |
|---|---|---|---|---|
| 0 | Skin the cat | reps | 3×5 | – |
| 1 | German hang | hold | 3×30 s | – |
| 2 | Tuck back lever | hold | 3×15 s | – |
| 3 | Tuck avanzado | hold | 3×10 s | – |
| 4 | Back lever a una pierna | hold | 3×8 s | sí |
| 5 | Back lever straddle | hold | 3×8 s | – |
| 6 | Back lever completo | hold | 3×5 s | – |
| 7 | Back lever 10 s | hold | 3×10 s | – |

Claves:
- 0 · Empieza con anillas bajas o con los pies tocando el suelo. · Recoge las piernas y gira hacia atrás solo hasta donde lleguen los hombros sin dolor. · Lento y controlado, a la ida y a la vuelta.
- 1 · Entra con los pies apoyados para dosificar el peso. · Brazos rectos y hombros con algo de tensión: **no te cuelgues "muerto"** ni fuerces el rango. · Sal volviendo por donde entraste.
- 2 · Boca abajo, rodillas al pecho y espalda horizontal. · Brazos rectos y hombros empujando hacia abajo. · Mejor en anillas; en barra usa **agarre prono**, nunca supino.
- 3 · Espalda plana y cadera abierta a ~90°. · Rodillas por debajo de la cadera. · Si se doblan los codos, aún no toca este paso.
- 4 · Una pierna estirada y la otra en tuck avanzado. · Cambia de pierna en cada serie. · Cadera en línea con los hombros.
- 5 · Piernas estiradas y abiertas. · Glúteos apretados y pelvis en retroversión, sin arquear la lumbar. · Cadera a la altura de los hombros.
- 6 · Piernas juntas y cuerpo horizontal. · Bíceps y hombros a tope: calienta bien. · Sal siempre con control, nunca dejándote caer.
- 7 · Consolida la posición. · No subas el volumen deprisa: el tendón del bíceps se adapta despacio. · Calidad sobre cantidad.

**Prerrequisitos:**
- `{ id: 'dominadas', step: 4 }`: haber superado las negativas y estar en dominadas (igual que hoy).
- `{ id: 'fondos', step: 1 }`: haber superado el soporte en paralelas.

**Justificación**
- Orden habitual: skin the cat → German hang → tuck → tuck avanzado → una pierna → straddle → completo ([FitnessVolt back lever](https://fitnessvolt.com/calisthenics/back-lever/), [calisthenai back lever](https://calisthenai.duckdns.org/en/skills/back-lever)).
- El German hang es "la entrada al back lever" y pone el hombro en su posición más vulnerable. Se recomienda un German hang sin dolor antes de entrenar levers. Una fuente en francés de los resultados da un mínimo de 30 s sin dolor; por el resumen de búsqueda, probablemente sea [nocsy skin the cat](https://www.nocsy.fr/mouvements-crossfit/skin-the-cat/). Un post del foro de GymnasticBodies sugiere además 3×30 s de German hang antes de las progresiones de back lever.
- La posición completa somete el tendón del bíceps a un estiramiento con carga muy alto, y precipitar la progresión es la causa típica de molestias de codo ([Bodytree back lever](https://bodytree-website.pages.dev/exercises/full-back-lever)).
- Lo del agarre supino como factor de riesgo en barra es [criterio propio / advertencia habitual; sin fuente verificada en esta sesión].

**Cambios:**
- Se **inserta** "A una pierna".
- German hang de 3×20 a 3×30 s.
- Se reescriben las claves del German hang y se añaden las de agarre y codos.
- Prerrequisito de soporte y descanso de 120 a 150 s.

---

## 4. Plantillas de día (sugerencia) [criterio propio]
- **Día A:** dominadas · fondos · piernas · core
- **Día B:** remo · flexiones · bisagra · core

Así se reproduce el reparto del RR: tirón y empuje vertical y horizontal, más sentadilla y bisagra.

---

## Fuentes

URLs consultadas en esta sesión. Las dos gists se leyeron completas; el resto, a través de los resúmenes de WebSearch, porque la red de la sesión no permitía abrirlas.

**Recommended Routine (r/bodyweightfitness) y espejos de su wiki**
- https://gist.github.com/fi0/d13d851347c8e29e1a3e0ec7042fe149 (copia del RR, leída completa)
- https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb (guía de terceros del RR con las escaleras, leída completa)
- https://axebps-redlib.hf.space/r/bodyweightfitness/wiki/exercises/pullup
- https://asdjflk.github.io/r/bodyweightfitness/wiki/exercises/squat
- https://r.datuan.dev/r/bodyweightfitness/wiki/exercises/squat
- https://redlib.hackliberty.org/r/bodyweightfitness/wiki/exercises/row
- https://studylib.net/doc/27324942/bwf-progressions-v2
- https://asdjflk.github.io/r/bodyweightfitness/wiki/exercises/hinge
- https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/muscle-up
- https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/dragonflag
- https://reddit.sudovanilla.org/r/bodyweightfitness/wiki/exercises/l-sit

**Overcoming Gravity (solo fragmentos de las tablas)**
- https://www.calisthenics-101.co.uk/wp-content/uploads/2020/05/Overcoming-Gravity-2nd-Edition-Exercise-Charts.pdf

**GMB, Antranik, Hybrid Calisthenics y otras guías**
- https://gmb.io/freestanding-handstand/
- https://gmb.io/?p=333594
- https://gmb.io/shrimp-squats-vs-pistol-squats/
- https://antranik.org/beginners-guide-to-pistol-squats/
- https://antranik.org/?p=5984
- https://antranik.org/?p=5820
- https://www.hybridcalisthenics.com/onearm-pushups
- https://en.wikipedia.org/wiki/Front_lever
- https://fitnessvolt.com/calisthenics/front-lever/
- https://fitnessvolt.com/calisthenics/back-lever/
- https://fitnessvolt.com/calisthenics/planche/
- https://fitnessvolt.com/calisthenics/handstand/
- https://fitnessvolt.com/calisthenics/one-arm-pull-up/
- https://fitnessvolt.com/one-arm-pushup-progression/
- https://calisthenai.duckdns.org/en/exercises/adv-tuck-fl
- https://calisthenai.duckdns.org/en/skills/back-lever
- https://bodytree-website.pages.dev/exercises/full-back-lever
- https://www.nocsy.fr/mouvements-crossfit/skin-the-cat/
- https://www.skool.com/awesome-ninja-fitness/full-planche-training-breakdown
- https://www.gymnasticbodies.com/forum/topic/8632-60-seconds-rule
- https://gymnasticbodies.com/?p=12925
- https://griply.app/goal-plans/sport-health/handstand-progression
- https://join.ganbarumethod.com/handstand-drills-to-get-you-off-the-wall/
- https://www.strongfirst.com/journey-handstand-push-part-3/
- https://bibleofcalisthenics.substack.com/p/wall-handstand-push-up-progression
- https://bibleofcalisthenics.substack.com/p/dips-progression-from-beginner-to
- https://bibleofcalisthenics.substack.com/p/hinge-progression-from-beginner-to
- https://www.bodyspec.com/blog/post/nordic_curls_form_variations_progression
- https://athleanx.com/articles/how-to-do-bench-dips
- https://breakingmuscle.com/the-3-building-blocks-to-performing-a-proper-dip/
- https://breakingmuscle.com/whats-preventing-you-from-doing-pistol-squats-how-to-progress-pistols/
- https://breakingmuscle.com/dissecting-muscle-up-mastery/
- https://squatuniversity.com/2016/06/24/6-steps-to-perfecting-your-pistol-squat/amp/
- https://www.strengthlog.com/bar-muscle-up/
- https://www.crossfit.com/essentials/crossfit-ring-training-part-3
- https://bullbarfit.com/blogs/q-as/how-do-i-progress-to-one-arm-pull-ups-safely
- https://calisthenicsworld.org/how-to-do-archer-pull-ups/
- https://bodybuilding.com/content/ultimate-beginners-guide-to-the-l-sit.html
- https://akuaku.org/Sarco+/progression-l-sit-progression.html
- https://www.12minuteathlete.com/dragon-flag-tutorial/

**No verificado en esta sesión** (búsquedas pendientes por falta de presupuesto):
- estudios sobre descansos entre series (por ejemplo, Schoenfeld 2016),
- la profundidad exacta del fondo según la wiki del RR,
- una fuente concreta para la corrección dedos / palma en el pino,
- una fuente concreta para el agarre supino en el back lever.
