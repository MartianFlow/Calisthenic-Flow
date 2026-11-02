# Principios de programación de calistenia basados en evidencia

*Investigación para mejorar Calisthenic Flow (`js/data/roadmaps.js`, `js/logic.js`). Fecha: 2026-11-02.*

> **Nota de método y límites.** Toda la información procede de búsquedas web (resúmenes de resultados). No se pudo abrir el texto completo de las páginas: `WebFetch` falló por la lista de dominios permitidos de la sesión (`redditbwf.github.io` y `dpetkovski.pages.dev` no resolvían). Además, se agotó el presupuesto de búsquedas compartido antes de cubrir **FitnessFAQs**, **Calisthenicmovement** y la epidemiología de lesiones y tendones. Por eso:
> - Los datos de los estudios proceden de sus resúmenes (abstracts) o de reseñas secundarias, que se indican en cada caso.
> - Las cifras de *Overcoming Gravity* (OG) vienen del blog de Steven Low o de notas de lectores, no del libro.
> - Cuando una recomendación no tiene fuente verificada, se marca como **[sin fuente verificada]**.

---

## 0. Resumen de parámetros recomendados para la app

### 0.1 Descanso entre series por tipo de ejercicio

| Tipo de ejercicio (ejemplos de la app) | Descanso recomendado | Valor por defecto propuesto | Base |
|---|---|---|---|
| Fuerza de 1 a 5 reps: variantes muy duras (dominada a una mano, negativas a una mano, muscle-up estricto, HSPU libre o con déficit, flexión a una mano, pistol, dragon flag) | 2,5–5 min | **180 s** | Schoenfeld 2016 (3 min > 1 min); de Salles 2009 (3–5 min); Steven Low (3–7 min) |
| Fuerza e hipertrofia de 6 a 12 reps: dominadas, fondos, remo, flexiones y sus variantes | 90 s–3 min | **120 s** en tirón vertical y fondos, **90 s** en remo y flexiones | Singer 2024 (sin diferencias apreciables por encima de 90 s); RR (90 s entre ejercicios emparejados, hasta 3 min si caen las reps) |
| Pierna unilateral (`side: true`) | 60–90 s tras completar los dos lados | **90 s** | Singer 2024 (beneficio pequeño por encima de 60 s). La otra pierna ya da descanso parcial |
| Potencia y explosivos: dominadas explosivas, a la cintura, muscle-up con impulso | 2–3 min | **150–180 s** | Calidad de cada rep; misma lógica que la fuerza máxima |
| Isometría de skill con brazos rectos, cerca del máximo: tuck y avanzado de planche, front lever y back lever, straddle, completo | 2–5 min | **150 s** (180 s en straddle o completo) | Guías de práctica: tuck planche 4×10–15 s con 2–3 min; full planche 4–5×6–10 s con 3–5 min |
| Isometría de posición o resistencia, no máxima: colgado, soporte, plancha, hollow, pica, pino en pared | 60–90 s | **60–90 s** | Baja exigencia neural; core de la RR con 60 s |
| Práctica de equilibrio (pino libre por intentos) | 30–60 s entre intentos cortos | **45 s** | GMB: series cronometradas con unos 30 s de descanso. Foros: 15–20 s entre patadas. Es práctica, no fatiga |
| Core y accesorios (dead bug, elevaciones, hollow) | 60 s | **60 s** | Core triplet de la RR: 3 × 8–12 con 60 s |
| Pares de antagonistas (superseries) | 90 s entre ejercicios, unos 3 min entre series del mismo ejercicio | **90 s** dentro del par | RR; Robbins 2010; Paz 2017 |

**Regla sencilla para implementar:** que el descanso dependa del paso y no solo de la ruta. Por ejemplo, `rest = step.rest ?? f(type, target, straightArm)`:
- `reps` con `target ≤ 5`: 180 s
- `reps` de 6 a 12: 90–120 s
- `reps` con `target > 12`: 60–90 s
- `hold` de skill con brazos rectos: 150 s
- otros `hold`: 60–90 s

### 0.2 Series, reps y tiempos objetivo

| Tipo | Rango de trabajo | Meta del paso (para subir) | Fuente |
|---|---|---|---|
| Fuerza con reps | 3 × 5–8 (Low: 3–8 reps; 15–18 reps totales) | **3 × 8** limpias y empiezas el siguiente paso en 3 × 5 | RR; Steven Low |
| Hipertrofia o volumen | 3 × 8–12 (hasta unas 15) | 3 × 12 y, por encima de 15, mejor cambiar a una variante más difícil | RR (core 8–12); Low (5–8 fuerza más hipertrofia) |
| Isometría de skill con brazos rectos | 3–6 series de 5–15 s, a ~60–70 % de tu hold máximo; 30–60 s acumulados | 3 × 10–15 s limpios o unos 30–60 s acumulados con buena forma | Low (Prilepin isométrico: 60–70 % del máximo; ejemplo 6 × 7 s); notas de OG (4–5 series al 70 %) |
| Isometría de posición (plancha, hollow, soporte, pino en pared) | 3 × 20–60 s | 3 × 30 s (pino en pared antes del libre: unos 30 s) | Guías de pino; RR (soporte 30 s en el calentamiento) |
| Pino libre | Bloque de 5–10 min con intentos cortos, acumulando tiempo | Hold más largo o tiempo acumulado | nick-e RR (5–10 min de pino); guías de pino (10–20 min al día) |

### 0.3 Correspondencia entre la valoración y RIR/RPE, y su efecto en el objetivo

Escala RIR/RPE (Zourdos 2016; Helms 2016): RPE 10 = 0 RIR (fallo), RPE 9 = 1 RIR, RPE 8 = 2 RIR, y así sucesivamente.

| Valoración | RIR equivalente | Texto de ayuda propuesto | Reps: siguiente objetivo | Holds: siguiente objetivo |
|---|---|---|---|---|
| **Fácil** | ≥ 3 RIR (RPE ≤ 7) | «Me sobraban 3 reps o más (o unos 5 s)» | +2 reps por serie (como ahora) | +15–20 % (mín. +3 s); **máx. +2 s en brazos rectos** |
| **Normal** | 1–2 RIR (RPE 8–9) es la **zona objetivo** | «Me quedaban 1–2 reps, con buena técnica» | +1 rep por serie (como ahora) | +10 % (mín. +1–2 s) |
| **Difícil** | 0 RIR (RPE 10), forma rota o no llegué | «No podía hacer ni una más / perdí técnica» | Mantener; si no llegaste, **objetivo = mínimo conseguido** | Mantener; si no llegaste, objetivo = mínimo conseguido |

### 0.4 Reglas de progresión, estancamiento y descarga

- **Subir de paso:**
  - Con reps: alcanzar la meta (3 × 8, o 3 × 12 en pasos de volumen) con «Fácil» o «Normal» **una vez** en básicos de fuerza, como hace la RR.
  - Isometrías con brazos rectos: **2 sesiones** (como ahora) por la adaptación más lenta del tendón.
- **Entrada al paso nuevo:** empezar en el ~60 % de la meta (equivale a 3 × 5 de 3 × 8, igual que la RR). Si en la primera sesión no se llega, recalibrar al mínimo conseguido.
  - Si el usuario no hace al menos 3 reps o 6 s del paso nuevo, la regla que cuentan las notas de OG sugiere seguir en el anterior. Alternativa: mezclar las dos variantes.
- **Estancamiento:** el objetivo no sube en **3 exposiciones seguidas** de esa ruta, o «Difícil» sin cumplir 2 veces seguidas. Pasos, en orden:
  1. Microprogresión: +1 serie, tempo lento o pausas, o una variante intermedia.
  2. Reinicio: objetivo al ~80 % y volver a subir.
  3. Si tras 2 reinicios sigue estancado, bajar un paso.
- **Descarga (deload):** cada **5–6 semanas**, o cuando haya ≥ 2 rutas estancadas a la vez o mucha fatiga o dolor.
  - Dura 1 semana (5–7 días).
  - Misma frecuencia, series 3 → 2, objetivos al ~60–70 % (≥ 3 RIR), sin intentos máximos y sin subir de nivel.
  - **No parar del todo:** reducir, no dejar de entrenar.

---

## 1. Descansos entre series

### 1.1 Evidencia científica

- **Schoenfeld et al. 2016** (JSCR). 21 hombres entrenados, 1 min frente a 3 min de descanso, 8 semanas, con el resto de variables iguales.
  - El grupo de 3 min ganó más fuerza máxima (sentadilla y press de banca) y más grosor de muslo. En tríceps hubo una tendencia (p = 0,06).
  - En resistencia muscular no hubo diferencias.
  - Muestra pequeña y efectos modestos. <https://pubmed.ncbi.nlm.nih.gov/26605807/>
- **de Salles et al. 2009** (Sports Med, revisión). Descansar **3–5 min** produjo mayores aumentos de fuerza absoluta, porque permite mantener más volumen e intensidad. Hoy se considera superada la idea antigua de 30–60 s para hipertrofia. <https://pubmed.ncbi.nlm.nih.gov/19691365/> · texto: <https://www.unm.edu/%7Errobergs/478RestIntervalReview.pdf>
- **Grgic, Schoenfeld et al. 2017** (revisión sistemática, hipertrofia). En no entrenados sirven tanto descansos cortos como largos. En entrenados pueden convenir los descansos largos. <https://researchgate.net/profile/Brad_Schoenfeld/publication/317832672_The_effects_of_short_versus_long_inter-set_rest_intervals_in_resistance_training_on_measures_of_muscle_hypertrophy_A_systematic_review/links/59a010ad0f7e9b18359db18f/The-effects-of-short-versus-long-inter-set-rest-intervals-in-resistance-training-on-measures-of-muscle-hypertrophy-A-systematic-review.pdf>
- **Singer et al. 2024** (Frontiers, metaanálisis bayesiano; 9 estudios, 19 medidas).
  - Hay un pequeño beneficio hipertrófico con descansos **> 60 s**, posiblemente porque se pierde menos volumen.
  - **No se detectaron diferencias apreciables por encima de 90 s**: la penalización de volumen se estabiliza a partir de ahí.
  - Ir o no al fallo no cambió esta relación. <https://frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/abstract>
- **ACSM 2009** (Position Stand), según el resumen de IDEA Fit: **2–3 min** entre series en programas de varias series. <https://pubmed.ncbi.nlm.nih.gov/19204579/> · <https://www.ideafit.com/progression-models-in-resistance-training-for-healthy-adults>

**Conclusión práctica:**
- Mínimo **90 s** en ejercicios compuestos.
- **2–3 min** o más cuando se busca fuerza máxima con pocas reps.
- Descansar más rara vez perjudica; solo alarga la sesión.

### 1.2 Guía de practicantes

- **Rutina recomendada de r/bodyweightfitness (RR):**
  - Ejercicios emparejados con **90 s** de descanso entre cada uno. Así cada ejercicio descansa unos 3 min entre sus propias series.
  - Si 90 s no bastan y empiezan a caer las reps, se puede descansar **hasta 3 min**: la calidad importa más que el tiempo.
  - Core triplet: 3 rondas de **8–12 reps con 60 s**.
  - Fuentes (espejos o copias, porque reddit está bloqueado): <https://antranik.org/rr/>, <https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb>, <https://www.scribd.com/document/376587999/bwf-rr-2016-08-30>, <https://redditbwf.github.io/wiki/recommended_routine.html>
- **Steven Low** ("The Fundamentals of Bodyweight Strength Training"): para fuerza, **unos 3–7 min** entre series; él prefiere unos 5 min. <https://stevenlow.org/the-fundamentals-of-bodyweight-strength-training/>
  - Extractos de OG en Goodreads muestran plantillas del tipo «Pull-ups 3×5→15, 3 min rest». <https://www.goodreads.com/work/quotes/18367845-overcoming-gravity>
- **Isometrías de skill**, según guías no oficiales:
  - Tuck planche 4 × 10–15 s con **2–3 min**. <https://chairon.app/blogs/planche-progression-guide>
  - Full planche 4–5 × 6–10 s con **3–5 min**. <https://bodytree-website.pages.dev/exercises/full-planche>
- **Práctica de skill (GMB):** series cronometradas. Su ejemplo inicial es unos 10 s de preparación, unos 8 s de movimiento y **unos 30 s de descanso**, repetido varias veces. El descanso es «activo y consciente»: repasar el intento y decidir en qué fijarse. <https://gmb.io/reps> · <https://gmb.io/handstand/>
- **Pino:** en foros se sugieren intentos de patada con **15–20 s** de descanso; otras guías dan 90 s entre series. Hay consenso en practicar fresco y sin llegar a la fatiga. <https://gymnasticbodies.com/forum/topic/13580-handstand-practise-little-and-often-or-long-sessions-less-frequent>

### 1.3 Comparación con la app actual (`roadmap.rest`)

| Ruta | Actual | Propuesto | Comentario |
|---|---|---|---|
| dominadas | 120 | 120 (180 en los pasos de una mano) | OK |
| remo | 90 | 90 (120 en tuck front lever y a una mano) | OK |
| flexiones | 90 | 90 (150 en pseudo planche y a una mano) | OK |
| fondos | 90 | **120** | Compuesto pesado de empuje vertical; 90 s es el mínimo |
| piernas | **75** | **90** (120 en pistol y camarón) | Por debajo del umbral de 90 s que sugiere Singer 2024 |
| core | 60 | 60 (90 en dragon flag) | OK |
| muscleup | 150 | 150–180 | OK |
| pino | 90 | 90 en pared; **45** entre intentos de pino libre | El libre es práctica de equilibrio |
| hspu | 120 | 120–180 | OK; 180 en déficit y libre |
| lsit | 90 | 90–120 | OK |
| frontlever, planche, backlever | 120 | **150** (180 en straddle y completo) | Holds casi máximos con brazos rectos |

---

## 2. Series, repeticiones y tiempos de isometría

### 2.1 Rangos de repeticiones

- **RR:**
  - Elige la progresión más difícil que puedas hacer en **3 × 5–8** reps limpias.
  - Empieza en 3 × 5 y suma reps hasta **3 × 8**; entonces pasa a la siguiente progresión y vuelve a 3 × 5.
  - Si con una variante no salen 5, usa la anterior.
  - Fuentes: <https://www.liftosaur.com/programs/recommended-routine>, <https://bwf-w13.pages.dev/>, <https://lr.psf.lt/r/bodyweightfitness/wiki/kb/recommended_routine_2017>
- **Steven Low:**
  - Para fuerza, **3–8 reps**; para fuerza más hipertrofia, **5–8**.
  - Unas **15–18 reps totales** por ejercicio: 3 × 5–6, 4 × 4 o 5–6 × 3.
  - Rutina: 2–3 ejercicios de empuje y 2–3 de tirón, cada uno a 3–5 series de 3–6 reps.
  - Con enfoque de hipertrofia, unas 40–100 reps totales. <https://stevenlow.org/the-fundamentals-of-bodyweight-strength-training/>
- **ACSM 2026** (nuevo Position Stand, revisión de 137 revisiones sistemáticas):
  - La fuerza mejora con cargas altas, rango completo, **2–3 series**, ejercicios **al principio de la sesión** y **≥ 2 sesiones por semana**.
  - Ir al fallo **no** influyó de forma consistente en los resultados.
  - El peso corporal y el entrenamiento en casa son opciones eficaces.
  - Fuentes: <https://www.newswise.com/articles/acsm-unveils-landmark-2026-resistance-training-guidelines-first-update-in-17-years>, <https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf>, <https://enfaf.com/acsm-2026-posicion-entrenamiento-fuerza/>
- **Calistenia progresiva funciona: Kotarsky et al. 2018.**
  - Flexiones con variantes progresivas, 3 días por semana durante 4 semanas.
  - Mejoraron el 1RM de press de banca igual que el grupo de banca. <https://pubmed.ncbi.nlm.nih.gov/29466268/>
- **Volumen semanal:**
  - Schoenfeld et al. 2017: relación dosis-respuesta, con más hipertrofia hasta **10 o más series por músculo y semana**; en el análisis por categorías fue solo una tendencia. <https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf>
  - Pelland et al. 2025: rendimientos decrecientes, más marcados en fuerza que en hipertrofia. Contar las series indirectas como 0,5 («fraccional») predice mejor los resultados. <https://bibbase.org/network/publication/joshuapelland-jacobremmert-zacrobinson-sethhinson-michaelzourdos-theresistancetrainingdoseresponsemetaregressionsexploringtheeectsofweeklyvolumeandfrequencyonmusclehypertrophyandstrengthgain-2024> · resumen en español: <https://www.fisiologiadelejercicio.com/dosis-respuesta-en-volumen-y-frecuencia-en-la-mejora-de-hipertrofia-y-fuerza-muscular/>

### 2.2 Isometrías (holds)

- **Steven Low, tablas de Prilepin para isometría:**
  - Se trabaja al **60–70 % del tiempo máximo de hold**.
  - Del máximo salen el «tiempo por serie» y las «series totales», y con ellos el volumen total.
  - Ejemplo: para estar en el rango de **36–48 s totales**, se hacen **6 series de 7 s** de tuck front lever. <https://stevenlow.org/prilepin-tables-for-bodyweight-strength-isometric-and-eccentric-exercises/>
  - En un hilo de StrongFirst se lee así: para el equivalente de 1–5 reps, elige una variante que aguantes unos 8–18 s y haz unas 5 series al ~66 %.
  - Otra regla común es medir tu máximo, dividirlo entre dos y acumular unos 60 s. <https://www.strongfirst.com/community/threads/what-is-the-time-range-of-hold-isometric-position-for-best-gains-in-strength.11002/>
- **Notas de lector de OG**, interpretación del lector y no texto literal:
  - Isometrías: **4–5 series al 70 % del hold máximo**.
  - Pasar a una progresión más difícil cuando en ella se aguantan **6 s**. En dinámicos, cuando se hacen **3 reps**.
  - Dinámicos: 3 series de 3–8 reps.
  - <https://dpetkovski.com/overcoming-gravity-by-steven-low-book-notes/>
- **Foro de Gymnastic Bodies:** «3–5 series de 6–7 s es todo lo que necesitas al empezar», o formatos de volumen como 12 × 5 s y 10 × 6 s. Es anecdótico. <https://www.gymnasticbodies.com/forum/topic/3300-static-strength-confusion-on-when-to-progress>
- **Sistema de niveles de OG** (según Bodytree):
  - Antes de la planche completa, half-lay planche 3 × 30 s.
  - Planche completa en 4–5 × 6–10 s, unas 8–12 series de trabajo por semana y 3 veces por semana. <https://bodytree-website.pages.dev/exercises/full-planche>
- **Las isometrías de brazos rectos estresan mucho el tejido conectivo.** No se puede avanzar de golpe en cuanto «te sientes listo». Pasar de tuck a tuck avanzado lleva muchos días, con posiciones intermedias. <https://antranik.org/progression-exercises-for-static-holds/>
- **Pino:**
  - Referencia habitual: unos **30 s** en pared, o 3 × 30 s limpios, antes de trabajar el libre.
  - Practicar casi a diario en bloques cortos de 5–15 min, fresco.
  - Cortar el hold cuando la espalda empieza a arquearse. <https://bodytree-website.pages.dev/exercises/wall-handstand>
  - nick-e (versión de la RR): unos 10 min de skill, de ellos **5–10 min** de la progresión de pino. <https://nick-e.com/recommended-routine/>

### 2.3 Qué implica para los pasos de la app

- **Pasos con reps:**
  - Las metas de 3 × 5 a 3 × 12 están bien alineadas.
  - Algunas metas de entrada son altas, como «Sentadilla 3 × 20» o «Flexiones en pared 3 × 15». Funcionan como resistencia en pasos de iniciación, pero para fuerza conviene que la meta **no supere unos 15 reps**: a partir de ahí, mejor cambiar a la variante siguiente.
- **Isometrías de skill:**
  - Las metas actuales encajan con la práctica:
    - tuck: 3 × 10 → 3 × 20
    - tuck avanzado: 3 × 10
    - straddle y completo: 3 × 5–10
  - Para holds máximos ≤ 10 s, conviene permitir **más series más cortas** (por ejemplo 5–6 × 5 s), con un **total acumulado** como alternativa a «3 × N».
- **Objetivo inicial al 60 %:** en los holds encaja con el 60–70 % que dice Low. Pero Low calcula sobre el **máximo del usuario** y la app calcula sobre la **meta del paso**. Un test opcional de hold máximo al empezar un paso de isometría afinaría el objetivo.

---

## 3. Modelos de progresión

### 3.1 Doble progresión (el modelo base de la app)

- La RR aplica doble progresión: primero sube las reps dentro del rango (3 × 5 → 3 × 8) y después la «carga», es decir, la variante más difícil.
- OG añade más métodos para progresar dentro de un mismo ejercicio:
  - progresión lineal de reps y añadir reps
  - última serie al fallo
  - serie extra
  - rest-pause
  - densidad (menos descanso)
  - cambio de tempo
  - frecuencia
- Entre ejercicios, la progresión es pasar a variantes más difíciles. Son útiles como **microprogresiones cuando hay estancamiento**. <https://www.justinspencer.us/2021/04/overcoming-gravity-by-steven-low.html>

### 3.2 RIR/RPE y cómo encaja Fácil / Normal / Difícil

- **Escala RIR:** Zourdos et al. 2016 asignó las reps en reserva al RPE (10 = 0 RIR, 9 = 1 RIR). Helms et al. 2016 explica cómo usarla para regular la intensidad serie a serie. <https://openrepository.aut.ac.nz/items/efef3b25-6701-4fb5-bb82-55fcd2a26027/full> · <https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full>
- **Cercanía al fallo:**
  - Refalo et al. 2023 (metaanálisis): **no** hay evidencia de que ir al fallo sea superior para hipertrofia; la ventaja es trivial y la relación podría ser no lineal. <https://dro.deakin.edu.au/articles/journal_contribution/Influence_of_Resistance_Training_Proximity-to-Failure_on_Skeletal_Muscle_Hypertrophy_A_Systematic_Review_with_Meta-analysis/22030796>
  - Robinson et al. 2024 (metarregresiones, 55 estudios): la **fuerza** mejora de forma similar en un amplio rango de RIR. La **hipertrofia** aumenta, de forma no lineal, al acercarse al fallo. <https://www.fau.edu/newsdesk/articles/muscle-growth-strength-study> · <https://www.news-medical.net/news/20240801/New-study-reveals-sweet-spot-for-muscle-growth.aspx>
  - ACSM 2026: ir al fallo no influye de forma consistente (fuentes en §2.1).
- **Correspondencia propuesta** (ver tabla 0.3):
  - «Normal» = 1–2 RIR es la **zona objetivo**. Da estímulo de hipertrofia sin el coste del fallo.
  - «Fácil» = ≥ 3 RIR justifica un salto mayor.
  - «Difícil» = 0 RIR o técnica rota: se mantiene el objetivo.
  - Si «Difícil» aparece en un **hold con brazos rectos** o en un ejercicio de alta técnica, debería contar como señal de alerta y no como algo deseable.
- **Incrementos:**
  - Con reps: +1 en «Normal» y +2 en «Fácil» es estándar y coherente con la doble progresión (subir 1 rep por serie hasta el techo del rango).
  - Con holds: una guía general propone **+5 s por semana**. Con 2–3 exposiciones semanales, los +2 s por sesión que da la app (con meta de 10–20 s) equivalen a unos 4–6 s por semana: razonable.
  - En brazos rectos conviene limitar la subida a +1–2 s por sesión. *(La cifra de +5 s/semana apareció en un resumen de búsqueda de un artículo general de isometría que no pude identificar con seguridad: **[sin fuente verificada]**, evidencia débil.)*

### 3.3 Estancamientos, regresiones y descargas

- **Estancamiento** [regla operativa propuesta; la secuencia se inspira en los métodos de OG]: objetivo sin subir en 3 exposiciones seguidas. Se aplica en este orden:
  1. Microprogresión: serie extra, tempo 3-1-1, pausas o variante intermedia.
  2. Reinicio al ~80–90 % del objetivo y volver a subir.
  3. Bajar un paso.
- **Regresión tras fallar el objetivo:** hoy, «Difícil» sin llegar al objetivo baja solo 1 rep o el incremento pequeño. Es más realista fijar el objetivo en el **mínimo conseguido**, sobre todo en la **primera sesión de un paso nuevo**. Ahí el 60 % de la meta puede quedar lejos de la capacidad real (por ejemplo, de negativas a dominadas completas).
- **Descargas:**
  - Bell et al. 2022 (18 entrenadores): descarga **cada 4–6 semanas**, de **5–7 días**. Se reduce el volumen (menos reps por serie y menos series) y el esfuerzo (más lejos del fallo o menos carga relativa). <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9811819/>
  - Rogerson, …, Bell 2024 (encuesta a 246 atletas): duración **6,4 ± 1,7 días**, cada **5,6 ± 2,3 semanas**. Se reducen reps y series, **la frecuencia se mantiene** y se sube el RIR. Las desencadenan la fatiga, el estancamiento o las agujetas. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10948666/>
  - Definición de consenso (Delphi, Bell et al. 2023): «periodo de menor estrés de entrenamiento para mitigar la fatiga, favorecer la recuperación y preparar el entrenamiento siguiente». <https://shura.shu.ac.uk/32417/>
  - Coleman et al. 2024 (ECA): **dejar de entrenar** 1 semana a mitad de un programa de 9 semanas **redujo algo la ganancia de fuerza** y no cambió la hipertrofia. Por tanto, la descarga debe **reducir, no parar**. <https://peerj.com/articles/16777>

---

## 4. Estructura semanal

### 4.1 Frecuencia

- **Schoenfeld et al. 2016** (metaanálisis): con el volumen igualado, **2 veces por semana** supera a 1 por músculo. No está claro si 3 veces es mejor que 2. <https://pubmed.ncbi.nlm.nih.gov/27102172/>
- **Pelland et al. 2025:** la **fuerza** aumenta con la frecuencia, con rendimientos decrecientes. En hipertrofia, el efecto de la frecuencia es débil si el volumen es igual (fuente en §2.1).
- **ACSM 2009:** principiantes, cuerpo completo **2–3 días por semana**. **ACSM 2026:** ≥ 2 sesiones por semana por grupo muscular.
- **Steven Low:** principiantes e intermedios, **cuerpo completo 3 veces por semana**, o una división empuje/tirón. <https://stevenlow.org/integrating-bodyweight-and-barbell-training/>
- **RR:** cuerpo completo **3 veces por semana**.

**En la app**, con A/B alternos a 3 días por semana:
- Cada ruta concreta (dominadas, fondos, remo, flexiones) toca **1,5 veces por semana**. Pero hay tirón y empuje **en todas las sesiones**: contando las series indirectas como 0,5 al estilo Pelland, cada patrón sale a unas 2 o más veces por semana.
- Piernas y core van en todas las sesiones, 3 veces por semana. Está bien.
- **Riesgo:** con `daysPerWeek = 2`, cada ruta concreta queda en 1 vez por semana. En ese caso conviene usar sesiones de cuerpo completo con los 4 patrones, o 4 series en vez de 3.
- **Volumen:** 3 sesiones × 3 series dan unas 9 series semanales directas de tirón, de empuje y de pierna. Está justo en el mínimo del rango de unas 10 series por semana (Schoenfeld 2017). Es adecuado para principiantes; para intermedios conviene ofrecer una **4.ª serie opcional**.

### 4.2 Cuerpo completo o rutina dividida

- Para principiantes e intermedios, **el cuerpo completo 3 veces por semana** es la recomendación común (Low, RR, ACSM).
- Las divisiones (empuje/tirón) tienen sentido cuando el volumen por sesión se vuelve demasiado largo.

### 4.3 Orden dentro de la sesión

- **Nunes et al. 2021** (metaanálisis): las mayores ganancias de fuerza aparecen en los ejercicios hechos **al principio**. La hipertrofia es similar sea cual sea el orden. <https://pubmed.ncbi.nlm.nih.gov/32077380/>
- **ACSM 2026:** fuerza mejor si el ejercicio va al principio de la sesión.
- **RR:** calentamiento → skills (pino, soporte) → fuerza en pares → core.
- **Foros y guías de pino:** el trabajo técnico, «intensivo para el cerebro», va al principio, fresco y sin llevarlo a la fatiga.

La app ya pone las habilidades primero, y es correcto. Orden propuesto:
1. Calentamiento
2. Equilibrio (pino)
3. Skills de brazos rectos
4. Fuerza en pares
5. Core

### 4.4 Emparejar antagonistas (superseries)

- **Robbins et al. 2010** (revisión): las series emparejadas de agonista y antagonista alternan ejercicios con descanso entre ellos. Son **más eficientes** que las series tradicionales (volumen-carga por unidad de tiempo). <https://vuir.vu.edu.au/6830/> · resumen: <https://ditillo2.blogspot.com/2012/06/effect-of-paired-sets-on-volume-load.html>
- **Paz et al. 2017:** con series emparejadas, el volumen-carga fue mayor en todas las series de ambos ejercicios. <https://paulogentil.com/pdf/Volume%20Load%20and%20Neuromuscular%20Fatigue%20During%20an%20Acute%20Bout%20of%20Agonist-antagonist%20Paired-set%20Versus%20Traditional-set%20Training.pdf>
- **RR:** dominadas con fondos, sentadilla con bisagra y remo con flexiones, todo con 90 s entre ejercicios.
- **Propuesta para la app:**
  - Día A: dominadas + fondos y piernas + core.
  - Día B: remo + flexiones y piernas + core.
  - Alternar con 90 s ahorra un 30–40 % del tiempo de fuerza, y cada ejercicio sigue descansando unos 3 min entre sus propias series.

### 4.5 Duración de la sesión (estimación propia [sin fuente verificada])

| Bloque | Tiempo |
|---|---|
| Calentamiento | 8–10 min |
| Skills: 1–2 objetivos × 3–5 series × unos 2,5 min | 10–20 min |
| Fuerza: 2 pares × 3 rondas × unos 4 min | unos 25 min |
| Core | 5–6 min |
| **Total** | **unos 45–60 min** |

Con 3 skills objetivo y series tradicionales se superan los 70 min. Conviene **limitar a 2 skills por sesión** o rotarlos entre los días A y B.

---

## 5. Calentamiento

### 5.1 Evidencia

- **McCrary et al. 2015** (revisión sistemática, 31 ECA, tren superior):
  - Los calentamientos **dinámicos** mejoran el rendimiento, y los de **carga alta** mejoran la fuerza y la potencia.
  - El estiramiento estático breve no afecta a la potencia.
  - **No hay estudios** sobre prevención de lesiones en el tren superior. <https://pubmed.ncbi.nlm.nih.gov/25694615/>
- **Ribeiro et al. 2020 y 2021** (calentamiento específico):
  - 2 × 6 reps al **40 % y al 80 % de la carga de trabajo** mejoró el rendimiento de la primera serie.
  - Pocas reps con carga baja **no bastan**. <https://ideas.repec.org/a/gam/jijerp/v17y2020i18p6882-d417011.html> · <https://doaj.org/article/90de36e35e514c36af5f61118a42eb3a>

### 5.2 Práctica

- **Calentamiento de la RR** (versión de la copia en gist):
  - Yuri's shoulder band warm-up: 5–10 reps.
  - Squat sky reaches.
  - **GMB wrist prep: 10 o más reps.**
  - Dead bugs: 30 s.
  - **Arch hangs: 10 reps**, se añaden al llegar a las negativas de dominada.
  - **Support hold: 30 s**, se añade al llegar a las negativas de fondos.
  - Progresión fácil de sentadilla: 10 reps.
  - Progresión fácil de bisagra: 10 reps.
  - Fuentes: <https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb>, <https://www.boostcamp.app/coaches/r-bodyweightfitness/r-bodyweight-recommended-routine>
- **GMB:** calienta muñecas y hombros antes del pino. Si no llegas a extender bien la muñeca, dedica más tiempo al wrist prep ese día. El wrist prep puede hacerse a diario. <https://gmb.io/handstand/> · <https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/wrist-prep>

### 5.3 Propuesta para `WARMUP` (unos 8–10 min)

La lista actual ya tiene: rotaciones de muñeca, círculos de brazos, gato-camello, retracciones escapulares en barra, sentadilla profunda y flexiones suaves. Faltan la **carga progresiva de muñecas**, la **activación en apoyo** y las **series de aproximación**.

1. Círculos de brazos y dislocaciones con banda o palo: 10 reps.
2. **Preparación de muñecas con carga** (estilo GMB): a cuatro patas, balanceos adelante y atrás con dedos hacia delante, hacia los lados y hacia atrás, palmas arriba y en puño. Unas **10 reps por posición**. Es imprescindible si hay pino, HSPU, planche o L-sit.
3. Gato-camello: 10 reps.
4. Retracciones escapulares colgado (**arch hangs**): 10 reps.
5. **Flexiones escapulares** (protracción y retracción): 10 reps. Sirven para planche y flexiones.
6. **Soporte en paralelas o sillas: 20–30 s.** Para fondos, planche y L-sit.
7. Dead bug o hollow suave: 30 s.
8. Sentadilla profunda con apertura: 45 s.
9. **Series de aproximación** del primer ejercicio de cada bloque:
   - 1 serie de la variante anterior × 5–6 reps, o un hold de unos 50 % del objetivo.
   - 1 serie de la variante actual × 2–3 reps, o un hold de unos 50 %.
   - Esto se apoya en Ribeiro: una aproximación ligera más otra cercana a la carga de trabajo.
10. *(Solo si el objetivo es el back lever)*: skin the cat o german hang suave, en rango parcial.

---

## 6. Seguridad

- **Los tendones se adaptan más despacio que el músculo.**
  - Si la fuerza muscular sube demasiado rápido, el tejido conectivo se queda atrás y aumenta el riesgo. <https://coachsci.sdsu.edu/csa/vol21/stegema2.htm>
  - Las isometrías de brazos rectos (front lever, back lever, planche, L-sit) estresan mucho el tejido conectivo: no hay que saltarse pasos. <https://antranik.org/progression-exercises-for-static-holds/>
  - En el foro de Gymnastic Bodies se recomienda tratar el trabajo de brazos rectos **como una categoría aparte, casi como skill**, y **no sentirlo nunca en los tendones**. <https://www.gymnasticbodies.com/forum/topic/18956-how-to-tell-when-ligaments-and-tendons-have-adapted>
- **Frecuencia de los skills de brazos rectos:** las guías hablan de unas 3 veces por semana como máximo (Bodytree, planche). En StrongFirst se comenta que el trabajo de planche y anillas pide días completos de descanso. Para la app:
  - **≤ 3 veces por semana y no en días seguidos.**
  - **≤ 2 skills de brazos rectos por sesión.** Hoy se permiten hasta 3, y podrían ser planche, front lever y back lever juntos.
- **Fallo:**
  - No hace falta para la fuerza (Robinson 2024; ACSM 2026).
  - **Evitar el fallo** en holds de brazos rectos, en ejercicios de alta técnica (muscle-up, HSPU libre, pino) y en las negativas.
  - Los holds se cortan cuando se rompe la forma: brazos que se doblan, cadera que cae o espalda que se arquea.
  - El fallo, si se usa, solo en la última serie de accesorios o de ejercicios estables.
- **Muñecas:**
  - Preparación diaria antes del pino o la planche (GMB).
  - Paralelas o paralettes (la app ya lo sugiere) para reducir la extensión forzada.
  - Si hay dolor de muñeca, más preparación y menos volumen en apoyo.
- **Codo y tendón del bíceps** en back lever, planche y german hang. **[sin fuente verificada en esta búsqueda; consenso de práctica]**:
  - Progresar el rango del german hang o skin the cat poco a poco.
  - Cuidar el bloqueo del codo en planche y back lever.
  - No acumular varios skills de brazos rectos y supinación en la misma sesión.
- **Dolor tendinoso** que dura más que las agujetas musculares, o que empeora al día siguiente: señal de bajar volumen o intensidad (fuente de baja calidad, blog de gimnasio: <https://grindergym.com/why-connective-tissue-limits-strength/>). Para tendinitis, acudir a un fisioterapeuta.
- **En la app:** si en un skill de brazos rectos se marca «Difícil» 2 veces seguidas, o el usuario indica dolor, **no subir** y sugerir la variante anterior o una descarga.

---

## 7. Qué contradice o matiza la evidencia en la lógica actual

1. **Un único descanso por ruta.** El descanso debería escalar con la dificultad del paso.
   - Una dominada a una mano o una planche straddle necesitan 150–180 s.
   - Una flexión en pared o un colgado pasivo, 60 s.
   - En `piernas`, 75 s está por debajo del umbral de unos 90 s.
2. **Bajada tras fallar el objetivo (−1 o incremento pequeño).** Es lenta si el paso nuevo empieza demasiado alto. Mejor recalibrar al mínimo conseguido, sobre todo en la primera sesión tras subir.
3. **No hay detección de estancamiento ni descarga.** La práctica de entrenadores y atletas es descargar cada 4–6 semanas (unos 5,6 de media) o ante estancamiento o fatiga, sin dejar de entrenar.
4. **Hasta 3 skills al principio.** Si son de brazos rectos, la carga tendinosa es alta. Limitar a 2 por sesión y ≤ 3 veces por semana para cada uno.
5. **El calentamiento no incluye muñecas con carga, apoyo ni series de aproximación.** Faltan elementos que la RR, GMB y los estudios de calentamiento específico respaldan.
6. **Los textos de la valoración no hablan de RIR.** «Al límite» (Difícil) puede llevar a buscar el fallo. La evidencia indica que trabajar a 1–2 RIR («Normal») basta, y es más seguro en los skills.
7. **Puntos que sí cuadran:**
   - El objetivo inicial al 60 % de la meta equivale a 3 × 5 → 3 × 8 de la RR.
   - Los incrementos de +1 / +2 reps.
   - Subir de nivel en «Fácil» en la meta.
   - Exigir 2 «Normal» antes de subir. Es más conservador que la RR, adecuado para skills; en básicos se podría bajar a 1.
   - Las habilidades primero y el cuerpo completo A/B.

---

## Fuentes

### Investigación
- Schoenfeld BJ et al. 2016. *Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men*. JSCR. <https://pubmed.ncbi.nlm.nih.gov/26605807/>
- de Salles BF et al. 2009. *Rest interval between sets in strength training*. Sports Med. <https://pubmed.ncbi.nlm.nih.gov/19691365/> · <https://www.unm.edu/%7Errobergs/478RestIntervalReview.pdf>
- Grgic J, Schoenfeld BJ et al. 2017. *The effects of short versus long inter-set rest intervals… hypertrophy: a systematic review*. <https://researchgate.net/profile/Brad_Schoenfeld/publication/317832672_The_effects_of_short_versus_long_inter-set_rest_intervals_in_resistance_training_on_measures_of_muscle_hypertrophy_A_systematic_review/links/59a010ad0f7e9b18359db18f/The-effects-of-short-versus-long-inter-set-rest-intervals-in-resistance-training-on-measures-of-muscle-hypertrophy-A-systematic-review.pdf>
- Singer A et al. 2024. *Give it a rest: a systematic review with Bayesian meta-analysis…* Frontiers in Sports and Active Living. <https://frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/abstract>
- ACSM 2009. *Progression models in resistance training for healthy adults*. <https://pubmed.ncbi.nlm.nih.gov/19204579/> · resumen: <https://www.ideafit.com/progression-models-in-resistance-training-for-healthy-adults>
- ACSM 2026. *Resistance Training Prescription… An Overview of Reviews*. <https://www.newswise.com/articles/acsm-unveils-landmark-2026-resistance-training-guidelines-first-update-in-17-years> · <https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf> · <https://enfaf.com/acsm-2026-posicion-entrenamiento-fuerza/>
- Zourdos MC et al. 2016. *Novel resistance training-specific RPE scale measuring repetitions in reserve*. <https://openrepository.aut.ac.nz/items/efef3b25-6701-4fb5-bb82-55fcd2a26027/full>
- Helms ER et al. 2016. *Application of the RIR-based RPE scale for resistance training*. <https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full>
- Refalo MC et al. 2023. *Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy*. <https://dro.deakin.edu.au/articles/journal_contribution/Influence_of_Resistance_Training_Proximity-to-Failure_on_Skeletal_Muscle_Hypertrophy_A_Systematic_Review_with_Meta-analysis/22030796>
- Robinson ZP et al. 2024, metarregresiones de cercanía al fallo (notas de prensa). <https://www.fau.edu/newsdesk/articles/muscle-growth-strength-study> · <https://www.news-medical.net/news/20240801/New-study-reveals-sweet-spot-for-muscle-growth.aspx>
- Schoenfeld BJ, Ogborn D, Krieger JW 2016. *Effects of resistance training frequency on measures of muscle hypertrophy*. <https://pubmed.ncbi.nlm.nih.gov/27102172/>
- Schoenfeld BJ, Ogborn D, Krieger JW 2017. *Dose-response relationship between weekly resistance training volume and increases in muscle mass*. <https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf>
- Pelland J et al. 2025. *The resistance training dose-response: meta-regressions… weekly volume and frequency*. <https://bibbase.org/network/publication/joshuapelland-jacobremmert-zacrobinson-sethhinson-michaelzourdos-theresistancetrainingdoseresponsemetaregressionsexploringtheeectsofweeklyvolumeandfrequencyonmusclehypertrophyandstrengthgain-2024> · <https://www.fisiologiadelejercicio.com/dosis-respuesta-en-volumen-y-frecuencia-en-la-mejora-de-hipertrofia-y-fuerza-muscular/>
- Nunes JP et al. 2021. *What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy?* <https://pubmed.ncbi.nlm.nih.gov/32077380/>
- Kotarsky CJ et al. 2018. *Effect of progressive calisthenic push-up training on muscle strength and thickness*. <https://pubmed.ncbi.nlm.nih.gov/29466268/>
- Robbins DW et al. 2010. *Agonist-antagonist paired set resistance training: a brief review*. <https://vuir.vu.edu.au/6830/> · resumen de Robbins, Young y Behm 2010: <https://ditillo2.blogspot.com/2012/06/effect-of-paired-sets-on-volume-load.html>
- Paz GA et al. 2017. *Volume load and neuromuscular fatigue during an acute bout of agonist-antagonist paired-set vs. traditional-set training*. <https://paulogentil.com/pdf/Volume%20Load%20and%20Neuromuscular%20Fatigue%20During%20an%20Acute%20Bout%20of%20Agonist-antagonist%20Paired-set%20Versus%20Traditional-set%20Training.pdf>
- Bell L et al. 2022. *Coaches' perceptions, practices and experiences of deloading*. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9811819/>
- Bell L et al. 2023. *Integrating deloading… An international Delphi consensus*. <https://shura.shu.ac.uk/32417/>
- Rogerson D, …, Bell L 2024. *Deloading practices in strength and physique sports: a cross-sectional survey*. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10948666/>
- Coleman M et al. 2024. *Gaining more from doing less? The effects of a one-week deload period…* PeerJ. <https://peerj.com/articles/16777>
- McCrary JM et al. 2015. *A systematic review of the effects of upper body warm-up on performance and injury*. BJSM. <https://pubmed.ncbi.nlm.nih.gov/25694615/>
- Ribeiro B et al. 2020. Calentamiento específico en sentadilla y press de banca (IJERPH). <https://ideas.repec.org/a/gam/jijerp/v17y2020i18p6882-d417011.html>
- Ribeiro B et al. 2021. Journal of Men's Health. <https://doaj.org/article/90de36e35e514c36af5f61118a42eb3a>

### Practicantes y comunidad
- Rutina recomendada de r/bodyweightfitness (espejos o copias):
  - <https://antranik.org/rr/>
  - <https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb>
  - <https://redditbwf.github.io/wiki/recommended_routine.html>
  - <https://lr.psf.lt/r/bodyweightfitness/wiki/kb/recommended_routine_2017>
  - <https://www.liftosaur.com/programs/recommended-routine>
  - <https://bwf-w13.pages.dev/>
  - <https://nick-e.com/recommended-routine/>
  - <https://www.scribd.com/document/376587999/bwf-rr-2016-08-30>
  - <https://www.boostcamp.app/coaches/r-bodyweightfitness/r-bodyweight-recommended-routine>
- Wiki de r/bodyweightfitness, preparación de muñecas (espejo): <https://twt.omada.cafe/r/bodyweightfitness/wiki/exercises/wrist-prep>
- Steven Low:
  - *The Fundamentals of Bodyweight Strength Training*: <https://stevenlow.org/the-fundamentals-of-bodyweight-strength-training/>
  - *Prilepin tables for bodyweight strength isometric and eccentric exercises*: <https://stevenlow.org/prilepin-tables-for-bodyweight-strength-isometric-and-eccentric-exercises/>
  - *Integrating Bodyweight and Barbell Training*: <https://stevenlow.org/integrating-bodyweight-and-barbell-training/>
  - *A Beginner's Guide to Overcoming Gravity*: <https://stevenlow.org/a-beginners-guide-to-overcoming-gravity/>
- *Overcoming Gravity*, extractos y notas:
  - <https://www.goodreads.com/work/quotes/18367845-overcoming-gravity>
  - <https://dpetkovski.com/overcoming-gravity-by-steven-low-book-notes/>
  - <https://www.justinspencer.us/2021/04/overcoming-gravity-by-steven-low.html>
- GMB:
  - <https://gmb.io/reps>
  - <https://gmb.io/handstand/>
- StrongFirst, tiempo de isometría: <https://www.strongfirst.com/community/threads/what-is-the-time-range-of-hold-isometric-position-for-best-gains-in-strength.11002/>
- Foro de Gymnastic Bodies:
  - <https://www.gymnasticbodies.com/forum/topic/3300-static-strength-confusion-on-when-to-progress>
  - <https://www.gymnasticbodies.com/forum/topic/18956-how-to-tell-when-ligaments-and-tendons-have-adapted>
  - <https://gymnasticbodies.com/forum/topic/13580-handstand-practise-little-and-often-or-long-sessions-less-frequent>
- Antranik, *Progression exercises for static holds*: <https://antranik.org/progression-exercises-for-static-holds/>
- Bodytree (sistema de niveles de OG, planche y pino):
  - <https://bodytree-website.pages.dev/exercises/full-planche>
  - <https://bodytree-website.pages.dev/exercises/wall-handstand>
- Chairon, guía de planche: <https://chairon.app/blogs/planche-progression-guide>
- Recopilación de ciencia del entrenamiento (tendón frente a músculo): <https://coachsci.sdsu.edu/csa/vol21/stegema2.htm>
- Grinder Gym (baja calidad; dolor tendinoso): <https://grindergym.com/why-connective-tissue-limits-strength/>

**No cubiertos (presupuesto de búsqueda agotado):** FitnessFAQs (Daniel Vadnal), Calisthenicmovement, epidemiología de lesiones en calistenia y estudios específicos de adaptación tendinosa (Bohm, Mersmann, Arampatzis). Las búsquedas sobre FitnessFAQs no devolvieron ninguna página suya.
