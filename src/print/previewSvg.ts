import { buildUnfoldedOutlinePaths } from "../geometry/outline.ts";
import { getGeomBounds, multiPolygonToPath } from "../geometry/polygon.ts";
import { PRINT_CONFIG } from "./config.ts";

/**
 * Build a tightly framed SVG for the printed snowflake preview.
 */
export function buildPrintPreviewSvgString(unfoldedGeom, _options, spinAngle = 0) {
  const snowflakePath = multiPolygonToPath(unfoldedGeom);
  const bounds = getGeomBounds(unfoldedGeom);
  if (!snowflakePath || !bounds) return "";

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
    `    <path class="printPreviewBody" d="${snowflakePath}" fill="none" fill-rule="evenodd" stroke="none"/>`,
    `    <path class="printPreviewOutline" d="${outlines.outerPath}" fill="none" stroke="#000000" stroke-width="0.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `    <path class="printPreviewOutline" d="${outlines.holePath}" fill="none" stroke="#000000" stroke-width="0.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    `  </g>`,
    `</svg>`
  ].join("\n");
}
