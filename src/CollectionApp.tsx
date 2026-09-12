import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import BackgroundCanvas from "./components/BackgroundCanvas.tsx";
import SiteNav from "./components/SiteNav.tsx";
import CollectionGrid from "./components/CollectionGrid.tsx";
import ConfirmDialog from "./components/ConfirmDialog.tsx";
import PrintSheet from "./components/PrintSheet.tsx";
import { useConfirm } from "./hooks/useConfirm.ts";
import { createCollectionBackground } from "./collection/background.ts";
import { downloadSnowflakeShareFile, parseSnowflakeShareFileText } from "./snowflake/shareFile.ts";
import { normalizeSnowflakeOptions } from "./snowflake/options.ts";
import { DEFAULT_PRINT_PAPER_SIZE } from "./print/config.ts";
import { saveInstructionsPdf } from "./print/saveInstructionsPdf.ts";
import {
  isNonEmptyStudioStatePresent,
  loadCollectionItems,
  normalizeStoredGeom,
  saveAsActiveStudioSnowflake,
  saveCollectionItems,
  saveSnowflakeToCollection
} from "./snowflake/storage.ts";

/** The Collection page: browse, edit, share, import, and delete saved snowflakes. */
export default function CollectionApp() {
  const backgroundCanvasRef = useRef(null);
  const backgroundRef = useRef(null);
  const importInputRef = useRef(null);
  const printSheetRef = useRef(null);
  const [items, setItems] = useState(() => loadCollectionItems());
  const [status, setStatus] = useState("");
  const [printTarget, setPrintTarget] = useState(null);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    const background = createCollectionBackground(backgroundCanvasRef.current);
    backgroundRef.current = background;
    return () => {
      background.destroy();
      backgroundRef.current = null;
    };
  }, []);

  useEffect(() => {
    backgroundRef.current?.setItems(items);
  }, [items]);

  const handleEdit = async (editableGeom, options) => {
    if (!editableGeom) return;
    if (isNonEmptyStudioStatePresent()) {
      const okToReplace = await confirm({
        title: "Replace Studio snowflake",
        message: "Your current snowflake in Studio will be lost. Continue?"
      });
      if (!okToReplace) return;
    }
    if (!saveAsActiveStudioSnowflake(editableGeom, options)) return;
    window.location.href = "index.html";
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: "Delete snowflake",
      message: "Delete this snowflake from the collection?"
    });
    if (!ok) return;
    const next = loadCollectionItems().filter((entry) => entry.id !== item.id);
    if (!saveCollectionItems(next)) return;
    setItems(next);
  };

  const handleClear = async () => {
    if (items.length === 0) return;
    const ok = await confirm({
      title: "Clear collection",
      message: "Clear all saved snowflakes from the collection?"
    });
    if (!ok) return;
    if (!saveCollectionItems([])) return;
    setItems([]);
  };

  const handleShare = (item) => {
    try {
      downloadSnowflakeShareFile(item);
      setStatus("Snowflake file saved.");
    } catch (_) {
      setStatus("Could not create a snowflake file.");
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const text = await file.text();
    const parsedSnowflake = parseSnowflakeShareFileText(text);
    if (!parsedSnowflake) {
      setStatus("That file isn't a valid snowflake file.");
      return;
    }

    if (!saveSnowflakeToCollection(parsedSnowflake)) {
      setStatus("Could not import snowflake (storage unavailable).");
      return;
    }
    setItems(loadCollectionItems());
    setStatus("Snowflake imported into your collection.");
  };

  /**
   * Build the hidden print-sheet payload for a specific tile's snowflake. This
   * never touches the Studio's active snowflake state.
   */
  const buildPrintTarget = (item) => {
    const paperGeom = normalizeStoredGeom(item.paperGeom);
    if (!paperGeom) return null;
    const options = normalizeSnowflakeOptions(item.options);
    return {
      paperGeom,
      sideCount: options.sideCount,
      previewSvg: typeof item.previewSvg === "string" ? item.previewSvg : ""
    };
  };

  const handlePrintItem = (item) => {
    const target = buildPrintTarget(item);
    if (!target) {
      setStatus("Could not print: this snowflake's geometry is unavailable.");
      return;
    }
    // Force the print sheet to reflect this item before invoking print, since
    // window.print() reads the DOM synchronously.
    flushSync(() => setPrintTarget(target));
    window.print();
  };

  const handleSaveInstructionsItem = async (item) => {
    if (isSavingInstructions) return;
    const target = buildPrintTarget(item);
    if (!target) {
      setStatus("Could not save instructions: this snowflake's geometry is unavailable.");
      return;
    }
    flushSync(() => setPrintTarget(target));
    const printSheet = printSheetRef.current;
    if (!printSheet) {
      setStatus("Could not save instructions: print layout is unavailable.");
      return;
    }

    setIsSavingInstructions(true);
    setStatus("Generating instructions PDF...");
    try {
      const filename = await saveInstructionsPdf(printSheet, DEFAULT_PRINT_PAPER_SIZE);
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
        <SiteNav current="collection" />
        <div className="subtitleRow">
          <p className="subtitle">Browse saved snowflake designs. No two snowflakes are alike.</p>
          <span className="subtitleActions">
            <button id="importCollectionBtn" className="helpButton" type="button" onClick={handleImportClick}>
              Import
            </button>
            <button
              id="clearCollectionBtn"
              className="helpButton"
              type="button"
              disabled={items.length === 0}
              onClick={handleClear}
            >
              Clear all
            </button>
          </span>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleImportFile}
          />
        </div>

        <section className="views collectionViews">
          <CollectionGrid
            items={items}
            onEdit={handleEdit}
            onShare={handleShare}
            onDelete={handleDelete}
            onPrint={handlePrintItem}
            onSaveInstructions={handleSaveInstructionsItem}
            isSavingInstructions={isSavingInstructions}
          />
        </section>

        {status && <p id="collectionStatus" className="statusBar">{status}</p>}
      </main>

      <ConfirmDialog {...dialogProps} />
      <PrintSheet
        sheetRef={printSheetRef}
        paperSize={DEFAULT_PRINT_PAPER_SIZE}
        paperGeom={printTarget?.paperGeom ?? null}
        previewSvg={printTarget?.previewSvg ?? ""}
        sideCount={printTarget?.sideCount ?? 6}
      />
    </>
  );
}
