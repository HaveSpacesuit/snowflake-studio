import svgDraw from "@stratakit/icons/draw.svg";
import svgLine from "@stratakit/icons/line.svg";
import svgArc from "@stratakit/icons/arc.svg";
import svgAutomagic from "@stratakit/icons/automagic.svg";
import VerticalToolRail from "./VerticalToolRail.tsx";

/**
 * The "Edit" panel: hosts the folded-paper SVG (built by the engine into
 * `hostRef`) plus the cut-history toolbar and zoom badge.
 */
export default function EditPanel({ hostRef, activeTool, canUndo, canRedo, onSelectTool, onNew, onUndo, onRedo, onRandomCut }) {
  const tools = [
    {
      id: "freehand",
      label: "Freehand tool",
      icon: svgDraw,
      isActive: activeTool === "freehand",
      onClick: () => onSelectTool?.("freehand")
    },
    {
      id: "straight",
      label: "Straight tool",
      icon: svgLine,
      tooltip: "Straight tool",
      shortcutDesktop: "Shift while drawing",
      shortcutMobile: "Long-press to arm",
      isActive: activeTool === "straight",
      onClick: () => onSelectTool?.("straight")
    },
    {
      id: "circle",
      label: "Circle tool",
      icon: svgArc,
      tooltip: "Circle tool",
      shortcutDesktop: "Ctrl + wheel + click",
      shortcutMobile: "Pinch to resize, then tap",
      isActive: activeTool === "circle",
      onClick: () => onSelectTool?.("circle")
    },
    {
      id: "random-cut",
      label: "Random cut",
      tooltip: "Random cut",
      icon: svgAutomagic,
      buttonId: "randomCutBtn",
      onClick: () => onRandomCut?.()
    }
  ];

  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Edit</span></h2>
      <div className="editCanvasShell">
        <VerticalToolRail tools={tools} className="editToolsRail" ariaLabel="Edit tools" />
        <div className="panelSvgHost" ref={hostRef} />
      </div>
      <div className="panelToolbar">
        <span className="panelActions">
          <button id="resetBtn" type="button" onClick={onNew}>New</button>
          <button id="undoBtn" type="button" onClick={onUndo} disabled={!canUndo}>Undo</button>
          <button id="redoBtn" type="button" onClick={onRedo} disabled={!canRedo}>Redo</button>
        </span>
        <span className="panelZoom" data-zoom-badge-for="foldedCanvas" />
      </div>
    </div>
  );
}
