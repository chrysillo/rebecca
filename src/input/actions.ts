import { commands } from "@/commands";
import type { Action } from "@/input/keymap";
import { lastPointer } from "@/input/pointer";
import { exportViews } from "@/scene/ViewExporter";
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
import { exportCutList } from "@/ui/exports";

const store = () => useAppStore.getState();

/** What each action does. Shared by the keyboard and the tool strip. */
export const ACTIONS: Record<Action, () => void> = {
	// Opens the create wheel at the mouse, last-used kind preselected. (Keys inside it are handled by the wheel.)
	newObject: () =>
		store().creator ? cancelCreator() : openCreator(lastPointer()),
	selectTool: () => store().setTool("select"),
	// Toggles: pressing again goes back to the select tool.
	measureTool: () =>
		store().setTool(store().tool === "measure" ? "select" : "measure"),
	extrude: startExtrude,
	// Opens the join wheel at the mouse to pick which overlapping piece gets cut.
	join: () => (store().joiner ? cancelJoiner() : openJoiner(lastPointer())),
	exportCutList,
	exportViews,
	// Groups the selection; if it's already exactly one group, ungroups it (so the button toggles).
	group: () => {
		const before = store().doc;
		store().apply(commands.groupSelection);
		if (store().doc === before) store().apply(commands.ungroupSelection);
	},
	ungroup: () => store().apply(commands.ungroupSelection),
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
