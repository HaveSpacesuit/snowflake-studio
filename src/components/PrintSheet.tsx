import { APEX, FOLD_BASE } from "../constants.ts";
import { createPrintWedgeTransform, isUncutFoldEdge } from "../geometry/printMapping.ts";
import { getOuterBaseForSideCount } from "../geometry/paper.ts";
import { pointsToPath } from "../geometry/polygon.ts";
import { PRINT_CONFIG, type PrintPaperSize } from "../print/config.ts";

type PrintSheetProps = {
  paperSize: PrintPaperSize;
  paperGeom: number[][][][] | null;
  previewSvg: string;
  sideCount: number;
};

export default function PrintSheet({ paperSize, paperGeom, previewSvg, sideCount }: PrintSheetProps) {
  const paper = PRINT_CONFIG.paperSizes[paperSize];
  const squareSize = paper.widthMm;
  const half = squareSize / 2;
  const trisectTan = Math.tan((PRINT_CONFIG.trisectAngleDeg * Math.PI) / 180);
  const outerBase = getOuterBaseForSideCount(sideCount);
  const transform = createPrintWedgeTransform(
    sideCount,
    squareSize,
    PRINT_CONFIG.trisectAngleDeg,
    PRINT_CONFIG.cutEdgeInsetMm
  );
  const cutPaths: string[] = [];

  if (paperGeom) {
    for (const polygon of paperGeom) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i += 1) {
          const p1 = ring[i];
          const p2 = ring[(i + 1) % ring.length];
          if (isUncutFoldEdge(p1, p2, APEX, FOLD_BASE, outerBase)) continue;
          cutPaths.push(pointsToPath([transform(p1), transform(p2)]));
        }
      }
    }
  }

  const chopStart = transform([FOLD_BASE.x, FOLD_BASE.y]);
  const chopEnd = transform([outerBase.x, outerBase.y]);

  return (
    <div
      className={`printSheet printSheet--${paperSize}`}
      style={{ width: `${paper.widthMm}mm`, height: `${paper.heightMm}mm` }}
      aria-hidden="true"
    >
      <svg className="printSheetSvg" viewBox={`0 0 ${squareSize} ${squareSize}`} preserveAspectRatio="none">
        <line
          className="printCutLine"
          data-testid="print-square-cut"
          x1="0"
          y1={squareSize}
          x2={squareSize}
          y2={squareSize}
        />
        <line
          className="printFoldLine"
          data-testid="print-diagonal-fold"
          x1="0"
          y1="0"
          x2={squareSize}
          y2={squareSize}
        />
        <line
          className="printFoldLine"
          x1={squareSize}
          y1="0"
          x2={half}
          y2={half}
        />
        <line
          className="printFoldLineDotted"
          x1={half}
          y1={half}
          x2={half - half * trisectTan}
          y2="0"
        />
        <line
          className="printFoldLineDotted"
          x1={half}
          y1={half}
          x2={half + half * trisectTan}
          y2="0"
        />
        <line
          className="printCutLine printWedgeCutLine"
          data-testid="print-wedge-top-cut"
          x1={chopStart[0]}
          y1={chopStart[1]}
          x2={chopEnd[0]}
          y2={chopEnd[1]}
        />
        {cutPaths.map((d, index) => (
          <path key={index} className="printCutLine printWedgeCutLine" d={d} />
        ))}
      </svg>
      <div className="printBottom">
        <ol className="printInstructions">
          <li>Cut across the solid line to make a square.</li>
          <li>Fold the square in half along the dashed line to make a triangle.</li>
          <li>Fold the triangle in half along the second dashed line to make a smaller triangle.</li>
          <li>Fold into thirds along the two dotted lines.</li>
          <li>Cut along the solid lines.</li>
          <li>Carefully unfold the snowflake.</li>
        </ol>
        {previewSvg && (
          <div className="printPreview">
            <p className="printPreviewLabel">Preview</p>
            <div className="printPreviewSvg" dangerouslySetInnerHTML={{ __html: previewSvg }} />
          </div>
        )}
      </div>
    </div>
  );
}
