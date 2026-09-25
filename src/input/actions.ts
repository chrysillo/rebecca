import { commands } from "../commands";
import { useAppStore } from "../state/store";
import type { Action } from "./keymap";

const store = () => useAppStore.getState();

/** What each action does. Shared by the keyboard and the tool strip. */
export const ACTIONS: Record<Action, () => void> = {
	newObject: () => store().setNewObjectOpen(!store().newObjectOpen),
	selectTool: () => store().setTool("select"),
	moveTool: () => store().setTool("move"),
	delete: () => store().apply(commands.deletePieces(store().doc.selection)),
	undo: () => store().undo(),
	redo: () => store().redo(),
	escape: () => {
		// Escape closes the chooser or cancels a drag first; otherwise it deselects.
		if (store().newObjectOpen) store().setNewObjectOpen(false);
		else if (store().drag) store().setDrag(null);
		else store().apply(commands.clearSelection);
	},
};
