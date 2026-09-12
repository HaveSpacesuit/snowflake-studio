import { useRef } from "react";
import { normalizeStoredGeom } from "../snowflake/storage.ts";
import { normalizeSnowflakeOptions } from "../snowflake/options.ts";
import { PRINT_CONFIG } from "../print/config.ts";
import { useToolbarOverflow } from "../hooks/useToolbarOverflow.ts";
import ToolbarMoreMenu from "./ToolbarMoreMenu.tsx";

/** A single saved snowflake with Edit/Share/Delete actions plus a "More" menu for print/save. */
export default function CollectionTile({ item, onEdit, onShare, onDelete, onPrint, onSaveInstructions, isSavingInstructions }) {
  const editableGeom = normalizeStoredGeom(item.paperGeom);
  const hasEditableGeom = Boolean(editableGeom);
  const canPrint = normalizeSnowflakeOptions(item.options).sideCount === PRINT_CONFIG.supportedSideCount;

  const actionsRef = useRef(null);
  const editBtnRef = useRef(null);
  const shareBtnRef = useRef(null);
  const deleteBtnRef = useRef(null);
  const moreBtnRef = useRef(null);
  const compact = useToolbarOverflow(actionsRef, [editBtnRef, shareBtnRef, deleteBtnRef, moreBtnRef]);

  // Print/Save instructions always live in the "More" menu; Share/Delete join
  // them (above a divider) only once the toolbar is too narrow to show every button.
  const menuItems = [
    ...(compact
      ? [
          {
            key: "share",
            label: "Share",
            disabled: !hasEditableGeom,
            title: hasEditableGeom ? "Save this snowflake as a file to share" : "This saved snowflake cannot be shared",
            onClick: () => onShare(item)
          },
          { key: "delete", label: "Delete", onClick: () => onDelete(item) }
        ]
      : []),
    {
      key: "print",
      label: "Print instructions",
      disabled: !canPrint,
      dividerBefore: compact,
      title: canPrint ? "Print cutting instructions for this snowflake" : "Printing instructions is available for six-sided snowflakes only.",
      onClick: () => onPrint(item)
    },
    {
      key: "save-instructions",
      label: isSavingInstructions ? "Saving..." : "Save instructions",
      disabled: !canPrint || isSavingInstructions,
      busy: isSavingInstructions,
      title: canPrint ? "Save this snowflake's instructions as a PDF" : "Saving instructions is available for six-sided snowflakes only.",
      onClick: () => onSaveInstructions(item)
    }
  ];

  return (
    <article className="collectionTile">
      {/* SVG is generated and stored by this app; render it as markup for the preview. */}
      <div className="collectionTilePreview" dangerouslySetInnerHTML={{ __html: item.previewSvg }} />
      <div className="collectionTileActions panelActions" ref={actionsRef}>
        <button
          type="button"
          ref={editBtnRef}
          className="collectionEditBtn"
          disabled={!hasEditableGeom}
          title={hasEditableGeom ? "Load this snowflake into Studio" : "This saved snowflake cannot be edited"}
          onClick={() => onEdit(editableGeom, normalizeSnowflakeOptions(item.options))}
        >
          Edit
        </button>
        <button
          type="button"
          ref={shareBtnRef}
          className="collectionShareBtn"
          hidden={compact}
          disabled={!hasEditableGeom}
          title={hasEditableGeom ? "Save this snowflake as a file to share" : "This saved snowflake cannot be shared"}
          onClick={() => onShare(item)}
        >
          Share
        </button>
        <button type="button" ref={deleteBtnRef} className="collectionDeleteBtn" hidden={compact} onClick={() => onDelete(item)}>
          Delete
        </button>
        <ToolbarMoreMenu ref={moreBtnRef} items={menuItems} />
      </div>
    </article>
  );
}
