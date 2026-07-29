// Geometry of the base folded paper: a single triangular wedge whose width is
// determined by the snowflake's side count. Folding and mirroring this wedge
// produces the full snowflake (see unfold.js).

import { APEX, FOLD_BASE, FOLD_HEIGHT } from "../constants.js";
import { normalizeGeom } from "./polygon.js";
import { normalizeSideCount } from "../snowflake/options.js";

/**
 * The outer base corner of the wedge for a given side count. A higher side
 * count means a narrower wedge.
 */
export function getOuterBaseForSideCount(sideCount) {
  const safeSideCount = normalizeSideCount(sideCount);
  const halfWedgeAngle = Math.PI / safeSideCount;
  return {
    x: APEX.x + FOLD_HEIGHT * Math.tan(halfWedgeAngle),
    y: FOLD_BASE.y
  };
}

/** The fresh, uncut triangular wedge for a given side count. */
export function createBasePaperGeomForSideCount(sideCount) {
  const outerBase = getOuterBaseForSideCount(sideCount);
  const base = [[[[APEX.x, APEX.y], [FOLD_BASE.x, FOLD_BASE.y], [outerBase.x, outerBase.y]]]];
  return normalizeGeom(base);
}
