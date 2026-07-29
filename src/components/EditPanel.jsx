/**
 * The "Edit" panel: hosts the folded-paper SVG (built by the engine into
 * `hostRef`) plus the cut-history toolbar and zoom badge.
 */
export default function EditPanel({ hostRef, canUndo, canRedo, onNew, onUndo, onRedo, onRandomCut }) {
  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Edit</span></h2>
      <div className="panelSvgHost" ref={hostRef} />
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
