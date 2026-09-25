import type { ProjectFile } from "@/state/document";

/** Client for the dev server's project files (see server/projectsPlugin.ts). */

export type ProjectInfo = { name: string; modified: number };

const url = (name?: string) =>
	name === undefined
		? "/api/projects"
		: `/api/projects/${encodeURIComponent(name)}`;

async function check(res: Response): Promise<Response> {
	if (res.ok) return res;
	const detail = await res.json().catch(() => null);
	throw new ProjectApiError(res.status, detail?.error ?? res.statusText);
}

export class ProjectApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export const listProjects = async (): Promise<ProjectInfo[]> =>
	(await check(await fetch(url()))).json();

export const loadProject = async (name: string): Promise<unknown> =>
	(await check(await fetch(url(name)))).json();

export async function saveProject(
	name: string,
	file: ProjectFile,
	options: { keepalive?: boolean } = {},
): Promise<void> {
	await check(
		await fetch(url(name), {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(file, null, "\t"),
			keepalive: options.keepalive,
		}),
	);
}

export async function renameProject(from: string, to: string): Promise<void> {
	await check(
		await fetch(`${url(from)}/rename`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ to }),
		}),
	);
}

export async function deleteProject(name: string): Promise<void> {
	await check(await fetch(url(name), { method: "DELETE" }));
}
