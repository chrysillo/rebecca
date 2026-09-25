import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";
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
	test: {
		// Node would load these packages' CommonJS builds, which can't require three; bundle their ES source.
		server: { deps: { inline: [/three-bvh-csg/, /three-mesh-bvh/] } },
		alias: {
			"three-bvh-csg": path.resolve(
				__dirname,
				"node_modules/three-bvh-csg/src/index.js",
			),
			"three-mesh-bvh": path.resolve(
				__dirname,
				"node_modules/three-mesh-bvh/src/index.js",
			),
		},
	},
});
