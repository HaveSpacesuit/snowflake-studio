import { useRef, useState } from "react";
import BackgroundCanvas from "./components/BackgroundCanvas.tsx";
import SiteNav from "./components/SiteNav.tsx";
import EditPanel from "./components/EditPanel.tsx";
import PreviewPanel from "./components/PreviewPanel.tsx";
import HelpModal from "./components/HelpModal.tsx";
import OptionsModal from "./components/OptionsModal.tsx";
import ConfirmDialog from "./components/ConfirmDialog.tsx";
import { useStudioEngine } from "./hooks/useStudioEngine.ts";

/** The Studio editor page: draw folded cuts and preview the unfolded snowflake. */
export default function App() {
  const foldedHostRef = useRef(null);
  const unfoldedHostRef = useRef(null);
  const backgroundCanvasRef = useRef(null);

  const { engineRef, status, setStatus, history, activeTool, options, canSave } = useStudioEngine({
    foldedHostRef,
    unfoldedHostRef,
    backgroundCanvasRef
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [newConfirmOpen, setNewConfirmOpen] = useState(false);

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
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onSelectTool={(toolId) => engineRef.current?.setActiveTool(toolId)}
            onNew={handleNew}
            onUndo={() => engineRef.current?.undo()}
            onRedo={() => engineRef.current?.redo()}
            onRandomCut={() => engineRef.current?.randomCut()}
          />
          <PreviewPanel
            hostRef={unfoldedHostRef}
            canSave={canSave}
            onSave={() => engineRef.current?.saveToCollection()}
            onExport={() => engineRef.current?.exportSvg()}
            onOptions={() => setOptionsOpen(true)}
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
      />
      <ConfirmDialog
        open={newConfirmOpen}
        title="Start a new snowflake?"
        message="Your current cuts will be cleared. This cannot be undone."
        confirmLabel="Start new"
        cancelLabel="Keep editing"
        onResolve={resolveNew}
      />
    </>
  );
}
