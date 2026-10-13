// Turns a single cut wedge (the "folded paper") into the full snowflake by
// mirroring and rotating it around the apex, then unioning all copies.

import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Pair } from "polygon-clipping";
import { APEX, GEOM_GRID } from "../constants.ts";
import { normalizeGeom } from "./polygon.ts";
import { normalizeSideCount } from "../snowflake/options.ts";

function transformPoint(pt: Pair, angle: number, mirror: boolean): Pair {
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

function transformFoldPoint(pt: Pair, sideCount: number, index: number, mirror: boolean): Pair {
  const halfAngle = Math.PI / sideCount;
  const dx = pt[0] - APEX.x;
  const dy = pt[1] - APEX.y;
  let foldIndex: number;
  let radius: number;

  // Grid rounding perturbs fold vertices. Both copies must use the same ray
  // and radius or their union can leave a slit that gets stroked as a cut.
  if (Math.abs(dx) <= GEOM_GRID && dy <= 0) {
    foldIndex = index * 2;
    radius = -dy;
  } else if (Math.abs(dx * Math.cos(halfAngle) + dy * Math.sin(halfAngle)) <= GEOM_GRID) {
    foldIndex = (index * 2 + (mirror ? -1 : 1) + sideCount * 2) % (sideCount * 2);
    radius = dx * Math.sin(halfAngle) - dy * Math.cos(halfAngle);
  } else {
    return transformPoint(pt, halfAngle * index * 2, mirror);
  }

  const angle = halfAngle * foldIndex;
  return [APEX.x + radius * Math.sin(angle), APEX.y - radius * Math.cos(angle)];
}

/**
 * Build the unfolded snowflake geometry from the folded wedge. Returns the
 * previous geometry unchanged if the boolean union fails, and reports that via
 * `onError` so the caller can surface a status message.
 */
export function buildUnfoldedGeom(paperGeom, sideCount, previousGeom = [], onError) {
  const safeSideCount = normalizeSideCount(sideCount);
  const parts: MultiPolygon[] = [];
  for (let i = 0; i < safeSideCount; i += 1) {
    for (const mirror of [false, true]) {
      parts.push(normalizeGeom(paperGeom.map((polygon) =>
        polygon.map((ring) => ring.map((pt) => transformFoldPoint(pt, safeSideCount, i, mirror)))
      )));
    }
  }

  try {
    if (parts.length === 0) return normalizeGeom([]);
    let merged = parts[0];
    for (let i = 1; i < parts.length; i += 1) {
      merged = polygonClipping.union(merged, parts[i]);
    }
    return normalizeGeom(merged);
  } catch (err) {
    console.error("Unfold boolean failed", err);
    if (onError) onError(err);
    return previousGeom;
  }
}
