// Serialises the current unfolded snowflake into a standalone SVG string, used
// both for file export and for collection thumbnails.

import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "../constants.ts";
import { computeGeomCenter, multiPolygonToPath } from "../geometry/polygon.ts";
import { buildUnfoldedOutlinePaths } from "../geometry/outline.ts";
import { normalizeSnowflakeOptions } from "./options.ts";

/**
 * Build the export SVG for an unfolded snowflake.
 *
 * @param {number[][][][]} unfoldedGeom  Multi-polygon of the full snowflake.
 * @param {object} options               Snowflake options (colours, widths...).
 * @param {number} baseScale             Locked display scale, or a non-positive
 *                                        value to derive it from the geometry.
 * @param {number} spinAngle             Current spin angle in radians.
 * @returns {string} SVG markup, or "" when there is nothing to draw.
 */
export function buildExportSvgString(unfoldedGeom, options, baseScale, spinAngle = 0) {
  const snowflakePath = multiPolygonToPath(unfoldedGeom);
  if (!snowflakePath) return "";

  const outlines = buildUnfoldedOutlinePaths(unfoldedGeom);
  const dynamicFit = computeGeomCenter(unfoldedGeom, DISPLAY_WIDTH, DISPLAY_HEIGHT);
  const scale = Number.isFinite(baseScale) && baseScale > 0 ? baseScale : dynamicFit.scale;
  const opts = normalizeSnowflakeOptions(options);
  const showBody = opts.previewMode !== "outline";
  const showOutline = opts.previewMode !== "body";
  const tx = DISPLAY_WIDTH / 2;
  const ty = DISPLAY_HEIGHT / 2;
  const transform =
    `translate(${tx} ${ty}) rotate(${(spinAngle * 180) / Math.PI}) scale(${scale}) translate(${-dynamicFit.x} ${-dynamicFit.y})`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DISPLAY_WIDTH} ${DISPLAY_HEIGHT}" width="${DISPLAY_WIDTH}" height="${DISPLAY_HEIGHT}">`,
    `  <g transform="${transform}">`,
    `    <path d="${snowflakePath}" fill="${showBody ? opts.snowflakeColor : "none"}" fill-rule="evenodd" stroke="none"/>`,
    `    <path d="${outlines.outerPath}" fill="none" stroke="${showOutline ? opts.outlineExteriorColor : "none"}" stroke-width="${opts.outlineExteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `    <path d="${outlines.holePath}" fill="none" stroke="${showOutline ? opts.outlineInteriorColor : "none"}" stroke-width="${opts.outlineInteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `  </g>`,
    `</svg>`
  ].join("\n");
}
