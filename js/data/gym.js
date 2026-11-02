// Pierna en el gimnasio: ejercicios con carga (kg) y los dos días de pierna.
//
// Progresión doble con carga: cada ejercicio tiene un rango de repeticiones. Se
// empieza abajo del rango y se suben repeticiones según la valoración; cuando
// todas las series llegan al tope del rango, se sube el peso (`inc`) y se vuelve
// al mínimo del rango. Fuentes y justificación: docs/investigacion-pierna-gym.md
//
// Campos:
//   id, name   – identificador estable y nombre
//   muscle     – músculos principales (se muestra en el entreno)
//   sets       – series efectivas (un día de pierna puede usar otro número: LEG_DAYS.sets)
//   min, max   – rango de repeticiones por serie
//   inc        – subida de peso en kg al completar el rango
//   rest       – descanso entre series en segundos
//   rir        – repeticiones en reserva recomendadas
//   failureOk  – máquina de aislamiento: llegar al fallo (Difícil) en el tope del
//                rango también sube el peso. En los multiarticulares, «Difícil»
//                en el tope obliga a consolidar antes de subir.
//   cues       – claves técnicas

export const LIFTS = [
  {
    id: 'hack', name: 'Sentadilla hack', muscle: 'Cuádriceps, glúteo y aductores',
    sets: 4, min: 6, max: 10, inc: 5, rest: 180, rir: '1–2',
    cues: [
      'Pies a la anchura de los hombros; cuanto más abajo en la plataforma, más cuádriceps.',
      'Baja profundo: pasar de la paralela trabaja más glúteo y aductores que media sentadilla.',
      'Talones, cadera y espalda pegados; sube empujando con todo el pie.',
    ],
  },
  {
    id: 'peso-muerto', name: 'Peso muerto', muscle: 'Isquios, glúteo y espalda',
    sets: 3, min: 5, max: 8, inc: 5, rest: 180, rir: '2–3',
    cues: [
      'Barra pegada a las piernas durante todo el recorrido; espalda neutra.',
      'En la versión rumana (rodillas casi rectas, bajas hasta notar el isquio) trabajan más los isquios.',
      'Nunca al fallo; usa straps si el agarre te limita, así llegas fresco a las dominadas.',
    ],
  },
  {
    id: 'goblet-hack', name: 'Sentadilla goblet en hack', muscle: 'Cuádriceps y glúteo',
    sets: 3, min: 10, max: 15, inc: 2, rest: 120, rir: '1–2',
    cues: [
      'Peso pegado al pecho y codos hacia abajo.',
      'Torso erguido; las rodillas avanzan siguiendo la punta de los pies.',
      'Baja lo más profundo que puedas sin redondear la espalda, en 2–3 s.',
    ],
  },
  {
    id: 'extension', name: 'Extensión de cuádriceps', muscle: 'Cuádriceps (recto femoral)',
    sets: 3, min: 10, max: 15, inc: 2.5, rest: 90, rir: '0–1', failureOk: true,
    cues: [
      'Rodilla alineada con el eje de giro de la máquina; respaldo reclinado si se puede.',
      'Extiende del todo y aprieta 1 s arriba.',
      'Baja controlando hasta la flexión máxima: la parte estirada también cuenta.',
    ],
  },
  {
    id: 'curl-femoral', name: 'Curl femoral en máquina', muscle: 'Isquiotibiales',
    sets: 3, min: 8, max: 12, inc: 2.5, rest: 90, rir: '0–1', failureOk: true,
    cues: [
      'Mejor la versión sentada que la tumbada: hace crecer más el isquio.',
      'Cadera fija contra el asiento o el banco; no la levantes para ayudarte.',
      'Baja lento hasta casi extender la rodilla.',
    ],
  },
  {
    id: 'aductor', name: 'Aductor en máquina', muscle: 'Aductores',
    sets: 3, min: 10, max: 15, inc: 5, rest: 90, rir: '1', failureOk: true,
    cues: [
      'Abre hasta un estiramiento cómodo, sin rebotar.',
      'Cierra apretando 1 s.',
      'Complementa a la sentadilla profunda, que ya trabaja mucho el aductor mayor.',
    ],
  },
  {
    id: 'abductor', name: 'Abductor en máquina', muscle: 'Glúteo medio',
    sets: 3, min: 12, max: 20, inc: 5, rest: 75, rir: '0–1', failureOk: true,
    cues: [
      'Abre controlando y aguanta 1 s fuera.',
      'Vuelve despacio, sin dejar que choquen las placas.',
      'Inclinarte un poco hacia delante implica más glúteo.',
    ],
  },
  {
    id: 'gemelo-pie', name: 'Gemelo de pie', muscle: 'Gemelos (gastrocnemio y sóleo)',
    sets: 4, min: 8, max: 12, inc: 5, rest: 75, rir: '0–1', failureOk: true,
    cues: [
      'Rodillas casi estiradas: así trabaja el gastrocnemio, la parte más visible.',
      'Baja hasta el máximo estiramiento y pausa 2 s abajo.',
      'Sube del todo, sin rebotar.',
    ],
  },
  {
    id: 'gemelo-sentado', name: 'Gemelo sentado', muscle: 'Sóleo',
    sets: 3, min: 10, max: 15, inc: 5, rest: 60, rir: '0–1', failureOk: true,
    cues: [
      'Con la rodilla doblada trabaja sobre todo el sóleo.',
      'Pausa abajo en estiramiento.',
      'Recorrido completo y lento.',
    ],
  },
];

export const LIFT_BY_ID = Object.fromEntries(LIFTS.map((l) => [l.id, l]));

// Dos días de pierna. Cada músculo se trabaja las dos veces, y los dos ejercicios
// más pesados (hack y peso muerto) van en días distintos (Belcher 2019: la sentadilla
// y el peso muerto pesados tardan hasta 96 h en recuperarse del todo).
// `sets` cambia el número de series de un ejercicio solo en ese día.
export const LEG_DAYS = {
  PA: {
    label: 'Pierna A', badge: 'PA', focus: 'Cuádriceps y aductores · Isquios · Gemelo de pie',
    ids: ['hack', 'extension', 'curl-femoral', 'aductor', 'gemelo-pie'],
  },
  PB: {
    label: 'Pierna B', badge: 'PB', focus: 'Cadena posterior y glúteo · Cuádriceps · Sóleo',
    ids: ['peso-muerto', 'goblet-hack', 'curl-femoral', 'extension', 'abductor', 'gemelo-sentado'],
    sets: { extension: 2 },
  },
};

// Calentamiento de los días de pierna (sustituye al de calistenia, que es de muñecas y hombros).
export const LEG_WARMUP = [
  { name: 'Bici, elíptica o cinta suave', detail: '5 min' },
  { name: 'Movilidad de tobillo: rodilla hacia la pared', detail: '10 por lado' },
  { name: 'Balanceos de pierna adelante-atrás y laterales', detail: '10 por lado' },
  { name: 'Sentadilla profunda con pausa, sin peso', detail: '8 reps' },
  { name: 'Puente de glúteo', detail: '15 reps' },
  { name: 'Series de aproximación del primer ejercicio: ~50 % × 8, ~70 % × 4, ~85 % × 2', detail: 'antes del 1.er ejercicio' },
];
