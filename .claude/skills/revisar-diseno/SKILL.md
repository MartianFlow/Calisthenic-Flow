---
name: revisar-diseno
description: Revisar y corregir el diseño de Calisthenic Flow en tamaños de iPhone. Úsala cuando el usuario diga que algo se ve mal, se corta o se solapa, o al cambiar o añadir una pantalla, un estado o estilos. Usa la auditoría automática con capturas (tests/tools/auditar-diseno.js), las hojas de capturas para revisarlas a mano, la prueba layout.spec.js y las reglas de maquetación de docs/referencia/diseno.md.
---

# Revisar el diseño en móvil

Las reglas que hay que respetar al escribir CSS o HTML están en `docs/referencia/diseno.md`. Léelas antes de tocar estilos.

## Herramientas (`tests/tools/`)

| Archivo | Qué hace |
|---|---|
| `escenarios-diseno.js` | 170 pantallas y estados, cada uno con su estado guardado, ruta y pasos (`setup`). Incluye usuario nuevo, usuario con historial, gimnasio, ejercicios propios (`propios-*`), formas de dividir la semana y superseries (`division-*`, `superseries-*`), pasar de ejercicio (`pasar-*`: pide peso, saltado, falta valorar), cada paso de la bienvenida (`wizTo`), cada fase del entreno y los modales. |
| `comprobar-diseno.js` | Las comprobaciones dentro de la página. Ver la lista de abajo. |
| `auditar-diseno.js` | Recorre los escenarios y escribe `test-results/diseno/informe.txt` y una captura por pantalla. |
| `hoja-capturas.py` | Junta 3 o 4 capturas en una imagen para revisarlas de un vistazo. |

Problemas que detecta `comprobar-diseno.js`:
- `scroll-x`: la página se desplaza en horizontal, y nombra al elemento culpable;
- `off-screen`: algo se sale por un lado de la pantalla;
- `spill`: un texto, un icono o una caja se sale de la caja que lo contiene;
- `cut`: un texto queda recortado;
- `overlap`: dos textos se pisan;
- `hidden-fixed`: algo queda siempre tapado por una barra fija;
- `contrast`: el contraste es menor que 3:1.

En el iPhone la letra es San Francisco, que aquí no existe. Las herramientas la sustituyen por Inter, que mide muy parecido, para no esconder desbordes.

## Procedimiento

1. **Auditoría:**
   ```bash
   node tests/tools/auditar-diseno.js                    # 320, 375, 390 y 430 px, claro y oscuro (~1 min)
   node tests/tools/auditar-diseno.js --anchos=375 --temas=dark --solo=entreno   # rápido, solo unos escenarios
   node tests/tools/auditar-diseno.js test-results/diseno-notch --notch          # app instalada con notch (47/34 px)
   ```
   - Opciones:
     - `--anchos=`: los anchos a comprobar;
     - `--temas=dark,light`: los temas;
     - `--capturas=375,390`: de qué anchos guardar capturas;
     - `--solo=texto,otro`: solo los escenarios cuyo nombre contenga alguno de los textos (separados por comas);
     - `--notch`: simula la app instalada con notch.
   - Lee `informe.txt`: cada problema sale una vez, con los anchos donde aparece.
2. **Revisión a mano.** Hay fallos que no se detectan solos: nombres con una palabra por línea, columnas apretadas o letras que se ven mal.
   ```bash
   cd test-results/diseno && python3 ../../tests/tools/hoja-capturas.py <scratchpad>/hoja.png 1400 hoy__375-dark.png hoy-editando__375-dark.png hoy__320-dark.png
   ```
   - Mira la hoja con Read.
   - Revisa como mínimo Hoy (y editando), el entreno (isometría, gimnasio, descanso, valorar y último ejercicio), Ajustes, Héroe, Progreso y el calendario. Para las pantallas apretadas, también a 320 px.
3. **Corregir** siguiendo `docs/referencia/diseno.md`. Repite la auditoría hasta llegar a «0 problemas distintos».
4. **Pantalla o estado nuevo:** añádelo a `escenarios-diseno.js`. Así lo cubre también `layout.spec.js`, que revisa los escenarios a los 4 anchos en cada push, en Chromium y en WebKit.
5. **Publicar** con la skill `publicar`. Revisa WebKit en CI: ya encontró un fallo de Safari que Chromium no mostraba.

## Pistas falsas conocidas (ya filtradas)

- El contenido de un `<details>` cerrado tiene posiciones aunque no se pinta.
- **No es una pista falsa filtrada:** un texto oculto para lectores de pantalla (recortado con `clip`) sale como `cut`. No lo uses; pon `aria-label` en el campo o el botón.
- Las insignias con `position: absolute` sobresalen a propósito, como la ★ del día recomendado.
- El texto con `-webkit-line-clamp` o `text-overflow: ellipsis` se recorta a propósito.
- En las capturas de página entera, la auditoría oculta la tab bar, porque si no saldría a media página.
- En esas capturas, la cabecera y el botón de la bienvenida (`position: sticky`) también salen a media página o encima del contenido. En el iPhone van arriba y abajo de la pantalla.
- La auditoría y las pruebas desactivan las animaciones. Lo animado lo cubre `tests/e2e/motion.spec.js` (ver `diseno.md`, «Animaciones»).

## Trucos

- **Datos de prueba:** siémbralos antes de que cargue la app, con `addInitScript`. Si no, la app redirige a `#/bienvenida` y al recargar se queda allí.
- **Depurar un caso concreto:** un script de Playwright con `page.evaluate` que imprima anchos y estilos (`getBoundingClientRect`, `getComputedStyle`) de los elementos sospechosos.
- **Si solo falla en WebKit (CI):** piensa en diferencias de Safari, como `select`, `text-wrap`, `:has()` o `aspect-ratio`. Mejora el mensaje de la prueba si no basta para diagnosticar.
