import { create } from "zustand";
import { CONFIG } from "../config";
import type { PieceKind } from "../model/types";
import type { CreatorState, Presets } from "./creator";
import { type Command, type DocumentState, emptyDocument } from "./document";
import type { DragState } from "./drag";
import type { ExtrudeState } from "./extrude";
import * as history from "./history";

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
	/** Sizes new pieces are created with, and which kind was created last (preselected next time). */
	presets: Presets;
	lastCreated: PieceKind;

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
	setPresets: (presets: Presets) => void;
	setLastCreated: (kind: PieceKind) => void;
};

export const useAppStore = create<AppState>()((set, get) => ({
	doc: emptyDocument,
	history: history.emptyHistory,
	drag: null,
	extrude: null,
	notice: null,
	tool: "move",
	creator: null,
	presets: {
		sheet: { thickness: CONFIG.defaults.sheet.thickness },
		framing: {
			width: CONFIG.defaults.framing.width,
			depth: CONFIG.defaults.framing.depth,
		},
	},
	lastCreated: "sheet",

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
	setPresets: (presets) => set({ presets }),
	setLastCreated: (lastCreated) => set({ lastCreated }),
}));

/** Shorthand for non-React callers (keybindings, tools). */
export const applyCommand = (command: Command) =>
	useAppStore.getState().apply(command);
