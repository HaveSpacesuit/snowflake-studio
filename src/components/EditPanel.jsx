import svgDraw from "@stratakit/icons/draw.svg";
import svgLine from "@stratakit/icons/line.svg";
import svgCircle from "@stratakit/icons/circle.svg";
import svgEraser from "@stratakit/icons/eraser.svg";
import VerticalToolRail from "./VerticalToolRail.jsx";

/**
 * The "Edit" panel: hosts the folded-paper SVG (built by the engine into
 * `hostRef`) plus the cut-history toolbar and zoom badge.
 */
export default function EditPanel({ hostRef, canUndo, canRedo, onNew, onUndo, onRedo, onRandomCut }) {
  const dummyTools = [
    { id: "freehand", label: "Freehand tool", icon: svgDraw, isActive: true, onClick: () => {} },
    { id: "straight", label: "Straight tool", icon: svgLine, onClick: () => {} },
    { id: "circle", label: "Circle tool", icon: svgCircle, onClick: () => {} },
    { id: "eraser", label: "Eraser tool", icon: svgEraser, onClick: () => {}, disabled: true }
  ];

  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Edit</span></h2>
      <div className="editCanvasShell">
        <VerticalToolRail tools={dummyTools} className="editToolsRail" ariaLabel="Edit tools" />
        <div className="panelSvgHost" ref={hostRef} />
      </div>
      <div className="panelToolbar">
        <span className="panelActions">
          <button id="resetBtn" type="button" onClick={onNew}>New</button>
          <button id="undoBtn" type="button" onClick={onUndo} disabled={!canUndo}>Undo</button>
          <button id="redoBtn" type="button" onClick={onRedo} disabled={!canRedo}>Redo</button>
          <button id="randomCutBtn" type="button" onClick={onRandomCut}>Random cut</button>
        </span>
        <span className="panelZoom" data-zoom-badge-for="foldedCanvas" />
      </div>
    </div>
  );
}
