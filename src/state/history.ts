import type { DocumentState } from "./document";

/** Snapshot undo/redo. Documents are small, so whole-state snapshots are the simplest correct approach. */
export type History = { past: DocumentState[]; future: DocumentState[] };

export const emptyHistory: History = { past: [], future: [] };

const LIMIT = 200;

export function record(history: History, previous: DocumentState): History {
	return { past: [...history.past, previous].slice(-LIMIT), future: [] };
}

export function undo(
	history: History,
	current: DocumentState,
): { history: History; doc: DocumentState } | null {
	const previous = history.past.at(-1);
	if (!previous) return null;
	return {
		doc: previous,
		history: {
			past: history.past.slice(0, -1),
			future: [current, ...history.future],
		},
	};
}

export function redo(
	history: History,
	current: DocumentState,
): { history: History; doc: DocumentState } | null {
	const next = history.future[0];
	if (!next) return null;
	return {
		doc: next,
		history: {
			past: [...history.past, current],
			future: history.future.slice(1),
		},
	};
}
