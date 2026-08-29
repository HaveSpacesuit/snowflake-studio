import { normalizeStoredGeom } from "../snowflake/storage.ts";
import { normalizeSnowflakeOptions } from "../snowflake/options.ts";

/** A single saved snowflake with Edit/Delete actions. */
export default function CollectionTile({ item, onEdit, onDelete }) {
  const editableGeom = normalizeStoredGeom(item.paperGeom);
  const hasEditableGeom = Boolean(editableGeom);

  return (
    <article className="collectionTile">
      {/* SVG is generated and stored by this app; render it as markup for the preview. */}
      <div className="collectionTilePreview" dangerouslySetInnerHTML={{ __html: item.svg }} />
      <div className="collectionTileActions panelActions">
        <button
          type="button"
          className="collectionEditBtn"
          disabled={!hasEditableGeom}
          title={hasEditableGeom ? "Load this snowflake into Studio" : "This saved snowflake cannot be edited"}
          onClick={() => onEdit(editableGeom, normalizeSnowflakeOptions(item.options))}
        >
          Edit
        </button>
        <button type="button" className="collectionDeleteBtn" onClick={() => onDelete(item)}>
          Delete
        </button>
      </div>
    </article>
  );
}
