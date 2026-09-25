import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { useAppStore } from "@/state/store";
import "./styles.css";

// Dev only: lets the browser console (and scripted checks) inspect the document.
if (import.meta.env.DEV) Object.assign(window, { appStore: useAppStore });

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
