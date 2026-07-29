import svgDraw from "@stratakit/icons/draw.svg";
import svgLine from "@stratakit/icons/line.svg";
import svgCircle from "@stratakit/icons/circle.svg";
import svgEraser from "@stratakit/icons/eraser.svg";

/**
 * The "Edit" panel: hosts the folded-paper SVG (built by the engine into
 * `hostRef`) plus the cut-history toolbar and zoom badge.
 */
export default function EditPanel({ hostRef, canUndo, canRedo, onNew, onUndo, onRedo, onRandomCut }) {
  const dummyTools = [
    { id: "freehand", label: "Freehand tool", icon: svgDraw },
    { id: "straight", label: "Straight tool", icon: svgLine },
    { id: "circle", label: "Circle tool", icon: svgCircle },
    { id: "eraser", label: "Eraser tool", icon: svgEraser }
  ];

  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Edit</span></h2>
      <div className="editCanvasShell">
        <div className="editToolsRail" aria-label="Tools">
          {dummyTools.map((tool, index) => (
            <button
              key={tool.id}
              type="button"
              className="editToolButton"
              aria-label={tool.label}
              aria-pressed={index === 0 ? "true" : "false"}
            >
              <svg className="editToolIcon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <use href={`${tool.icon}#icon`} />
              </svg>
              <span className="editToolTooltip" aria-hidden="true">{tool.label}</span>
            </button>
          ))}
        </div>
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
