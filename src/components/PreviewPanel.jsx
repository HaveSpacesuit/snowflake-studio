/**
 * The "Preview" panel: hosts the unfolded snowflake SVG (built by the engine
 * into `hostRef`) plus the save/export/options toolbar and zoom badge.
 */
export default function PreviewPanel({ hostRef, canSave, onSave, onExport, onOptions }) {
  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Preview</span></h2>
      <div className="panelSvgHost" ref={hostRef} />
      <div className="panelToolbar">
        <span className="panelActions">
          <button id="saveToCollectionBtn" type="button" onClick={onSave} disabled={!canSave}>
            Save to collection
          </button>
          <button id="exportSvgBtn" type="button" onClick={onExport}>Export SVG</button>
          <button id="optionsBtn" type="button" aria-haspopup="dialog" onClick={onOptions}>Options</button>
        </span>
        <span className="panelZoom" data-zoom-badge-for="unfoldedCanvas" />
      </div>
    </div>
  );
}
