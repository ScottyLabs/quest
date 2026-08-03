// Capacitor loads the bundle from the device filesystem, so there is no server
// to render against: prerender the shell and run purely client-side.
export const prerender = true;
export const ssr = false;
