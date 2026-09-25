import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { projectsPlugin } from "./server/projectsPlugin.ts";

const __dirname = import.meta.dirname;

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		projectsPlugin(path.resolve(__dirname, "projects")),
	],
	// Autosaves land in projects/; they must not trigger a reload.
	server: { watch: { ignored: ["**/projects/**"] } },
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
