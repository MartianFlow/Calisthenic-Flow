// Versión de la app. Debe coincidir con VERSION de sw.js (lo comprueba una prueba e2e).
// Súbela en los dos sitios cada vez que publiques cambios: así el iPhone detecta
// la versión nueva y la app se recarga sola.
export const APP_VERSION = 'cf-v19';
export const versionLabel = () => APP_VERSION.replace('cf-v', 'versión ');
