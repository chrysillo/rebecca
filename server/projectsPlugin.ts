/// <reference types="node" />
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";
import { isValidProjectName } from "../src/persistence/projectName.ts";

const PREFIX = "/api/projects";

/**
 * Dev-server API that keeps each project as `<dir>/<name>.json`:
 *   GET    /api/projects               → [{ name, modified }], newest first
 *   GET    /api/projects/:name         → the file
 *   PUT    /api/projects/:name         → write (atomically, via a temp file)
 *   POST   /api/projects/:name/rename  → body { to }; 409 if taken
 *   DELETE /api/projects/:name
 */
export function projectsPlugin(dir: string): Plugin {
	const fileFor = (name: string) => path.join(dir, `${name}.json`);
	const exists = (file: string) =>
		stat(file).then(
			() => true,
			() => false,
		);

	async function handle(req: IncomingMessage, res: ServerResponse) {
		const url = new URL(req.url ?? "", "http://localhost");
		const [rawName, sub] = url.pathname.slice(PREFIX.length + 1).split("/");
		const name = rawName ? decodeURIComponent(rawName) : "";

		if (!name) {
			if (req.method !== "GET") return send(res, 405);
			await mkdir(dir, { recursive: true });
			const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
			const list = await Promise.all(
				files.map(async (f) => ({
					name: f.slice(0, -".json".length),
					modified: (await stat(path.join(dir, f))).mtimeMs,
				})),
			);
			list.sort((a, b) => b.modified - a.modified);
			return send(res, 200, list);
		}

		if (!isValidProjectName(name)) return send(res, 400, { error: "Bad name" });
		const file = fileFor(name);

		if (sub === "rename" && req.method === "POST") {
			const { to } = JSON.parse(await body(req)) as { to?: string };
			if (!to || !isValidProjectName(to))
				return send(res, 400, { error: "Bad name" });
			if (!(await exists(file))) return send(res, 404);
			if (await exists(fileFor(to)))
				return send(res, 409, { error: "Name taken" });
			await rename(file, fileFor(to));
			return send(res, 204);
		}
		if (sub) return send(res, 404);

		switch (req.method) {
			case "GET":
				if (!(await exists(file))) return send(res, 404);
				res.setHeader("Content-Type", "application/json");
				return res.end(await readFile(file));
			case "PUT": {
				const text = await body(req);
				try {
					JSON.parse(text);
				} catch {
					return send(res, 400, { error: "Not JSON" });
				}
				await mkdir(dir, { recursive: true });
				const tmp = `${file}.${process.pid}.tmp`;
				await writeFile(tmp, text);
				await rename(tmp, file);
				return send(res, 204);
			}
			case "DELETE":
				await rm(file, { force: true });
				return send(res, 204);
			default:
				return send(res, 405);
		}
	}

	return {
		name: "projects-api",
		configureServer(server) {
			server.middlewares.use(PREFIX, (req, res) => {
				// Mounted at PREFIX, so req.url has had it stripped; put it back for parsing.
				req.url = PREFIX + (req.url === "/" ? "" : req.url);
				handle(req, res).catch((err: Error) =>
					send(res, 500, { error: err.message }),
				);
			});
		},
	};
}

function send(res: ServerResponse, status: number, json?: unknown) {
	res.statusCode = status;
	if (json === undefined) return res.end();
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(json));
}

function body(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}
