# Historial del usuario: qué ha pedido y qué está pendiente

El contexto de la persona y de sus peticiones. Las decisiones técnicas que salen de aquí están en los demás documentos de `docs/referencia/`.

## Quién es y qué quiere

- Habla **español**: la interfaz, los textos, los commits y las respuestas van en español.
- Es una app **personal** de calistenia para su **iPhone**, en lugar de una app de suscripción (Calisteniapp). No quiere pagar suscripción ni cuenta de desarrollador de Apple.
- **Privacidad:** «solo yo puedo ver mis datos». Se cumple porque todo vive en el `localStorage` del iPhone: no hay servidor, ni cuentas, ni datos en GitHub.
- **Usa la app de verdad en su iPhone**, instalada en la pantalla de inicio desde GitHub Pages.
  - En una captura suya se ve el tema oscuro y el plan con «Pierna» el lunes y descanso el martes, así que tiene sus propios días configurados.
- Se considera **avanzado**. Entrena 5 días por semana, 2 de ellos de pierna en el gimnasio.

## Lo que pidió, en orden

1. Progresiones por habilidad tipo hoja de ruta, y tiempo de entreno.
2. Calendario con los días entrenados.
3. Valoración Fácil / Normal / Difícil de cada ejercicio, **preguntada durante el descanso**.
4. Investigación exhaustiva sobre cómo progresar (ver `docs/investigacion-*.md`).
5. Un vídeo de YouTube por ejercicio.
6. Diseño de cómic de alto contraste inspirado en Hi-Fi Rush, con animaciones.
7. Gamificación: logros, artículos y un personaje que mejora.
8. Plan semanal recomendado según sus objetivos.
9. Pruebas e2e.
10. Héroe, artículos y logros en **pixel art estilo Zelda**.
    - Se hizo un estilo RPG retro **original**, sin copiar elementos de Zelda: ni rupias, ni Trifuerza, ni la ropa de Link.
11. Nivel sin el mínimo de 8 entrenos y contando las habilidades.
12. **Pierna en el gimnasio**, con 5 días de entreno y 2 de pierna.
    - Su rutina de pierna, que hace **completa en cada día de pierna**: sentadilla hack, peso muerto **piernas rígidas**, sentadilla goblet en hack, extensión de cuádriceps, curl femoral, aductor, abductor, gemelo de pie y gemelo sentado.
    - Primero se repartió en Pierna A y B. Tras su respuesta, es un solo día «Pierna» (tipo `P`) dos veces por semana; el torso es Torso A / Torso B.
    - Preguntó cuántos objetivos de calistenia tener a la vez. Respuesta: 2 de fuerza, uno de empuje y otro de tirón; el pino puede ser un tercero porque cansa poco.
13. **Modo noche:** en su iPhone no cambiaba. Se añadió en Ajustes un selector de tema (Automático / Claro / Oscuro). En su captura ya se ve oscuro.
14. **Ver un ejercicio sin empezar el entreno.**
    - Los ejercicios de Hoy y del Plan semanal son enlaces.
    - Los de calistenia van a `#/ruta/:id`, que muestra arriba el vídeo y las claves del paso actual.
    - Los de gimnasio van a `#/ejercicio/:id`: vídeo, objetivo, peso editable, claves e historial con la gráfica del peso.
15. **«Toco el ejercicio y no pasa nada».** Era la versión antigua guardada en su iPhone.
    - Se cambió la forma de actualizar en la versión 9 (ver `arquitectura.md`, «Actualizaciones»).
16. Una **serie de pruebas exhaustivas**. La maquetación ya está hecha; los huecos funcionales siguen pendientes (ver `pendiente.md`).
17. **«Hay cosas que no se ven bien o se solapan» en el móvil** (versiones 10 y 11).
    - Se auditaron todas las pantallas a 320, 375, 390 y 430 px, en claro, oscuro y con notch.
    - **Fallos corregidos:**
      - «Empezar entreno» cortaba su texto y su icono.
      - El ✓ de las series se salía de la tarjeta.
      - «Finalizar entreno» no cabía.
      - Al editar el plan de Hoy, los textos se montaban.
      - «Automático» se salía de su botón y el candado de Ajustes partía la línea.
      - Las mayúsculas pixel con tilde parecían minúsculas («TIRóN»).
      - El detalle del calendario y las duraciones largas se partían mal.
      - A 320 px se salían los días de la semana.
      - En Safari, el texto largo de un desplegable ensanchaba la página.
    - **También se cambió:**
      - el objetivo compacto en Hoy («3 × 8» y debajo «seg /lado»);
      - «Última vez» con la unidad una sola vez;
      - en el calentamiento, la cantidad bajo el nombre;
      - en la ficha de gimnasio, el objetivo «3 × 8 con 120 kg»;
      - en el historial de gimnasio, el peso una sola vez;
      - el botón de las rutas, que ahora dice «Es mi nivel actual».
18. Documentar lo de valor antes de compactar, y luego **acortar CLAUDE.md**: dejarlo general y llevar el detalle a skills y documentos de referencia, como está ahora.

## Pendiente de confirmar con el usuario

- Que en Ajustes ve **«versión 11»**. Se le pidió cerrar la app del todo y abrirla otra vez.
- Que el diseño ya se ve bien en su iPhone. Si algo sigue mal, **pedirle una captura**: el emulador no es el iPhone real.
