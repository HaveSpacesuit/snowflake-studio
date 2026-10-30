// A snowflake's "signature" is a stable JSON string of its paper geometry plus
// normalised options. It is used to detect unsaved changes and to compare a
// design against the pristine default.

import { DEFAULT_EXPAND_TO_FILL } from "../constants.ts";
import { normalizeSnowflakeOptions } from "./options.ts";
import { createBasePaperGeomForSideCount } from "../geometry/paper.ts";

export function computeSnowflakeSignature(geom, options) {
  return JSON.stringify({
    paperGeom: geom || [],
    options: normalizeSnowflakeOptions(options)
  });
}

/**
 * Signatures stored before the Expand to fill option existed have no
 * `expandToFill` key. Those designs were saved under the default, so add it
 * (last, matching `normalizeSnowflakeOptions`); otherwise every previously
 * saved design would look like it has unsaved changes.
 */
export function upgradeLegacySnowflakeSignature(signature) {
  try {
    const parsed = JSON.parse(signature);
    const options = parsed && parsed.options;
    if (!options || typeof options !== "object" || "expandToFill" in options) return signature;
    return JSON.stringify({ ...parsed, options: { ...options, expandToFill: DEFAULT_EXPAND_TO_FILL } });
  } catch (_) {
    return signature;
  }
}

/** Signature of a fresh, uncut default snowflake. */
export function getBasePaperSignature() {
  const defaults = normalizeSnowflakeOptions(null);
  return computeSnowflakeSignature(createBasePaperGeomForSideCount(defaults.sideCount), defaults);
}
