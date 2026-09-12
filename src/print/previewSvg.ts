import { buildUnfoldedOutlinePaths } from "../geometry/outline.ts";
import { getGeomBounds, multiPolygonToPath } from "../geometry/polygon.ts";
import { normalizeSnowflakeOptions } from "../snowflake/options.ts";
import { PRINT_CONFIG } from "./config.ts";

/**
 * Build a tightly framed SVG for the printed snowflake preview. The Studio's
 * current outline/body colors and widths are baked in so the collection tile
 * (which reuses this same SVG) matches the editor; the print sheet still
 * forces thin black outlines via CSS regardless of these values.
 */
export function buildPrintPreviewSvgString(unfoldedGeom, options, spinAngle = 0) {
  const snowflakePath = multiPolygonToPath(unfoldedGeom);
  const bounds = getGeomBounds(unfoldedGeom);
  if (!snowflakePath || !bounds) return "";

  const normalizedOptions = normalizeSnowflakeOptions(options);
  const showBody = normalizedOptions.previewMode !== "outline";
  const showOutline = normalizedOptions.previewMode !== "body";

  const outlines = buildUnfoldedOutlinePaths(unfoldedGeom);
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
    `    <path class="printPreviewBody" d="${snowflakePath}" fill="${showBody ? normalizedOptions.snowflakeColor : "none"}" fill-rule="evenodd" stroke="none"/>`,
    `    <path class="printPreviewOutline" d="${outlines.outerPath}" fill="none" stroke="${showOutline ? normalizedOptions.outlineExteriorColor : "none"}" stroke-width="${normalizedOptions.outlineExteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `    <path class="printPreviewOutline" d="${outlines.holePath}" fill="none" stroke="${showOutline ? normalizedOptions.outlineInteriorColor : "none"}" stroke-width="${normalizedOptions.outlineInteriorWidth.toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `  </g>`,
    `</svg>`
  ].join("\n");
}
