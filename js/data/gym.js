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
    sets: 3, min: 6, max: 10, inc: 5, rest: 180, rir: '1–2',
    cues: [
      'Pies a la anchura de los hombros; cuanto más abajo en la plataforma, más cuádriceps.',
      'Baja profundo: pasar de la paralela trabaja más glúteo y aductores que media sentadilla.',
      'Talones, cadera y espalda pegados; sube empujando con todo el pie.',
    ],
  },
  {
    id: 'peso-muerto', name: 'Peso muerto piernas rígidas', muscle: 'Isquios y glúteo',
    sets: 3, min: 6, max: 10, inc: 5, rest: 180, rir: '2–3',
    cues: [
      'Rodillas casi rectas (un poco desbloqueadas) y cadera hacia atrás, como cerrando una puerta con el culo.',
      'Barra pegada a las piernas y espalda neutra: baja solo hasta donde notes el isquio sin redondear la lumbar.',
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
    sets: 3, min: 8, max: 12, inc: 5, rest: 75, rir: '0–1', failureOk: true,
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

// Día de pierna: la rutina completa del usuario, dos veces por semana y siempre en
// el mismo orden (multiarticulares primero). Mismo orden = rendimiento comparable
// entre sesiones, que es lo que necesita la progresión por peso.
// Por sesión: cuádriceps 9 series, isquios 6, gemelos 6 → por debajo del tope de
// ~11 por músculo y sesión; por semana 18 / 12 / 12, dentro de 10–20.
// `sets` (opcional) cambia el número de series de un ejercicio solo en ese día.
export const LEG_DAYS = {
  P: {
    label: 'Pierna', badge: 'P', focus: 'Rutina completa: cuádriceps, isquios, glúteo, aductores y gemelos',
    ids: ['hack', 'peso-muerto', 'goblet-hack', 'extension', 'curl-femoral', 'aductor', 'abductor', 'gemelo-pie', 'gemelo-sentado'],
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
