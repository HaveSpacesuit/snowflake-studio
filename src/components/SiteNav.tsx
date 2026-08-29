/** Primary navigation between the Studio editor and the saved Collection. */
export default function SiteNav({ current }) {
  return (
    <nav className="siteNav" aria-label="Primary">
      <a className="navLink" href="index.html" aria-current={current === "studio" ? "page" : undefined}>
        Studio
      </a>
      <a className="navLink" href="collection.html" aria-current={current === "collection" ? "page" : undefined}>
        Collection
      </a>
    </nav>
  );
}
