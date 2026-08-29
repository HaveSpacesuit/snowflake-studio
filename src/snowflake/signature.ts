// A snowflake's "signature" is a stable JSON string of its paper geometry plus
// normalised options. It is used to detect unsaved changes and to compare a
// design against the pristine default.

import { normalizeSnowflakeOptions } from "./options.ts";
import { createBasePaperGeomForSideCount } from "../geometry/paper.ts";

export function computeSnowflakeSignature(geom, options) {
  return JSON.stringify({
    paperGeom: geom || [],
    options: normalizeSnowflakeOptions(options)
  });
}

/** Signature of a fresh, uncut default snowflake. */
export function getBasePaperSignature() {
  const defaults = normalizeSnowflakeOptions(null);
  return computeSnowflakeSignature(createBasePaperGeomForSideCount(defaults.sideCount), defaults);
}
