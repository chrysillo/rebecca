import { commands } from "@/commands";
import type { Action } from "@/input/keymap";
import { lastPointer } from "@/input/pointer";
import {
	closeTab,
	cycleTab,
	newProject,
	useProjectsStore,
} from "@/state/projects";
import { useAppStore } from "@/state/store";
import { cancelCreator, openCreator } from "@/tools/creatorSession";
import { startExtrude } from "@/tools/extrudeSession";
import { cancelJoiner, openJoiner } from "@/tools/joinSession";
import { cancelMeasure } from "@/tools/measureSession";

const store = () => useAppStore.getState();

/** What each action does. Shared by the keyboard and the tool strip. */
export const ACTIONS: Record<Action, () => void> = {
	// Opens the create wheel at the mouse, last-used kind preselected. (Keys inside it are handled by the wheel.)
	newObject: () =>
		store().creator ? cancelCreator() : openCreator(lastPointer()),
	// Toggles: pressing Select again brings the move/rotate gizmo back.
	selectTool: () =>
		store().setTool(store().tool === "select" ? "move" : "select"),
	moveTool: () => store().setTool("move"),
	// Toggles: pressing again goes back to the move tool.
	measureTool: () =>
		store().setTool(store().tool === "measure" ? "move" : "measure"),
	extrude: startExtrude,
	// Opens the join wheel at the mouse to pick which overlapping piece gets cut.
	join: () => (store().joiner ? cancelJoiner() : openJoiner(lastPointer())),
	selectAll: () =>
		store().apply(commands.selectPieces(Object.keys(store().doc.pieces))),
	delete: () => store().apply(commands.deletePieces(store().doc.selection)),
	undo: () => store().undo(),
	redo: () => store().redo(),
	escape: () => {
		// Escape closes the wheel, a half-made measurement or a drag first; otherwise it deselects.
		if (store().creator) cancelCreator();
		else if (store().joiner) cancelJoiner();
		else if (cancelMeasure()) return;
		else if (store().drag) store().setDrag(null);
		else store().apply(commands.clearSelection);
	},
	newProject: () => void newProject(),
	nextProject: () => cycleTab(1),
	prevProject: () => cycleTab(-1),
	closeProject: () => {
		const { active } = useProjectsStore.getState();
		if (active) void closeTab(active);
	},
};
