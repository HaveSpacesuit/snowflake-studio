// Maps the editor's folded-wedge geometry (in canvas pixel units) onto the
// printed square's top wedge (between the two trisection fold lines).
//
// The editor wedge is anchored at APEX (bottom point) with FOLD_BASE directly
// above it and outerBase up-and-to-the-right. On the print sheet, the wedge's
// apex is the square's center. To keep the printed wedge visually aligned
// with the editor's wedge (same handedness, not mirrored), FOLD_BASE maps to
// the LEFT trisection ray and outerBase maps to the RIGHT trisection ray;
// this is a pure rotation (no mirroring) of the editor wedge.

import { APEX, FOLD_BASE } from "../constants.ts";
import { getOuterBaseForSideCount } from "./paper.ts";

// A perpendicular-distance tolerance (in editor pixels), not a raw cross-product
// threshold: the cross product's magnitude scales with segment length, so a raw
// threshold can wrongly reject points on very long segments even when they're a
// fraction of a pixel off the line (e.g. from grid-snapping in cleanRing).
const COLLINEAR_DIST_EPS = 0.5;

function isPointOnSegment(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  const cross = dx * (point[1] - a[1]) - dy * (point[0] - a[0]);
  if (lenSq > 0 && (cross * cross) / lenSq > COLLINEAR_DIST_EPS * COLLINEAR_DIST_EPS) return false;
  const dot = (point[0] - a[0]) * dx + (point[1] - a[1]) * dy;
  return dot >= -COLLINEAR_DIST_EPS && dot <= lenSq + COLLINEAR_DIST_EPS;
}

/**
 * True if the given edge lies entirely along one of the wedge's two straight
 * fold edges (APEX-FOLD_BASE or APEX-outerBase) and hasn't been touched by a
 * cut. Such edges are already drawn as fold lines and shouldn't be re-drawn
 * as solid cut lines.
 */
export function isUncutFoldEdge(p1, p2, apex, foldBase, outerBase) {
  const apexPt = [apex.x, apex.y];
  const foldBasePt = [foldBase.x, foldBase.y];
  const outerBasePt = [outerBase.x, outerBase.y];
  const onFoldBaseLeg = isPointOnSegment(p1, apexPt, foldBasePt) && isPointOnSegment(p2, apexPt, foldBasePt);
  const onOuterBaseLeg = isPointOnSegment(p1, apexPt, outerBasePt) && isPointOnSegment(p2, apexPt, outerBasePt);
  return onFoldBaseLeg || onOuterBaseLeg;
}

/**
 * Build an `[x, y] -> [x, y]` transform mapping editor wedge points onto the
 * print square's top wedge, for the given print square size (in mm) and
 * trisection angle (in degrees, measured from the vertical center line).
 * `edgeInset` shortens the wedge from the paper edge toward its fixed center.
 */
export function createPrintWedgeTransform(sideCount, squareSize, trisectAngleDeg, edgeInset = 0) {
  const outerBase = getOuterBaseForSideCount(sideCount);
  const distApexOuterBase = Math.hypot(outerBase.x - APEX.x, outerBase.y - APEX.y);

  const half = squareSize / 2;
  const wedgeHeight = half - edgeInset;
  const trisectTan = Math.tan((trisectAngleDeg * Math.PI) / 180);
  const rayLength = Math.hypot(wedgeHeight * trisectTan, wedgeHeight);
  const scale = rayLength / distApexOuterBase;

  const rotation = -(trisectAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return (point) => {
    const x = point[0] - APEX.x;
    const y = point[1] - APEX.y;
    const rx = (x * cos - y * sin) * scale;
    const ry = (x * sin + y * cos) * scale;
    return [rx + half, ry + half];
  };
}
