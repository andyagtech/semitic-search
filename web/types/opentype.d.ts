// Ambient type shim for opentype.js. We use only a tiny surface, so rather
// than pull in the full @types/opentype.js DefinitelyTyped package, we
// declare the module as 'any'-shaped and enforce the subset locally in
// FontLab.tsx via a hand-written interface.
declare module "opentype.js";
