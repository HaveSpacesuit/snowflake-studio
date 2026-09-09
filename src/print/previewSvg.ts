import { buildUnfoldedOutlinePaths } from "../geometry/outline.ts";
import { getGeomBounds, multiPolygonToPath } from "../geometry/polygon.ts";
import { normalizeSnowflakeOptions } from "../snowflake/options.ts";
import { PRINT_CONFIG } from "./config.ts";

/**
 * Build a tightly framed SVG for the printed snowflake preview.
 */
export function buildPrintPreviewSvgString(unfoldedGeom, options, spinAngle = 0) {
  const snowflakePath = multiPolygonToPath(unfoldedGeom);
  const bounds = getGeomBounds(unfoldedGeom);
  if (!snowflakePath || !bounds) return "";

  const outlines = buildUnfoldedOutlinePaths(unfoldedGeom);
  const opts = normalizeSnowflakeOptions(options);
  const showBody = opts.previewMode !== "outline";
  const showOutline = opts.previewMode !== "body";
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cos = Math.cos(spinAngle);
  const sin = Math.sin(spinAngle);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const polygon of unfoldedGeom) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        const dx = x - cx;
        const dy = y - cy;
        const rotatedX = cx + dx * cos - dy * sin;
        const rotatedY = cy + dx * sin + dy * cos;
        minX = Math.min(minX, rotatedX);
        minY = Math.min(minY, rotatedY);
        maxX = Math.max(maxX, rotatedX);
        maxY = Math.max(maxY, rotatedY);
      }
    }
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const padding = Math.max(width, height) * PRINT_CONFIG.previewPaddingRatio;
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  const rotationDeg = (spinAngle * 180) / Math.PI;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
    `  <g transform="rotate(${rotationDeg} ${cx} ${cy})">`,
    `    <path d="${snowflakePath}" fill="${showBody ? opts.snowflakeColor : "none"}" fill-rule="evenodd" stroke="none"/>`,
    `    <path d="${outlines.outerPath}" fill="none" stroke="${showOutline ? opts.outlineExteriorColor : "none"}" stroke-width="${opts.outlineExteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `    <path d="${outlines.holePath}" fill="none" stroke="${showOutline ? opts.outlineInteriorColor : "none"}" stroke-width="${opts.outlineInteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `  </g>`,
    `</svg>`
  ].join("\n");
}
