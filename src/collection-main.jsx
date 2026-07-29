import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CollectionApp from "./CollectionApp.jsx";
import "./styles/style.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CollectionApp />
  </StrictMode>
);
