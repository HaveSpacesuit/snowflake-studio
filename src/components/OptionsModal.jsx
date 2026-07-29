import { useEffect, useRef, useState } from "react";
import {
  OUTLINE_WIDTH_MAX,
  OUTLINE_WIDTH_MIN,
  SIDE_COUNT_MAX,
  SIDE_COUNT_MIN
} from "../constants.js";
import {
  normalizeSideCount,
  normalizeSnowflakeOptions,
  previewModeToSliderValue,
  sliderValueToPreviewMode
} from "../snowflake/options.js";

/**
 * Options dialog for the current snowflake. Colour/width/preview changes apply
 * live through the engine; side count is staged and only takes effect (starting
 * a fresh snowflake) on Save. Cancelling reverts to the snapshot taken on open.
 */
export default function OptionsModal({ open, options, engineRef, onStatus, onClose }) {
  const ref = useRef(null);
  const snapshotRef = useRef(null);
  const [pendingSideCount, setPendingSideCount] = useState(options.sideCount);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const engine = engineRef.current;
      snapshotRef.current = engine ? engine.getOptions() : normalizeSnowflakeOptions(options);
      setPendingSideCount(snapshotRef.current.sideCount);
      dialog.returnValue = "";
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // `options` is intentionally excluded: we only snapshot on the open edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = (partial, message) => {
    const engine = engineRef.current;
    if (engine && engine.setOptions(partial) && message) onStatus(message);
  };

  const handleClose = () => {
    const engine = engineRef.current;
    const result = ref.current?.returnValue;
    if (engine) {
      if (result === "save") {
        const current = engine.getOptions();
        if (pendingSideCount !== current.sideCount) {
          engine.startNewSnowflake(
            { ...current, sideCount: pendingSideCount },
            `Started new ${pendingSideCount}-sided snowflake.`
          );
        } else {
          onStatus("Options saved.");
        }
      } else if (snapshotRef.current && engine.setOptions(snapshotRef.current)) {
        onStatus("Option changes discarded.");
      }
    }
    onClose();
  };

  const handleBackdropClick = (event) => {
    if (event.target === ref.current) ref.current.close("cancel");
  };

  const outlinesEnabled = options.previewMode !== "body";
  const bodyEnabled = options.previewMode !== "outline";

  return (
    <dialog
      ref={ref}
      className="helpModal"
      aria-labelledby="optionsModalTitle"
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <form method="dialog" className="helpModalContent">
        <div className="helpModalHeader">
          <h2 id="optionsModalTitle">Options</h2>
        </div>

        <p className="helpLead">Options apply to the current snowflake.</p>

        <div className="optionsGrid">
          <label className="optionsLabel optionsModeLabel" htmlFor="optionsPreviewModeInput">
            Preview representation
          </label>
          <div className="optionsModeInput" role="group" aria-label="Preview representation mode">
            <input
              id="optionsPreviewModeInput"
              className="optionsModeSlider"
              type="range"
              min="0"
              max="2"
              step="1"
              value={previewModeToSliderValue(options.previewMode)}
              aria-label="Preview representation mode"
              aria-valuetext={options.previewMode.replace(/-/g, " ")}
              list="optionsPreviewModeTicks"
              onChange={(e) =>
                apply({ previewMode: sliderValueToPreviewMode(e.target.value) }, "Preview representation updated.")
              }
            />
            <datalist id="optionsPreviewModeTicks">
              <option value="0" label="outline" />
              <option value="1" label="outline and body" />
              <option value="2" label="body" />
            </datalist>
            <div className="optionsModeAxis" aria-hidden="true">
              <span>outline</span>
              <span>outline and body</span>
              <span>body</span>
            </div>
          </div>

          <label className="optionsLabel" htmlFor="optionsExteriorColorInput">Exterior outline</label>
          <div className="optionsInlineField">
            <span className="optionsInlineText">color</span>
            <input
              id="optionsExteriorColorInput"
              className="optionsColorInput"
              type="color"
              value={options.outlineExteriorColor}
              aria-label="Exterior outline color"
              disabled={!outlinesEnabled}
              onChange={(e) => apply({ outlineExteriorColor: e.target.value }, "Exterior outline color updated.")}
            />
          </div>
          <label className="optionsLabel optionsSubLabel" htmlFor="optionsExteriorWidthInput">
            thickness <span className="optionsValue">{options.outlineExteriorWidth.toFixed(1)}</span>
          </label>
          <input
            id="optionsExteriorWidthInput"
            className="optionsRangeInput"
            type="range"
            min={OUTLINE_WIDTH_MIN}
            max={OUTLINE_WIDTH_MAX}
            step="0.1"
            value={options.outlineExteriorWidth}
            aria-label="Exterior outline thickness"
            disabled={!outlinesEnabled}
            onChange={(e) => apply({ outlineExteriorWidth: e.target.value }, "Exterior outline thickness updated.")}
          />

          <label className="optionsLabel" htmlFor="optionsInteriorColorInput">Interior outline</label>
          <div className="optionsInlineField">
            <span className="optionsInlineText">color</span>
            <input
              id="optionsInteriorColorInput"
              className="optionsColorInput"
              type="color"
              value={options.outlineInteriorColor}
              aria-label="Interior outline color"
              disabled={!outlinesEnabled}
              onChange={(e) => apply({ outlineInteriorColor: e.target.value }, "Interior outline color updated.")}
            />
          </div>
          <label className="optionsLabel optionsSubLabel" htmlFor="optionsInteriorWidthInput">
            thickness <span className="optionsValue">{options.outlineInteriorWidth.toFixed(1)}</span>
          </label>
          <input
            id="optionsInteriorWidthInput"
            className="optionsRangeInput"
            type="range"
            min={OUTLINE_WIDTH_MIN}
            max={OUTLINE_WIDTH_MAX}
            step="0.1"
            value={options.outlineInteriorWidth}
            aria-label="Interior outline thickness"
            disabled={!outlinesEnabled}
            onChange={(e) => apply({ outlineInteriorWidth: e.target.value }, "Interior outline thickness updated.")}
          />

          <label className="optionsLabel" htmlFor="optionsBodyColorInput">Snowflake body</label>
          <div className="optionsInlineField">
            <span className="optionsInlineText">color</span>
            <input
              id="optionsBodyColorInput"
              className="optionsColorInput"
              type="color"
              value={options.snowflakeColor}
              aria-label="Snowflake color"
              disabled={!bodyEnabled}
              onChange={(e) => apply({ snowflakeColor: e.target.value }, "Snowflake color updated.")}
            />
          </div>
          <label className="optionsLabel" htmlFor="optionsSideCountInput">
            Side count <span className="optionsValue">{pendingSideCount}</span>
          </label>
          <input
            id="optionsSideCountInput"
            className="optionsRangeInput"
            type="range"
            min={SIDE_COUNT_MIN}
            max={SIDE_COUNT_MAX}
            step="1"
            value={pendingSideCount}
            aria-label="Side count"
            onChange={(e) => setPendingSideCount(normalizeSideCount(e.target.value))}
          />

          <p className="optionsNote optionsNoteSideCount">Changing side count will lose current progress.</p>
        </div>

        <div className="optionsActions">
          <button
            id="optionsRestoreDefaultsBtn"
            type="button"
            onClick={() => {
              const defaults = normalizeSnowflakeOptions(null);
              apply(defaults, "Options restored to defaults.");
              setPendingSideCount(defaults.sideCount);
            }}
          >
            Restore defaults
          </button>
          <div className="panelActions">
            <button id="optionsCancelBtn" type="submit" value="cancel">Cancel</button>
            <button id="optionsSaveBtn" type="submit" value="save">Save</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
