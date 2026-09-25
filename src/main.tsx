import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { startAutosave } from "@/persistence/autosave";
import { bootProjects } from "@/state/projects";
import { useAppStore } from "@/state/store";
import "./styles.css";

// Dev only: lets the browser console (and scripted checks) inspect the document.
if (import.meta.env.DEV) Object.assign(window, { appStore: useAppStore });

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Load the project before anything can edit it, so autosave never overwrites a file with an empty document.
await bootProjects();
startAutosave();

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
