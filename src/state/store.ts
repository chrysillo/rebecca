import { create } from "zustand";
import type { Id } from "@/model/types";
import type { CreatorState } from "@/state/creator";
import { type Command, type DocumentState, emptyDocument } from "@/state/document";
import type { DragState } from "@/state/drag";
import type { ExtrudeState } from "@/state/extrude";
import * as history from "@/state/history";

/** The active tool decides whether the selection shows the move/rotate gizmo. */
export type Tool = "select" | "move";

type AppState = {
	doc: DocumentState;
	history: history.History;
	drag: DragState | null;
	extrude: ExtrudeState | null;
	/** A short message for the user (e.g. why an action was refused); cleared by the UI after a moment. */
	notice: { text: string; id: number } | null;
	tool: Tool;
	/** The create wheel, when open. */
	creator: CreatorState | null;
	/** The stock entry used for the last new piece (preselected in the wheel next time). */
	lastCreated: Id | null;

	/** Runs a command and records an undo step if the document changed. */
	apply: (command: Command) => void;
	undo: () => void;
	redo: () => void;
	setDrag: (drag: DragState | null) => void;
	setExtrude: (extrude: ExtrudeState | null) => void;
	showNotice: (text: string) => void;
	clearNotice: () => void;
	setTool: (tool: Tool) => void;
	setCreator: (creator: CreatorState | null) => void;
	setLastCreated: (stockId: Id) => void;
};

export const useAppStore = create<AppState>()((set, get) => ({
	doc: emptyDocument,
	history: history.emptyHistory,
	drag: null,
	extrude: null,
	notice: null,
	tool: "move",
	creator: null,
	lastCreated: null,

	apply: (command) => {
		const { doc } = get();
		const next = command(doc);
		if (next === doc) return;
		set({ doc: next, history: history.record(get().history, doc) });
	},
	undo: () => {
		const result = history.undo(get().history, get().doc);
		if (result) set({ ...result, drag: null, extrude: null });
	},
	redo: () => {
		const result = history.redo(get().history, get().doc);
		if (result) set({ ...result, drag: null, extrude: null });
	},
	setDrag: (drag) => set({ drag }),
	setExtrude: (extrude) => set({ extrude }),
	showNotice: (text) => set({ notice: { text, id: Date.now() } }),
	clearNotice: () => set({ notice: null }),
	setTool: (tool) => set({ tool, drag: null }),
	setCreator: (creator) => set({ creator }),
	setLastCreated: (lastCreated) => set({ lastCreated }),
}));

/** Shorthand for non-React callers (keybindings, tools). */
export const applyCommand = (command: Command) =>
	useAppStore.getState().apply(command);
