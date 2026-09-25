import { commands } from "@/commands";
import { extrudableDimension } from "@/geometry/extrude";
import type { PieceKind } from "@/model/types";
import { effectiveDistance } from "@/state/extrude";
import { useAppStore } from "@/state/store";

const store = () => useAppStore.getState();

/** E: start extruding the selected face(s) together, or explain why not. */
export function startExtrude() {
	const { doc, setExtrude, showNotice } = store();
	const faces = doc.selectedFaces.filter((f) => doc.pieces[f.pieceId]);
	if (faces.length === 0) {
		showNotice(
			"Click a face first (Shift+click for more), then press E to extrude.",
		);
		return;
	}
	const fixed = faces
		.map((f) => doc.pieces[f.pieceId])
		.find((piece, i) => !extrudableDimension(piece, faces[i]));
	if (fixed) {
		const which =
			faces.length > 1 ? `${fixed.name} has a face that` : "That face";
		showNotice(`${which} can't be extruded: ${FIXED_REASON[fixed.kind]}`);
		return;
	}
	setExtrude({
		faces,
		startParam: null,
		distance: 0,
		typed: "",
		snapTarget: null,
	});
}

const FIXED_REASON: Record<PieceKind, string> = {
	sheet: "a sheet's thickness is fixed.",
	framing: "a framing piece's width and depth are fixed.",
};

/** Applies the extrude as one undoable step. The faces stay selected for another extrude. */
export function confirmExtrude() {
	const { extrude, apply, setExtrude } = store();
	if (!extrude) return;
	setExtrude(null);
	apply(commands.extrudeFaces(extrude.faces, effectiveDistance(extrude)));
}

export function cancelExtrude() {
	store().setExtrude(null);
}

/**
 * Keys while extruding: digits, "." and "-" type an exact distance, Backspace edits it,
 * Enter confirms, Escape cancels. Returns true when the key was used.
 */
export function handleExtrudeKey(e: KeyboardEvent): boolean {
	const { extrude, setExtrude } = store();
	if (!extrude) return false;
	if (e.key === "Enter") confirmExtrude();
	else if (e.key === "Escape") cancelExtrude();
	else if (e.key === "Backspace")
		setExtrude({ ...extrude, typed: extrude.typed.slice(0, -1) });
	else if (/^[0-9.]$/.test(e.key))
		setExtrude({ ...extrude, typed: extrude.typed + e.key });
	else if (e.key === "-" && extrude.typed === "")
		setExtrude({ ...extrude, typed: "-" });
	else return false;
	return true;
}
