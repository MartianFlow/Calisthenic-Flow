---
name: pruebas-e2e
description: Escribir, ejecutar y depurar las pruebas Playwright de Calisthenic Flow (tests/e2e). Úsala al añadir pruebas, cuando una prueba falle en local o en CI (Chromium o WebKit), o para seguir con la serie de pruebas exhaustivas que pidió el usuario (huecos en docs/referencia/pendiente.md).
---

# Pruebas e2e

## Ejecutar

- `npm install` y luego `npx playwright test --project=iphone-chromium`. Tarda ~4 min con unas 315 pruebas.
- Para una sola: `npx playwright test tests/e2e/gym.spec.js -g "texto" --project=iphone-chromium --reporter=line`.
- **En este entorno** solo hay Chromium: `@playwright/test` 1.63.0 usa `/opt/pw-browsers`. **No** ejecutes `playwright install`.
- **WebKit** (el motor de Safari) solo corre en CI: `.github/workflows/e2e.yml`, que instala también `fonts-inter`. Para esperar a CI y leer los fallos, sigue la skill `publicar`.
  - La prueba sin conexión se salta en WebKit: `setOffline` con service worker da un error interno de Playwright.

## Qué hay

| Archivo | Pruebas |
|---|---|
| `onboarding.spec.js` (7) | Bienvenida paso a paso: portada; recorrido completo con experiencia, pierna, niveles, habilidades (las que domina y la que aprende), días, descanso y héroe; sin pasos de pierna en modo gimnasio; atrás, «Cambiar» y recargar a mitad; cambiar desde el resumen y volver a él; «Aún no domino ninguna» con recomendadas; importar una copia antigua (su objetivo pasa a foco) |
| `skills.spec.js` (20) | Foco y mantenimiento: conversión de `goals` con aviso; Ajustes (foco, mantener, máximo 2, «Aún no domino ninguna»); semana del usuario (pino el primero cada día, mantener 1–2 días y una por sesión); 5 días; brazos rectos sin días seguidos; back lever y planche nunca juntos; flexión de pino y muscle-up no seguidos; dosis de mantenimiento; «Solo pino» en descanso (no cuenta como entreno); recomendadas; básicos que le faltan al foco; propuesta al completar la ruta (con hueco y con 2); Rutas; sin plan semanal |
| `skill-training.spec.js` (15) | Complementarios: orden, sin valorar, sin progreso, historial y «Última vez»; uno en los primeros pasos y ninguno en mantener; preparación del back lever con cronómetro; pino; L-sit tras el core; jalón en lugar del remo en tuck. Alternancia con 80 s. Más series. Ficha con complementarios y plazos. «Fácil» en brazos rectos = 2 sesiones. Calentamiento extra (y tras recargar). Sustituir: dominadas −1 serie sin subir, muscle-up en lugar de dominadas en la semana, fondos −1 con flexión de pino |
| `rest.spec.js` (4) | Descanso fijo de 80 s por defecto con −15/+15; cambiarlo en Ajustes; «Según ejercicio»; valores raros corregidos al cargar |
| `motion.spec.js` (3) | **Con animaciones** (`reducedMotion: 'no-preference'`): pantallas visibles al terminar y sin scroll horizontal, pastilla de la pestaña, cabeceras fijas en el entreno y en la bienvenida |
| `workout.spec.js` (6) | Flujo completo con isometría, descanso, valoración y resumen; recargar a mitad; +/− y descartar; cuenta atrás de las isometrías (5 s, «+5 s», 10 s desde Ajustes) |
| `session-flow.spec.js` (9) | Pasar de ejercicio (v22): sin peso no deja marcar la serie (lo pide y abre el teclado); tras la última serie se queda hasta valorar; «Siguiente» sin series no pasa y con series pide la valoración; «Saltar» deja el ejercicio pendiente en la barra y se vuelve a él al final; valorar mirando otro no cambia de ejercicio; «Seguir entrenando» al terminar; la barra no vuelve al principio al repintar y el actual se ve al recargar; cuenta atrás 5…1 y 0 a su segundo (con un `AudioContext` de mentira) y saltar el descanso la cancela |
| `progression.spec.js` (8) | Fácil +2, Normal +1, Fácil en la meta sube de paso (en fuerza; en brazos rectos, ver `skill-training`), 2 pases en habilidades, recalibrado, reinicio al 80 %, descanso por paso («Según ejercicio») y fijo |
| `plan.spec.js` (12) | Recomendación a principiantes; nivel con habilidades; cambiar días; front lever sin días seguidos; día de descanso; «Misión cumplida»; mover un entreno de día y deshacerlo; mover el de hoy; cambios de otra semana ignorados; «Entrenar hoy»; elegir rutina en Hoy (al editar y en descanso) |
| `gym.spec.js` (9) | Semana L–V; 72 h entre piernas con el sábado; 5 días y 9 pesos; coma decimal; subida y bajada de peso; cambio de peso a mitad; ficha desde Hoy; ruta desde el Plan |
| `navigation.spec.js` (10) | 14 rutas; visor de vídeo; búsqueda sin vídeo; nivel a mano; calendario; progreso; pestañas; tema forzado oscuro y claro; botón de tema de las cabeceras |
| `gamification.spec.js` (5) | Héroe; logros al abrir; artículos bloqueados; apariencia y nombre; mini héroe |
| `gamification-plus.spec.js` (8) | Secretos ocultos y «¡Cosquillas!» (con su mascota); «El lado oscuro»; secreto no destripado en Equipo; secretos de fecha y hora; misiones (3, en Hoy y Héroe; cumplida con 3 entrenos); récord personal en el resumen; 70 artículos y 108 logros |
| `deload.spec.js` (2) | Sugerencia por estancamiento y su efecto; «Ahora no» |
| `custom.spec.js` (14) | Ejercicios propios: crear (sin nombre no se guarda, lo escrito no se pierde, con peso, rango y días), editar, archivar, borrar si no se entrenó, añadir a un entreno suelto, datos raros corregidos; entrenar con peso (sube el peso), «+» con su incremento, de segundos (cronómetro y `top`), sin peso (+2 con Fácil), ficha con gráfica y récord. Aviso de copia (sale, «Ahora no», no sale con copia reciente, exportar da «A salvo»). Peso corporal (uno por día, diferencia, borrar) |
| `split.spec.js` (11) | Cómo divides tu semana: datos de antes quedan torso/pierna con la misma semana; empuje/tirón/pierna con 5 días (las de mantener en su grupo) y con 3 (aviso); torso/pierna con calistenia; cambiar desde el Plan y Ajustes. «A tu manera»: empieza con tus días, renombrar, quitar y añadir ejercicios, día nuevo, semana y «Arquitecto»; hoy toca tu día y el historial guarda su nombre; un ejercicio propio marcado en tu día. Superseries con 40 s y el logro; sin la opción, ninguna. Bienvenida con «A tu manera» |
| `data.spec.js` (5) | Migración v1; exportar e importar; borrar datos; sin conexión (solo Chromium); misma versión en sw.js y version.js |
| `layout.spec.js` (170) | Diseño: todos los escenarios de `tests/tools/escenarios-diseno.js` a 320, 375, 390 y 430 px (ver la skill `revisar-diseno`) |

Lo que falta por cubrir está en `docs/referencia/pendiente.md`, en «Huecos de pruebas funcionales».

## `fixtures.js`

- **Reloj fijo:** lunes 2/11/2026 a las 10:00 en Madrid, semana ISO 45 (impar, toca B). Se cambia con `test.use({ now: '…' })`.
- **Red externa bloqueada**: las miniaturas de YouTube fallan, y es normal.
- **Falla si la app lanza errores de JavaScript.**
- **Los diálogos** (`confirm` y `prompt`) se aceptan solos; el `prompt` responde «Rayo».
- **Ayudantes:**
  - `seed(page, state)`: guarda los datos antes de que cargue la app, una vez por pestaña;
  - `makeState()` y `pastSession()`;
  - `readState(page)`;
  - `completeCurrentExercise()`: marca solo las series del ejercicio actual;
  - `rate()` y `trainOnly()`.
- **Configuración:** `reducedMotion: 'reduce'`, porque las animaciones infinitas impiden que los elementos estén «estables».
  - `motion.spec.js` las activa con `test.use({ reducedMotion: 'no-preference' })` y pulsa con `dispatchEvent('click')`: un `click()` normal esperaría para siempre a que el botón deje de latir.
- **Bienvenida:** elegir la experiencia o la pierna avanza solo tras 420 ms (`setTimeout`). En las pruebas, `page.clock.runFor(600)` después de elegir. Para llegar a un paso en los escenarios de diseño: `wizTo('clave')` de `escenarios-diseno.js`.
- **Artículos bloqueados:** llevan `aria-disabled`; para pulsarlos, `click({ force: true })`.

## Trucos y errores ya vividos

- **Para seguir hay que valorar (v22):** tras la última serie de un ejercicio la app **no** pasa al siguiente hasta valorarlo, y ya no existe `rate-later`. En una prueba que encadena ejercicios, valora con `rate(page, 'normal')` (o `.rate-panel [data-value]`) antes de marcar el siguiente. En los de peso, siembra `lifts` con `kg` o la serie no se marca.
- **Comprobar pitidos:** `addInitScript` con un `AudioContext` de mentira cuyo `currentTime` sale de `performance.now()` (también lo controla `page.clock`) y que apunta cada `osc.start(t)`; ver `session-flow.spec.js`.

- **`motion.spec.js` en CI:** la máquina es más lenta y una animación de entrada aún podía estar a medias al medir. `settled()` espera ahora a las animaciones finitas (`document.getAnimations()`).
- **Semana ISO 45 (impar):** en empuje/tirón/pierna empieza el empuje (E antes que T), igual que en torso/pierna empieza TB.
- **Un objeto del estado cambia dentro de `update`:** si lees `customOf(id)` antes de `update` y lo usas después, ya trae el cambio. Copia lo que necesites antes (pasó con el aviso de «archivado»).

- **Reloj simulado:** con `page.clock.install`, `page.waitForFunction` y `page.waitForURL` pueden no avanzar tras un cambio de hash. Espera desde Node con un bucle de `page.evaluate` y `page.waitForTimeout`.
- **`page.waitForFunction` no espera a una función `async`:** la promesa cuenta como verdadera.
- **Sin límite de tiempo por acción:** un `click()` sobre un elemento que ya no existe espera hasta agotar los 45 s de la prueba. Por ejemplo, un segundo «Terminar» cuando el `confirm` ya se aceptó solo.
- **Tras «Volver»:** si la prueba empezó en `/`, la URL queda sin `#/`. Comprueba el encabezado, no la URL.
- **Cambiar solo el hash** no recarga la página: el estado de los módulos, como `pendingReload`, se mantiene.
- **Si cambia un texto visible**, busca antes las pruebas que lo usan (`grep -rn "texto" tests/e2e`). Por ejemplo, las mayúsculas pixel van sin tilde (`/Tir[óo]n/`).
- **`test.use()` no va dentro de un `test()`:** ponlo en un `test.describe` (por ejemplo, para cambiar `now`).
- **`seed()` solo siembra una vez por pestaña:** para dos estados distintos, haz dos pruebas (un `for` fuera de `test()`) o cambia el `localStorage` con `page.evaluate` y recarga.
- **`hasText` busca subcadenas:** «Dominadas» coincide con «Dominadas pecho a barra» (el primer paso del muscle-up). Para la ruta, usa `/^Dominadas ·/`.
- **Terminar un entreno:** valorar el último ejercicio no lo cierra. Pulsa `.session-head [data-action="session-finish"]` (o `session-finish` del pie).
- **Datos de rutas en las pruebas:** mira los pasos reales (`grep -n "key:" js/data/roadmaps.js`); los índices y las series cambiaron en la v17 (por ejemplo, la planche paso 3 es 3×20 s y el paso 2, 5×10 s).
- **`ASSETS` y el simulador:** si falta un archivo en `ASSETS` (por ejemplo, uno sin commit al copiar con `git ls-files` sin `--others`), la instalación del service worker falla y se queda la versión vieja. Lo detecta `tests/tools/simular-actualizacion.js`.
