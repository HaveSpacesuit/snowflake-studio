// Turns a single cut wedge (the "folded paper") into the full snowflake by
// mirroring and rotating it around the apex, then unioning all copies.

import polygonClipping from "polygon-clipping";
import { APEX } from "../constants.js";
import { normalizeGeom } from "./polygon.js";
import { normalizeSideCount } from "../snowflake/options.js";

function transformPoint(pt, angle, mirror) {
  let x = pt[0];
  let y = pt[1];

  if (mirror) {
    x = APEX.x - (x - APEX.x);
  }

  const dx = x - APEX.x;
  const dy = y - APEX.y;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return [APEX.x + dx * ca - dy * sa, APEX.y + dx * sa + dy * ca];
}

export function transformGeom(geom, angle, mirror) {
  return geom.map((polygon) => polygon.map((ring) => ring.map((pt) => transformPoint(pt, angle, mirror))));
}

/**
 * Build the unfolded snowflake geometry from the folded wedge. Returns the
 * previous geometry unchanged if the boolean union fails, and reports that via
 * `onError` so the caller can surface a status message.
 */
export function buildUnfoldedGeom(paperGeom, sideCount, previousGeom = [], onError) {
  const safeSideCount = normalizeSideCount(sideCount);
  const parts = [];
  for (let i = 0; i < safeSideCount; i += 1) {
    const angle = (Math.PI * 2 / safeSideCount) * i;
    parts.push(transformGeom(paperGeom, angle, false));
    parts.push(transformGeom(paperGeom, angle, true));
  }

  try {
    return normalizeGeom(polygonClipping.union(...parts));
  } catch (err) {
    console.error("Unfold boolean failed", err);
    if (onError) onError(err);
    return previousGeom;
  }
}
