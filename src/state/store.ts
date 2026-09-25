import { create } from "zustand";
import { type Command, type DocumentState, emptyDocument } from "./document";
import type { DragState } from "./drag";
import * as history from "./history";

/** The active tool decides whether the selection shows the move/rotate gizmo. */
export type Tool = "select" | "move";

type AppState = {
	doc: DocumentState;
	history: history.History;
	drag: DragState | null;
	tool: Tool;
	/** Whether the "new object" chooser is showing. */
	newObjectOpen: boolean;

	/** Runs a command and records an undo step if the document changed. */
	apply: (command: Command) => void;
	undo: () => void;
	redo: () => void;
	setDrag: (drag: DragState | null) => void;
	setTool: (tool: Tool) => void;
	setNewObjectOpen: (open: boolean) => void;
};

export const useAppStore = create<AppState>()((set, get) => ({
	doc: emptyDocument,
	history: history.emptyHistory,
	drag: null,
	tool: "move",
	newObjectOpen: false,

	apply: (command) => {
		const { doc } = get();
		const next = command(doc);
		if (next === doc) return;
		set({ doc: next, history: history.record(get().history, doc) });
	},
	undo: () => {
		const result = history.undo(get().history, get().doc);
		if (result) set({ ...result, drag: null });
	},
	redo: () => {
		const result = history.redo(get().history, get().doc);
		if (result) set({ ...result, drag: null });
	},
	setDrag: (drag) => set({ drag }),
	setTool: (tool) => set({ tool, drag: null }),
	setNewObjectOpen: (newObjectOpen) => set({ newObjectOpen }),
}));

/** Shorthand for non-React callers (keybindings, tools). */
export const applyCommand = (command: Command) =>
	useAppStore.getState().apply(command);
