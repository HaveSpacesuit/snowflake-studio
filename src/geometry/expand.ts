// Re-expands a design that no longer reaches the paper's outer edge.
//
// Cuts that trim the outer (top) edge of the folded wedge leave a gap between
// the design and the paper's rim, so the unfolded snowflake comes out smaller
// than the paper allows. Scaling the whole design uniformly about the apex
// grows it as far as the wedge allows while keeping its proportions. The apex
// is the snowflake's centre and both fold lines pass through it, so scaling
// about it keeps every point that touches a fold line on that line and the
// unfolded copies still join up.

import { APEX, EXPAND_TO_FILL_MIN_GAP, FOLD_BASE, FOLD_HEIGHT, GEOM_GRID } from "../constants.ts";
import { getGeomBounds, normalizeGeom } from "./polygon.ts";
import { normalizeSideCount } from "../snowflake/options.ts";

/**
 * The uniform scale about the apex that lets the design's highest point just
 * reach the outer edge, or 1 when it already reaches it. Only the outer edge
 * limits growth because scaling about the apex never leaves the fold lines.
 */
export function getExpandToFillScale(geom) {
  const bounds = getGeomBounds(geom);
  if (!bounds || !(bounds.minY - FOLD_BASE.y > EXPAND_TO_FILL_MIN_GAP)) return 1;
  const reach = APEX.y - bounds.minY;
  return reach > 0 ? FOLD_HEIGHT / reach : 1;
}

function scalePointAboutApex(x, y, scale, halfAngle) {
  const dx = x - APEX.x;
  const dy = y - APEX.y;
  const scaledY = APEX.y + dy * scale;

  // Vertices on a fold line must end up exactly on it. Grid rounding leaves
  // them up to half a grid step off, and scaling would magnify that past the
  // tolerance buildUnfoldedGeom uses to recognise fold vertices
  // (transformFoldPoint), leaving a slit between mirrored copies that would be
  // stroked as a cut. Keeping the scaled height also keeps the highest vertex
  // exactly on the outer edge.
  if (Math.abs(dx) <= GEOM_GRID && dy <= 0) return [APEX.x, scaledY];
  if (Math.abs(dx * Math.cos(halfAngle) + dy * Math.sin(halfAngle)) <= GEOM_GRID) {
    return [APEX.x + (APEX.y - scaledY) * Math.tan(halfAngle), scaledY];
  }
  return [APEX.x + dx * scale, scaledY];
}

/**
 * Grow `geom` about the apex until it touches the outer edge again. Returns
 * the geometry to keep and the scale that was applied (1, with `geom` returned
 * unchanged, when there is nothing to expand).
 */
export function expandGeomToFill(geom, sideCount) {
  const scale = getExpandToFillScale(geom);
  if (scale <= 1) return { geom, scale: 1 };

  const halfAngle = Math.PI / normalizeSideCount(sideCount);
  const expanded = normalizeGeom(geom.map((polygon) =>
    polygon.map((ring) => ring.map(([x, y]) => scalePointAboutApex(x, y, scale, halfAngle)))
  ));
  return expanded.length > 0 ? { geom: expanded, scale } : { geom, scale: 1 };
}
