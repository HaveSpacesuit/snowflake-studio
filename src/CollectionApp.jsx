import { useEffect, useRef, useState } from "react";
import BackgroundCanvas from "./components/BackgroundCanvas.jsx";
import SiteNav from "./components/SiteNav.jsx";
import CollectionGrid from "./components/CollectionGrid.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import { useConfirm } from "./hooks/useConfirm.js";
import { createCollectionBackground } from "./collection/background.js";
import {
  isNonEmptyStudioStatePresent,
  loadCollectionItems,
  saveAsActiveStudioSnowflake,
  saveCollectionItems
} from "./snowflake/storage.js";

/** The Collection page: browse, edit, and delete saved snowflakes. */
export default function CollectionApp() {
  const backgroundCanvasRef = useRef(null);
  const backgroundRef = useRef(null);
  const [items, setItems] = useState(() => loadCollectionItems());
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

  return (
    <>
      <BackgroundCanvas ref={backgroundCanvasRef} />
      <main>
        <h1>Snowflake Studio</h1>
        <SiteNav current="collection" />
        <div className="subtitleRow">
          <p className="subtitle">Browse saved snowflake designs. No two snowflakes are alike.</p>
          <button
            id="clearCollectionBtn"
            className="helpButton"
            type="button"
            disabled={items.length === 0}
            onClick={handleClear}
          >
            Clear all
          </button>
        </div>

        <section className="views collectionViews">
          <CollectionGrid items={items} onEdit={handleEdit} onDelete={handleDelete} />
        </section>
      </main>

      <ConfirmDialog {...dialogProps} />
    </>
  );
}
