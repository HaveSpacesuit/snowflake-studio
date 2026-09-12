import { useRef } from "react";
import ToolbarMoreMenu from "./ToolbarMoreMenu.tsx";
import { useToolbarOverflow } from "../hooks/useToolbarOverflow.ts";

/**
 * The "Preview" panel: hosts the unfolded snowflake SVG (built by the engine
 * into `hostRef`) plus the save/print/options toolbar and zoom badge.
 */
export default function PreviewPanel({
  hostRef,
  canSave,
  canPrint,
  isSavingInstructions,
  onSave,
  onSaveInstructions,
  onOptions,
  onPrint
}) {
  const actionsRef = useRef(null);
  const printBtnRef = useRef(null);
  const saveInstructionsBtnRef = useRef(null);
  const saveBtnRef = useRef(null);
  const optionsBtnRef = useRef(null);
  const moreBtnRef = useRef(null);
  const compact = useToolbarOverflow(actionsRef, [printBtnRef, saveInstructionsBtnRef, saveBtnRef, optionsBtnRef]);

  const printTitle = canPrint ? "Print snowflake instructions" : "Printing instructions is available for six-sided snowflakes only.";
  const saveInstructionsTitle = canPrint ? "Save snowflake instructions as a PDF" : "Saving instructions is available for six-sided snowflakes only.";

  return (
    <div className="panel">
      <h2 className="panelHeader"><span className="panelTitle">Preview</span></h2>
      <div className="panelSvgHost" ref={hostRef} />
      <div className="panelToolbar">
        <span className="panelActions" ref={actionsRef}>
          <button
            id="printBtn"
            ref={printBtnRef}
            type="button"
            onClick={onPrint}
            disabled={!canPrint}
            title={printTitle}
          >
            Print instructions
          </button>
          <button
            id="saveInstructionsBtn"
            ref={saveInstructionsBtnRef}
            type="button"
            hidden={compact}
            onClick={onSaveInstructions}
            disabled={!canPrint || isSavingInstructions}
            aria-busy={isSavingInstructions}
            title={saveInstructionsTitle}
          >
            {isSavingInstructions ? "Saving..." : "Save instructions"}
          </button>
          <button id="saveToCollectionBtn" ref={saveBtnRef} type="button" hidden={compact} onClick={onSave} disabled={!canSave}>
            Save to collection
          </button>
          <button id="optionsBtn" ref={optionsBtnRef} type="button" hidden={compact} aria-haspopup="dialog" onClick={onOptions}>
            Options
          </button>
          {compact && (
            <ToolbarMoreMenu
              ref={moreBtnRef}
              items={[
                {
                  key: "save-instructions",
                  label: isSavingInstructions ? "Saving..." : "Save instructions",
                  disabled: !canPrint || isSavingInstructions,
                  busy: isSavingInstructions,
                  title: saveInstructionsTitle,
                  onClick: onSaveInstructions
                },
                { key: "save", label: "Save to collection", disabled: !canSave, onClick: onSave },
                { key: "options", label: "Options", onClick: onOptions }
              ]}
            />
          )}
        </span>
        <span className="panelZoomControls">
          <button type="button" data-zoom-reset-for="unfoldedCanvas" hidden>Reset</button>
          <span className="panelZoom" data-zoom-badge-for="unfoldedCanvas" />
        </span>
      </div>
    </div>
  );
}
