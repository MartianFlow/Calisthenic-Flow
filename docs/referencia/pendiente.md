# Pendiente, ideas y huecos de pruebas

## Pendiente de confirmar con el usuario

Ver el final de `historial-usuario.md`: la versión 12 en su iPhone, el descanso, el botón de tema y las animaciones.

## Contenido

- **29 pasos sin vídeo.** Muestran un botón para buscar en YouTube. Se añaden en `js/data/videos.js`.
  - Todo `backlever` y toda `bisagra`.
  - `planche/straddle-banda`, `planche/straddle` y `planche/completa`.
  - `core/dead-bug`, `core/plancha`, `core/hollow-tuck` y `core/rueda`.
  - `fondos/asistidos`, `fondos/soporte-anillas` y `fondos/anillas`.
  - `dominadas/asistida-una-mano`, `pino/wall-walk`, `pino/rueda`, `hspu/cajon`, `lsit/pies-apoyados` y `frontlever/half-lay`.
- **Vídeos sin verificar:** los 87 de calistenia y los 9 de gimnasio se eligieron por el título que mostraba el buscador. Algunos pueden ser sin voz o no dejar incrustarse.
- **Investigación:** solo usó resúmenes de búsqueda. Los puntos dudosos están marcados `[criterio propio]` o `[sin fuente verificada]`.

## Limitaciones conocidas

- **Aviso sonoro del descanso:** solo suena con la app en pantalla. iOS suspende las PWA en segundo plano y no hay notificaciones push.
- **Pruebas en iPhone real:** cada función nueva solo se ha probado en emulación: Chromium en local y WebKit en CI.

## Ideas no hechas

- Que el pino (equilibrio, poca fatiga) no cuente para el límite de 2 habilidades por sesión.
- Un editor de ejercicios de gimnasio en la app. Ahora se cambian en `js/data/gym.js`.
- Superseries de antagonistas, que ahorrarían un 30–40 % de tiempo.
- Artículos de lectura sobre técnica. El usuario dijo «artículos» y se interpretó como objetos para equipar.
- Preguntar la dificultad por serie en vez de por ejercicio.

## Huecos de pruebas funcionales (la «serie de pruebas exhaustivas» que pidió)

La maquetación ya está cubierta (`layout.spec.js`). Queda esto:

- **Gimnasio, progresión:**
  - Consolidar en un multiarticular (hack o piernas rígidas en el tope con Difícil) frente a una máquina `failureOk`, que en el tope con Difícil sube.
  - `no-kg`: tope del rango sin peso apuntado.
  - Estancamiento de 3 sesiones: −10 % y vuelta al mínimo.
  - Descarga con ejercicios de gimnasio: una serie menos, −10 %, mínimo del rango y `outcome: deload`.
- **Gimnasio, interfaz:**
  - `set-add` copia el peso.
  - Botón «−» del peso.
  - Un peso no válido muestra un aviso.
  - Calentamiento de pierna y `warmupFull`.
  - Gráfica e historial de la ficha con 2 o más sesiones.
  - Editar el peso en la ficha.
- **Plan:**
  - Variantes de `gymDays` (2, 3, 4, 6 y 7 días, y días sueltos).
  - `nextDayType` sin plan semanal en modo gimnasio.
  - «Cambiar de día» TA → TB → P.
  - Volver a «Calistenia» recupera A/B.
  - Bienvenida eligiendo Gimnasio.
  - 3 objetivos rotando solo en los días de torso.
  - «Añadir ejercicio» con los de gimnasio.
- **Nivel:**
  - Los cortes del 30 % y el 60 %.
  - Que el modo gimnasio excluya `piernas` y `bisagra`.
  - La base de cada habilidad.
- **Gamificación:**
  - XP por subida de peso (+30).
  - Los logros `dia-pierna`, `pierna-25` y `mas-peso`.
  - El atributo Piernas con las subidas de peso.
  - El título «¡MÁS PESO!» en el resumen.
- **Datos:**
  - Exportar e importar con `lifts` y `theme`.
  - `normalize` con `lifts` o `theme` no válidos.
  - Sesiones antiguas `PA`/`PB` en el historial.
  - Calendario y progreso con ejercicios de gimnasio.
- **Tema:**
  - El script en línea de `index.html` aplica el tema antes de pintar.
  - `theme-color` en automático.
- **Actualización:**
  - El botón «Actualizar la app».
  - Que durante un entreno espere a salir de `/entreno`.
  - `tests/tools/simular-actualizacion.js` como prueba automática.
- **Movimiento reducido:** que la línea de la gráfica se vea.
- **Robustez:**
  - Cambio de semana y de año (semana ISO 53 o 1).
  - Sesiones de más de 3 h.
  - Historial grande, con cientos de sesiones.
