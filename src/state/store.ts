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
 * The active tool: "select" picks things and shows the move/rotate gizmo on selected pieces,
 * "measure" turns face clicks into dimension lines.
 */
export type Tool = "select" | "measure";

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
	/** True while views are being exported: gizmos, grid and overlays are hidden. */
	exporting: boolean;
	/** The right-click menu for a piece, at a screen position (px), when open. */
	contextMenu: { pieceId: Id; x: number; y: number } | null;
	/**
	 * A request for the object list to open, unfold and scroll to a piece, optionally starting a
	 * rename there; `id` makes repeats count.
	 */
	reveal: { pieceId: Id; rename: boolean; id: number } | null;
	/** The piece under the pointer, in the 3D view or the object list. */
	hovered: Id | null;

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
	setExporting: (exporting: boolean) => void;
	setContextMenu: (menu: AppState["contextMenu"]) => void;
	revealInList: (pieceId: Id, options?: { rename?: boolean }) => void;
	setHovered: (hovered: Id | null) => void;
};

export const useAppStore = create<AppState>()((set, get) => ({
	doc: emptyDocument,
	history: history.emptyHistory,
	drag: null,
	extrude: null,
	notice: null,
	tool: "select",
	measureStart: null,
	measureHover: null,
	creator: null,
	joiner: null,
	lastCreated: null,
	exporting: false,
	contextMenu: null,
	reveal: null,
	hovered: null,

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
	setExporting: (exporting) => set({ exporting }),
	setContextMenu: (contextMenu) => set({ contextMenu }),
	revealInList: (pieceId, options) =>
		set({
			reveal: { pieceId, rename: options?.rename ?? false, id: Date.now() },
		}),
	setHovered: (hovered) => set({ hovered }),
}));

/** Shorthand for non-React callers (keybindings, tools). */
export const applyCommand = (command: Command) =>
	useAppStore.getState().apply(command);
