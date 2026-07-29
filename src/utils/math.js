// Small numeric helpers shared across the geometry and animation code.

/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Uniform random number in [min, max). */
export function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** Euclidean distance between two `{x, y}` points. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
