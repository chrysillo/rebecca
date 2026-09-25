import { commands } from "@/commands";
import type { Action } from "@/input/keymap";
import { lastPointer } from "@/input/pointer";
import { useAppStore } from "@/state/store";
import { cancelCreator, openCreator } from "@/tools/creatorSession";
import { startExtrude } from "@/tools/extrudeSession";

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
	extrude: startExtrude,
	selectAll: () =>
		store().apply(commands.selectPieces(Object.keys(store().doc.pieces))),
	delete: () => store().apply(commands.deletePieces(store().doc.selection)),
	undo: () => store().undo(),
	redo: () => store().redo(),
	escape: () => {
		// Escape closes the wheel or cancels a drag first; otherwise it deselects.
		if (store().creator) cancelCreator();
		else if (store().drag) store().setDrag(null);
		else store().apply(commands.clearSelection);
	},
};
