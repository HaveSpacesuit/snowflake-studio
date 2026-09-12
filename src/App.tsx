import { useEffect, useRef, useState } from "react";
import BackgroundCanvas from "./components/BackgroundCanvas.tsx";
import SiteNav from "./components/SiteNav.tsx";
import EditPanel from "./components/EditPanel.tsx";
import PreviewPanel from "./components/PreviewPanel.tsx";
import HelpModal from "./components/HelpModal.tsx";
import OptionsModal from "./components/OptionsModal.tsx";
import ConfirmDialog from "./components/ConfirmDialog.tsx";
import PrintSheet from "./components/PrintSheet.tsx";
import { useStudioEngine } from "./hooks/useStudioEngine.ts";
import {
  DEFAULT_PRINT_PAPER_SIZE,
  PRINT_CONFIG,
  type PrintPaperSize
} from "./print/config.ts";
import { saveInstructionsPdf } from "./print/saveInstructionsPdf.ts";

/** The Studio editor page: draw folded cuts and preview the unfolded snowflake. */
export default function App() {
  const foldedHostRef = useRef(null);
  const unfoldedHostRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const { engineRef, status, setStatus, history, activeTool, circleResizeMode, options, canSave } = useStudioEngine({
    foldedHostRef,
    unfoldedHostRef,
    backgroundCanvasRef
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [newConfirmOpen, setNewConfirmOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<PrintPaperSize>(DEFAULT_PRINT_PAPER_SIZE);
  const [paperGeom, setPaperGeom] = useState(null);
  const [previewSvg, setPreviewSvg] = useState("");
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);

  // Refresh the cut geometry used for the print preview whenever the cut
  // history changes (i.e. after any cut, undo, redo, or reset).
  useEffect(() => {
    setPaperGeom(engineRef.current?.getPaperGeom() ?? null);
    setPreviewSvg(engineRef.current?.getPrintPreviewSvgString() ?? "");
  }, [engineRef, history, options]);

  const handleNew = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.hasChanges()) setNewConfirmOpen(true);
    else engine.reset();
  };

  const resolveNew = (confirmed) => {
    setNewConfirmOpen(false);
    if (confirmed) engineRef.current?.reset();
  };

  const handleSaveInstructions = async () => {
    if (isSavingInstructions) return;
    const printSheet = printSheetRef.current;
    if (!printSheet) {
      setStatus("Could not save instructions: print layout is unavailable.");
      return;
    }

    setIsSavingInstructions(true);
    setStatus("Generating instructions PDF...");
    try {
      const filename = await saveInstructionsPdf(printSheet, paperSize);
      setStatus(`Saved ${filename}.`);
    } catch (error) {
      console.error("Could not save instructions PDF", error);
      setStatus("Could not save instructions PDF. Please try again.");
    } finally {
      setIsSavingInstructions(false);
    }
  };

  return (
    <>
      <BackgroundCanvas ref={backgroundCanvasRef} />
      <main>
        <h1>Snowflake Studio</h1>
        <SiteNav current="studio" />
        <div className="subtitleRow">
          <p className="subtitle">Make cuts on the folded snowflake. Begin and end on edges. Have fun!</p>
          <button
            id="helpBtn"
            className="helpButton"
            type="button"
            aria-haspopup="dialog"
            onClick={() => setHelpOpen(true)}
          >
            How to use
          </button>
        </div>

        <section className="views">
          <EditPanel
            hostRef={foldedHostRef}
            activeTool={activeTool}
            circleResizeMode={circleResizeMode}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onSelectTool={(toolId) => engineRef.current?.setActiveTool(toolId)}
            onToggleCircleResize={() => engineRef.current?.toggleCircleResizeMode()}
            onNew={handleNew}
            onUndo={() => engineRef.current?.undo()}
            onRedo={() => engineRef.current?.redo()}
            onRandomCut={() => engineRef.current?.randomCut()}
          />
          <PreviewPanel
            hostRef={unfoldedHostRef}
            canSave={canSave}
            canPrint={options.sideCount === PRINT_CONFIG.supportedSideCount}
            isSavingInstructions={isSavingInstructions}
            onSave={() => engineRef.current?.saveToCollection()}
            onSaveInstructions={handleSaveInstructions}
            onOptions={() => setOptionsOpen(true)}
            onPrint={() => window.print()}
          />
        </section>

        <p id="status" className="statusBar">{status}</p>
      </main>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <OptionsModal
        open={optionsOpen}
        options={options}
        engineRef={engineRef}
        onStatus={setStatus}
        onClose={() => setOptionsOpen(false)}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
      />
      <ConfirmDialog
        open={newConfirmOpen}
        title="Start a new snowflake?"
        message="Your current cuts will be cleared. This cannot be undone."
        confirmLabel="Start new"
        cancelLabel="Keep editing"
        onResolve={resolveNew}
      />
      <PrintSheet
        sheetRef={printSheetRef}
        paperSize={paperSize}
        paperGeom={paperGeom}
        previewSvg={previewSvg}
        sideCount={options.sideCount}
      />
    </>
  );
}
