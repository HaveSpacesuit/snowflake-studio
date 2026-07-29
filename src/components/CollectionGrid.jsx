import CollectionTile from "./CollectionTile.jsx";

/** The collection grid, or an empty-state placeholder when nothing is saved. */
export default function CollectionGrid({ items, onEdit, onDelete }) {
  const isEmpty = items.length === 0;

  return (
    <div className="panel collectionPanel">
      <h2 className="panelHeader"><span className="panelTitle">Collection</span></h2>
      <div id="collectionGrid" className="collectionGrid" aria-label="Saved snowflakes" hidden={isEmpty}>
        {items.map((item) => (
          <CollectionTile key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <div id="collectionEmpty" className="collectionPlaceholder" role="status" hidden={!isEmpty}>
        No saved snowflakes yet. Go to Studio and choose Save to collection.
      </div>
    </div>
  );
}
