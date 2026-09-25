import { cutList, cutListText } from "@/model/cutList";
import { useAppStore } from "@/state/store";

/** Copies the project's cut list to the clipboard: identical pieces counted together, joints ignored. */
export function exportCutList() {
	const { doc, showNotice } = useAppStore.getState();
	const pieces = Object.values(doc.pieces);
	if (pieces.length === 0) {
		showNotice("Nothing to export yet.");
		return;
	}
	void navigator.clipboard
		.writeText(cutListText(cutList(pieces)))
		.then(() => showNotice("Cut list copied to clipboard."))
		.catch(() => showNotice("Couldn't copy the cut list."));
}
