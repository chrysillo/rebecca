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

/** Renders and downloads the views sheet; registered by `ViewExporter` while the 3D view is mounted. */
let renderViews: (() => Promise<void>) | null = null;

/** Registers the views renderer; returns the unregister function (an effect cleanup). */
export function setViewsRenderer(render: () => Promise<void>) {
	renderViews = render;
	return () => {
		if (renderViews === render) renderViews = null;
	};
}

/** Downloads a sheet of the Top, Right, Left and Perspective views with their dimensions. */
export function exportViews() {
	const { doc, showNotice } = useAppStore.getState();
	if (Object.keys(doc.pieces).length === 0) {
		showNotice("Nothing to export yet.");
		return;
	}
	void renderViews?.();
}
