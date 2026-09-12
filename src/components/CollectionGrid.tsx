import CollectionTile from "./CollectionTile.tsx";

/** The collection grid, or an empty-state placeholder when nothing is saved. */
export default function CollectionGrid({ items, onEdit, onShare, onDelete, onPrint, onSaveInstructions, isSavingInstructions }) {
  const isEmpty = items.length === 0;

  return (
    <div className="panel collectionPanel">
      <h2 className="panelHeader"><span className="panelTitle">Collection</span></h2>
      <div id="collectionGrid" className="collectionGrid" aria-label="Saved snowflakes" hidden={isEmpty}>
        {items.map((item) => (
          <CollectionTile
            key={item.id}
            item={item}
            onEdit={onEdit}
            onShare={onShare}
            onDelete={onDelete}
            onPrint={onPrint}
            onSaveInstructions={onSaveInstructions}
            isSavingInstructions={isSavingInstructions}
          />
        ))}
      </div>
      <div id="collectionEmpty" className="collectionPlaceholder" role="status" hidden={!isEmpty}>
        No saved snowflakes yet. Go to Studio and choose Save to collection.
      </div>
    </div>
  );
}
