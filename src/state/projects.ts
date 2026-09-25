import { create } from "zustand";
import {
	deleteProject as apiDelete,
	renameProject as apiRename,
	listProjects,
	loadProject,
	ProjectApiError,
	type ProjectInfo,
	saveProject,
} from "@/persistence/api";
import { flush, markSaved } from "@/persistence/autosave";
import { isValidProjectName, nextFreeName } from "@/persistence/projectName";
import {
	type DocumentState,
	fromProjectFile,
	newDocument,
	toProjectFile,
} from "@/state/document";
import * as history from "@/state/history";
import { useAppStore } from "@/state/store";

/**
 * Open projects, shown as tabs. Each project is a JSON file in `projects/`, named after it.
 * The active project's document lives in the app store; the others wait in `sessions`
 * (with their undo history) until switched back to.
 */
type ProjectsState = {
	/** False when the project API isn't reachable (e.g. a static build); nothing is saved. */
	available: boolean;
	tabs: string[];
	active: string | null;
	saveStatus: "saved" | "saving" | "error";
};

export const useProjectsStore = create<ProjectsState>()(() => ({
	available: true,
	tabs: [],
	active: null,
	saveStatus: "saved",
}));

type Session = { doc: DocumentState; history: history.History };
const sessions = new Map<string, Session>();

const TABS_KEY = "rebecca.projectTabs";

function readStoredTabs(): { tabs: string[]; active: string | null } {
	try {
		const raw = localStorage.getItem(TABS_KEY);
		if (raw) return JSON.parse(raw);
	} catch {}
	return { tabs: [], active: null };
}

// Remember the open tabs so a reload restores them.
useProjectsStore.subscribe(({ tabs, active }) => {
	try {
		localStorage.setItem(TABS_KEY, JSON.stringify({ tabs, active }));
	} catch {}
});

const notify = (text: string) => useAppStore.getState().showNotice(text);
const errorText = (err: unknown) =>
	err instanceof Error ? err.message : String(err);

/** Puts a document in the app store as the one being edited, clearing tool state from the last one. */
function show(name: string, session: Session) {
	useAppStore.setState({
		doc: session.doc,
		history: session.history,
		drag: null,
		extrude: null,
		creator: null,
		measureStart: null,
		measureHover: null,
	});
	useProjectsStore.setState({ active: name });
	markSaved(session.doc);
}

async function fetchSession(name: string): Promise<Session> {
	const cached = sessions.get(name);
	if (cached) return cached;
	return {
		doc: fromProjectFile(await loadProject(name)),
		history: history.emptyHistory,
	};
}

/** Opens a project (adding a tab if needed) and makes it active. */
export async function openProject(name: string): Promise<void> {
	const { active, tabs } = useProjectsStore.getState();
	if (name === active) return;
	let next: Session;
	try {
		next = await fetchSession(name);
	} catch (err) {
		notify(`Couldn't open "${name}": ${errorText(err)}`);
		return;
	}
	await flush();
	if (active) {
		const { doc, history: h } = useAppStore.getState();
		sessions.set(active, { doc, history: h });
	}
	sessions.delete(name);
	if (!tabs.includes(name)) {
		// New tabs open next to the active one, as in VS Code.
		const at = active ? tabs.indexOf(active) + 1 : tabs.length;
		useProjectsStore.setState({
			tabs: [...tabs.slice(0, at), name, ...tabs.slice(at)],
		});
	}
	show(name, next);
}

/** Creates an empty project on disk, named "Untitled", "Untitled 2", …, and opens it. */
export async function newProject(): Promise<void> {
	if (!useProjectsStore.getState().available) return;
	try {
		const taken = (await listProjects()).map((p) => p.name);
		const name = nextFreeName([...taken, ...useProjectsStore.getState().tabs]);
		const doc = newDocument();
		await saveProject(name, toProjectFile(doc));
		sessions.set(name, { doc, history: history.emptyHistory });
		await openProject(name);
	} catch (err) {
		notify(`Couldn't create a project: ${errorText(err)}`);
	}
}

/** Closes a tab (the file stays). Closing the last one starts a new project. */
export async function closeTab(name: string): Promise<void> {
	const { tabs, active } = useProjectsStore.getState();
	const index = tabs.indexOf(name);
	if (index < 0) return;
	if (name === active) {
		const neighbour = tabs[index + 1] ?? tabs[index - 1];
		if (neighbour) await openProject(neighbour);
		else {
			await newProject();
			// newProject failed: keep the tab rather than leave nothing open.
			if (useProjectsStore.getState().active === name) return;
		}
	}
	sessions.delete(name);
	useProjectsStore.setState((s) => ({
		tabs: s.tabs.filter((t) => t !== name),
	}));
}

/** Moves to the next (or previous) tab, wrapping round. */
export function cycleTab(step: 1 | -1): void {
	const { tabs, active } = useProjectsStore.getState();
	if (tabs.length < 2 || !active) return;
	const next = tabs[(tabs.indexOf(active) + step + tabs.length) % tabs.length];
	void openProject(next);
}

/** Renames a project and its file. Returns false (with a notice) if the name can't be used. */
export async function renameProject(
	from: string,
	to: string,
): Promise<boolean> {
	to = to.trim();
	if (to === from) return true;
	if (!isValidProjectName(to)) {
		notify("Use letters, numbers, spaces, - _ ( ) and . (not first) only");
		return false;
	}
	try {
		if (from === useProjectsStore.getState().active) await flush();
		await apiRename(from, to);
	} catch (err) {
		notify(
			err instanceof ProjectApiError && err.status === 409
				? `There's already a project called "${to}"`
				: `Couldn't rename: ${errorText(err)}`,
		);
		return false;
	}
	const session = sessions.get(from);
	if (session) {
		sessions.delete(from);
		sessions.set(to, session);
	}
	useProjectsStore.setState((s) => ({
		tabs: s.tabs.map((t) => (t === from ? to : t)),
		active: s.active === from ? to : s.active,
	}));
	return true;
}

/** Deletes a project's file. Only for projects that aren't open. */
export async function deleteProject(name: string): Promise<void> {
	if (useProjectsStore.getState().tabs.includes(name)) return;
	try {
		await apiDelete(name);
	} catch (err) {
		notify(`Couldn't delete "${name}": ${errorText(err)}`);
	}
}

export const savedProjects = (): Promise<ProjectInfo[]> => listProjects();

/**
 * Opens the projects that were open last time, else the most recent one on disk, else a new one.
 * If the project API isn't there, carries on with an unsaved document.
 */
export async function bootProjects(): Promise<void> {
	let saved: ProjectInfo[];
	try {
		saved = await listProjects();
	} catch {
		useProjectsStore.setState({ available: false });
		notify("Projects can't be saved here (run npm run dev)");
		return;
	}
	const onDisk = new Set(saved.map((p) => p.name));
	const stored = readStoredTabs();
	const tabs = stored.tabs.filter((t) => onDisk.has(t));
	const first =
		(stored.active && tabs.includes(stored.active) ? stored.active : tabs[0]) ??
		saved[0]?.name;

	if (!first) return newProject();
	useProjectsStore.setState({ tabs: tabs.length ? tabs : [first] });
	try {
		show(first, await fetchSession(first));
	} catch (err) {
		notify(`Couldn't open "${first}": ${errorText(err)}`);
		useProjectsStore.setState({ tabs: [] });
		await newProject();
	}
}
