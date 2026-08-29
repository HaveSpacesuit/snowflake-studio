// Pure polygon/multi-polygon helpers.
//
// Geometry is represented as a GeoJSON-style multi-polygon: an array of
// polygons, where each polygon is an array of rings, and each ring is an array
// of `[x, y]` coordinate pairs. The first ring of a polygon is its outer
// boundary; any following rings are holes.

import { CLEAN_EPS, GEOM_GRID } from "../constants.ts";
import { clamp } from "../utils/math.ts";

/** Deep-clone geometry (safe because it is plain arrays of numbers). */
export function cloneGeom(geom) {
  return JSON.parse(JSON.stringify(geom));
}

function quantize(value) {
  return Math.round(value / GEOM_GRID) * GEOM_GRID;
}

function samePoint(a, b) {
  return Math.abs(a[0] - b[0]) <= CLEAN_EPS && Math.abs(a[1] - b[1]) <= CLEAN_EPS;
}

/**
 * Snap a ring to the geometry grid, drop duplicate and collinear vertices, and
 * return `null` if fewer than three meaningful points remain.
 */
export function cleanRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const quantized = ring
    .filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
    .map((pt) => [quantize(pt[0]), quantize(pt[1])]);

  if (quantized.length < 3) return null;

  const deduped = [];
  for (const pt of quantized) {
    if (deduped.length === 0 || !samePoint(deduped[deduped.length - 1], pt)) {
      deduped.push(pt);
    }
  }

  if (deduped.length > 2 && samePoint(deduped[0], deduped[deduped.length - 1])) {
    deduped.pop();
  }

  if (deduped.length < 3) return null;

  let changed = true;
  while (changed && deduped.length >= 3) {
    changed = false;
    for (let i = 0; i < deduped.length; i += 1) {
      const prev = deduped[(i - 1 + deduped.length) % deduped.length];
      const curr = deduped[i];
      const next = deduped[(i + 1) % deduped.length];

      const cross = (curr[0] - prev[0]) * (next[1] - curr[1]) - (curr[1] - prev[1]) * (next[0] - curr[0]);
      if (Math.abs(cross) <= CLEAN_EPS) {
        deduped.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return deduped.length >= 3 ? deduped : null;
}

export function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

export function polygonArea(polygon) {
  if (!polygon || polygon.length === 0) return 0;
  let area = Math.abs(ringSignedArea(polygon[0]));
  for (let i = 1; i < polygon.length; i += 1) {
    area -= Math.abs(ringSignedArea(polygon[i]));
  }
  return Math.max(0, area);
}

/** Total filled area of a multi-polygon (outer rings minus holes). */
export function geomArea(multiPolygon) {
  let total = 0;
  for (const polygon of multiPolygon) {
    total += polygonArea(polygon);
  }
  return total;
}

/** Clean every ring in the geometry, dropping empty polygons. */
export function normalizeGeom(geom) {
  if (!Array.isArray(geom)) return [];
  const out = [];
  for (const polygon of geom) {
    if (!Array.isArray(polygon) || polygon.length === 0) continue;
    const polyOut = [];
    for (const ring of polygon) {
      const clean = cleanRing(ring);
      if (clean) polyOut.push(clean);
    }
    if (polyOut.length > 0) out.push(polyOut);
  }
  return out;
}

/** Convert a list of `[x, y]` points into an SVG polyline path string. */
export function pointsToPath(points) {
  if (!points || points.length === 0) return "";
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)}`;
  }
  return d;
}

/** Convert a multi-polygon into a closed SVG fill path string. */
export function multiPolygonToPath(geom) {
  if (!geom || geom.length === 0) return "";
  let d = "";
  for (const polygon of geom) {
    for (const ring of polygon) {
      if (!ring || ring.length < 3) continue;
      d += pointsToPath(ring) + " Z ";
    }
  }
  return d.trim();
}

// ---------------------------------------------------------------------------
// Point / boundary queries
// ---------------------------------------------------------------------------

export function pointToSegmentDistance(pt, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = pt.x - a[0];
  const wy = pt.y - a[1];
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(pt.x - a[0], pt.y - a[1]);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(pt.x - b[0], pt.y - b[1]);
  const t = c1 / c2;
  const px = a[0] + t * vx;
  const py = a[1] + t * vy;
  return Math.hypot(pt.x - px, pt.y - py);
}

export function closestPointOnSegment(pt, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const c2 = vx * vx + vy * vy;
  if (c2 <= 1e-12) {
    return { x: a[0], y: a[1], distance: Math.hypot(pt.x - a[0], pt.y - a[1]) };
  }
  const wx = pt.x - a[0];
  const wy = pt.y - a[1];
  const t = clamp((vx * wx + vy * wy) / c2, 0, 1);
  const x = a[0] + t * vx;
  const y = a[1] + t * vy;
  return { x, y, distance: Math.hypot(pt.x - x, pt.y - y) };
}

/** Move `pt` onto the nearest boundary point if it is within `tolerance`. */
export function snapPointToBoundaryIfClose(pt, geom, tolerance) {
  let best = null;
  for (const polygon of geom) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const candidate = closestPointOnSegment(pt, a, b);
        if (!best || candidate.distance < best.distance) best = candidate;
      }
    }
  }

  if (!best || best.distance > tolerance) return pt;
  return { x: best.x, y: best.y };
}

/** Snap only the first and last point of a cut path toward the boundary. */
export function snapCutEndsIfClose(points, geom, tolerance) {
  if (!Array.isArray(points) || points.length < 2) return points;
  const snapped = points.slice();
  snapped[0] = snapPointToBoundaryIfClose(snapped[0], geom, tolerance);
  const lastIndex = snapped.length - 1;
  snapped[lastIndex] = snapPointToBoundaryIfClose(snapped[lastIndex], geom, tolerance);
  return snapped;
}

export function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** True if `pt` is inside the filled area (outer ring, but not a hole). */
export function pointInGeom(pt, geom) {
  for (const polygon of geom) {
    if (!polygon || polygon.length === 0) continue;
    if (!pointInRing(pt, polygon[0])) continue;
    let inHole = false;
    for (let i = 1; i < polygon.length; i += 1) {
      if (pointInRing(pt, polygon[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

export function distanceToBoundary(pt, geom) {
  let best = Infinity;
  for (const polygon of geom) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const d = pointToSegmentDistance(pt, a, b);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

export function getGeomBounds(geom) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of geom) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Centre point and a display scale that fits the geometry comfortably inside
 * the canvas. Used to frame the unfolded snowflake and background flakes.
 */
export function computeGeomCenter(geom, displayWidth, displayHeight) {
  const bounds = getGeomBounds(geom);
  if (!bounds) return { x: displayWidth / 2, y: displayHeight / 2, scale: 1 };
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const w = Math.max(1, bounds.width);
  const h = Math.max(1, bounds.height);
  const scale = 0.62 * Math.min(displayWidth / w, displayHeight / h);
  return { x: cx, y: cy, scale };
}
