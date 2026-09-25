import { commands } from "../commands";
import { useAppStore } from "../state/store";
import { cancelCreator, openCreator } from "../tools/creatorSession";
import { startExtrude } from "../tools/extrudeSession";
import type { Action } from "./keymap";
import { lastPointer } from "./pointer";

const store = () => useAppStore.getState();

/** What each action does. Shared by the keyboard and the tool strip. */
export const ACTIONS: Record<Action, () => void> = {
	// Opens the create wheel at the mouse, last-used kind preselected. (Keys inside it are handled by the wheel.)
	newObject: () =>
		store().creator ? cancelCreator() : openCreator(lastPointer()),
	selectTool: () => store().setTool("select"),
	moveTool: () => store().setTool("move"),
	extrude: startExtrude,
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
