import { create } from "zustand";
import type { EdgeRef } from "@/geometry/box";
import type { Id } from "@/model/types";
import type { CreatorState } from "@/state/creator";
import {
	type Command,
	type DocumentState,
	emptyDocument,
} from "@/state/document";
import type { DragState } from "@/state/drag";
import type { ExtrudeState } from "@/state/extrude";
import * as history from "@/state/history";
import type { JoinerState } from "@/state/joiner";

/**
 * The active tool: "move" shows the move/rotate gizmo on the selection, "select" hides it,
 * "measure" turns face clicks into dimension lines.
 */
export type Tool = "select" | "move" | "measure";

type AppState = {
	doc: DocumentState;
	history: history.History;
	drag: DragState | null;
	extrude: ExtrudeState | null;
	/** A short message for the user (e.g. why an action was refused); cleared by the UI after a moment. */
	notice: { text: string; id: number } | null;
	tool: Tool;
	/** Measure tool: the edge the next measurement starts from (the last one clicked). */
	measureStart: EdgeRef | null;
	/** Measure tool: the edge under the pointer. */
	measureHover: EdgeRef | null;
	/** The create wheel, when open. */
	creator: CreatorState | null;
	/** The join wheel, when open. */
	joiner: JoinerState | null;
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
	setMeasureStart: (edge: EdgeRef | null) => void;
	setMeasureHover: (edge: EdgeRef | null) => void;
	setCreator: (creator: CreatorState | null) => void;
	setJoiner: (joiner: JoinerState | null) => void;
	setLastCreated: (stockId: Id) => void;
};

export const useAppStore = create<AppState>()((set, get) => ({
	doc: emptyDocument,
	history: history.emptyHistory,
	drag: null,
	extrude: null,
	notice: null,
	tool: "move",
	measureStart: null,
	measureHover: null,
	creator: null,
	joiner: null,
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
	setTool: (tool) =>
		set({ tool, drag: null, measureStart: null, measureHover: null }),
	setMeasureStart: (measureStart) => set({ measureStart }),
	setMeasureHover: (measureHover) => set({ measureHover }),
	setCreator: (creator) => set({ creator }),
	setJoiner: (joiner) => set({ joiner }),
	setLastCreated: (lastCreated) => set({ lastCreated }),
}));

/** Shorthand for non-React callers (keybindings, tools). */
export const applyCommand = (command: Command) =>
	useAppStore.getState().apply(command);
