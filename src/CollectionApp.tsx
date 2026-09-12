import { useEffect, useRef, useState } from "react";
import BackgroundCanvas from "./components/BackgroundCanvas.tsx";
import SiteNav from "./components/SiteNav.tsx";
import CollectionGrid from "./components/CollectionGrid.tsx";
import ConfirmDialog from "./components/ConfirmDialog.tsx";
import { useConfirm } from "./hooks/useConfirm.ts";
import { createCollectionBackground } from "./collection/background.ts";
import { downloadSnowflakeShareFile, parseSnowflakeShareFileText } from "./snowflake/shareFile.ts";
import {
  isNonEmptyStudioStatePresent,
  loadCollectionItems,
  saveAsActiveStudioSnowflake,
  saveCollectionItems,
  saveSnowflakeToCollection
} from "./snowflake/storage.ts";

/** The Collection page: browse, edit, share, import, and delete saved snowflakes. */
export default function CollectionApp() {
  const backgroundCanvasRef = useRef(null);
  const backgroundRef = useRef(null);
  const importInputRef = useRef(null);
  const [items, setItems] = useState(() => loadCollectionItems());
  const [status, setStatus] = useState("");
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
          <CollectionGrid items={items} onEdit={handleEdit} onShare={handleShare} onDelete={handleDelete} />
        </section>

        {status && <p id="collectionStatus" className="statusBar">{status}</p>}
      </main>

      <ConfirmDialog {...dialogProps} />
    </>
  );
}
