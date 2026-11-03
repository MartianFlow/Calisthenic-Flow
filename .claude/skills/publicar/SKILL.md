---
name: publicar
description: Publicar un cambio de Calisthenic Flow en el iPhone del usuario. Sube la versión, pasa las pruebas, hace commit y push a main, espera a CI (Chromium y WebKit) y a GitHub Pages, y explica al usuario cómo verlo. Úsala siempre que cambie código de la app (js, css, html, sw.js) y haya que dejarlo publicado.
---

# Publicar un cambio

El usuario usa la app instalada desde GitHub Pages en su iPhone. Todo cambio de la app termina publicado en `main`, sin pull request.

## 1. Antes del commit

1. **Sube la versión en los dos sitios**, con el mismo número: `VERSION` de `sw.js` y `APP_VERSION` de `js/version.js` (`cf-vN` → `cf-vN+1`).
   - Sin esto, la app abierta no se recarga sola al volver a ella.
   - `data.spec.js` falla si no coinciden.
2. **Archivos nuevos de la app** (js, css, fuentes, iconos): añádelos a `ASSETS` de `sw.js`. Si falta uno, la instalación del service worker falla entera y el usuario se queda con la versión vieja.
3. **Pruebas:** `npx playwright test --project=iphone-chromium`. Tienen que pasar todas.
   - Si cambió una pantalla, sigue también la skill `revisar-diseno`.
   - Si cambió una regla, añade o ajusta su prueba (skill `pruebas-e2e`).
4. **Si se tocó el service worker o la actualización:** ejecuta `node tests/tools/simular-actualizacion.js`. Tiene que terminar en «RESULTADO: OK».

## 2. Commit y push

- Mensaje en **español**: un título corto y, debajo, qué cambia para el usuario. Termina con las líneas de atribución que indique el sistema.
- Sin identificadores de modelo en el commit ni en el código.
- `git push -u origin main`.

## 3. Esperar a CI y a Pages

CI tarda unos 5–6 minutos: unas 320 pruebas, las mismas en Chromium y en WebKit. Espera en segundo plano con este bucle (`run_in_background`), sin `sleep` encadenados:

```bash
SHA=$(git rev-parse HEAD)
for i in $(seq 1 90); do out=$(curl -s "https://api.github.com/repos/MartianFlow/Calisthenic-Flow/actions/runs?per_page=4&head_sha=$SHA" | python3 -c "
import sys,json
print(' | '.join(f\"{r['name']}:{r['status']}:{r['conclusion']}:{r['id']}\" for r in json.load(sys.stdin).get('workflow_runs',[])))"); if [ -n "$out" ] && ! echo "$out" | grep -q "in_progress\|queued\|waiting"; then echo "$out"; break; fi; sleep 20; done
```

- Tienen que salir en `success` tanto «Pruebas e2e» como «pages build and deployment».
- **Si falla**, lee el registro con la herramienta MCP `get_job_logs` (`run_id`, `failed_only: true`, `return_content: true`).
  - Los artefactos (capturas y trazas) no se pueden descargar desde aquí: el mensaje de la prueba tiene que bastar.
- **WebKit solo corre en CI** y es lo más parecido a Safari. Si solo falla WebKit, casi seguro es un fallo real del iPhone.
  - Ejemplo: el texto de un `select` que Safari no recortaba.
  - Corrígelo, no lo saltes.

## 4. Contárselo al usuario

- En español y sin jerga: qué cambió y qué verá.
- **Cómo actualizar:**
  - La app se actualiza sola al abrirla o al volver a ella.
  - Si no, que la cierre del todo desde el selector de apps y la vuelva a abrir.
  - En Ajustes, abajo, verá «versión N».
- Si hay algo que solo se puede comprobar en el iPhone real, pídele que lo mire o que mande una captura.
- Actualiza `docs/referencia/historial-usuario.md` con la petición y lo pendiente de confirmar.
