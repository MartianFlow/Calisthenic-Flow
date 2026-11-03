---
name: pruebas-e2e
description: Escribir, ejecutar y depurar las pruebas Playwright de Calisthenic Flow (tests/e2e). Úsala al añadir pruebas, cuando una prueba falle en local o en CI (Chromium o WebKit), o para seguir con la serie de pruebas exhaustivas que pidió el usuario (huecos en docs/referencia/pendiente.md).
---

# Pruebas e2e

## Ejecutar

- `npm install` y luego `npx playwright test --project=iphone-chromium`. Tarda ~2 min con unas 170 pruebas.
- Para una sola: `npx playwright test tests/e2e/gym.spec.js -g "texto" --project=iphone-chromium --reporter=line`.
- **En este entorno** solo hay Chromium: `@playwright/test` 1.63.0 usa `/opt/pw-browsers`. **No** ejecutes `playwright install`.
- **WebKit** (el motor de Safari) solo corre en CI: `.github/workflows/e2e.yml`, que instala también `fonts-inter`. Para esperar a CI y leer los fallos, sigue la skill `publicar`.
  - La prueba sin conexión se salta en WebKit: `setOffline` con service worker da un error interno de Playwright.

## Qué hay

| Archivo | Pruebas |
|---|---|
| `onboarding.spec.js` (7) | Bienvenida paso a paso: portada; recorrido completo con experiencia, pierna, niveles, habilidades (las que domina y la que aprende), días, descanso y héroe; sin pasos de pierna en modo gimnasio; atrás, «Cambiar» y recargar a mitad; cambiar desde el resumen y volver a él; «Aún no domino ninguna» con recomendadas; importar una copia antigua (su objetivo pasa a foco) |
| `skills.spec.js` (18) | Foco y mantenimiento: conversión de `goals` con aviso; Ajustes (foco, mantener, máximo 2, «Aún no domino ninguna»); semana del usuario (pino el primero cada día, mantener 1–2 días y una por sesión); 5 días; brazos rectos sin días seguidos; back lever y planche nunca juntos; flexión de pino y muscle-up no seguidos; dosis de mantenimiento; «Solo pino» en descanso (no cuenta como entreno); recomendadas; básicos que le faltan al foco; propuesta al completar la ruta (con hueco y con 2); Rutas; sin plan semanal |
| `skill-training.spec.js` (15) | Complementarios: orden, sin valorar, sin progreso, historial y «Última vez»; uno en los primeros pasos y ninguno en mantener; preparación del back lever con cronómetro; pino; L-sit tras el core; jalón en lugar del remo en tuck. Alternancia con 80 s. Más series. Ficha con complementarios y plazos. «Fácil» en brazos rectos = 2 sesiones. Calentamiento extra (y tras recargar). Sustituir: dominadas −1 serie sin subir, muscle-up en lugar de dominadas en la semana, fondos −1 con flexión de pino |
| `rest.spec.js` (4) | Descanso fijo de 80 s por defecto con −15/+15; cambiarlo en Ajustes; «Según ejercicio»; valores raros corregidos al cargar |
| `motion.spec.js` (3) | **Con animaciones** (`reducedMotion: 'no-preference'`): pantallas visibles al terminar y sin scroll horizontal, pastilla de la pestaña, cabeceras fijas en el entreno y en la bienvenida |
| `workout.spec.js` (6) | Flujo completo con isometría, descanso, valoración y resumen; recargar a mitad; +/− y descartar; cuenta atrás de las isometrías (5 s, «+5 s», 10 s desde Ajustes) |
| `progression.spec.js` (8) | Fácil +2, Normal +1, Fácil en la meta sube de paso (en fuerza; en brazos rectos, ver `skill-training`), 2 pases en habilidades, recalibrado, reinicio al 80 %, descanso por paso («Según ejercicio») y fijo |
| `plan.spec.js` (12) | Recomendación a principiantes; nivel con habilidades; cambiar días; front lever sin días seguidos; día de descanso; «Misión cumplida»; mover un entreno de día y deshacerlo; mover el de hoy; cambios de otra semana ignorados; «Entrenar hoy»; elegir rutina en Hoy (al editar y en descanso) |
| `gym.spec.js` (9) | Semana L–V; 72 h entre piernas con el sábado; 5 días y 9 pesos; coma decimal; subida y bajada de peso; cambio de peso a mitad; ficha desde Hoy; ruta desde el Plan |
| `navigation.spec.js` (10) | 14 rutas; visor de vídeo; búsqueda sin vídeo; nivel a mano; calendario; progreso; pestañas; tema forzado oscuro y claro; botón de tema de las cabeceras |
| `gamification.spec.js` (5) | Héroe; logros al abrir; artículos bloqueados; apariencia y nombre; mini héroe |
| `deload.spec.js` (2) | Sugerencia por estancamiento y su efecto; «Ahora no» |
| `data.spec.js` (5) | Migración v1; exportar e importar; borrar datos; sin conexión (solo Chromium); misma versión en sw.js y version.js |
| `layout.spec.js` (121) | Diseño: todos los escenarios de `tests/tools/escenarios-diseno.js` a 320, 375, 390 y 430 px (ver la skill `revisar-diseno`) |

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

- **Reloj simulado:** con `page.clock.install`, `page.waitForFunction` y `page.waitForURL` pueden no avanzar tras un cambio de hash. Espera desde Node con un bucle de `page.evaluate` y `page.waitForTimeout`.
- **`page.waitForFunction` no espera a una función `async`:** la promesa cuenta como verdadera.
- **Sin límite de tiempo por acción:** un `click()` sobre un elemento que ya no existe espera hasta agotar los 45 s de la prueba. Por ejemplo, un segundo «Terminar» cuando el `confirm` ya se aceptó solo.
- **Tras «Volver»:** si la prueba empezó en `/`, la URL queda sin `#/`. Comprueba el encabezado, no la URL.
- **Cambiar solo el hash** no recarga la página: el estado de los módulos, como `pendingReload`, se mantiene.
- **Si cambia un texto visible**, busca antes las pruebas que lo usan (`grep -rn "texto" tests/e2e`). Por ejemplo, las mayúsculas pixel van sin tilde (`/Tir[óo]n/`).
- **`ASSETS` y el simulador:** si falta un archivo en `ASSETS` (por ejemplo, uno sin commit al copiar con `git ls-files` sin `--others`), la instalación del service worker falla y se queda la versión vieja. Lo detecta `tests/tools/simular-actualizacion.js`.
