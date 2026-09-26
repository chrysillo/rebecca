import { commands } from "@/commands";
import { type FaceRef, faceCentre, sameFace } from "@/geometry/box";
import {
	coplanarFaceGroups,
	extrudableDimension,
	extrudableFaces,
} from "@/geometry/extrude";
import { lastPointer } from "@/input/pointer";
import { toScreen } from "@/input/screen";
import type { PieceKind } from "@/model/types";
import { effectiveDistance, primaryFace } from "@/state/extrude";
import { selectedPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { facesNearestPointer } from "@/tools/extrudeTool";

const store = () => useAppStore.getState();

/**
 * E: start extruding the selected face(s) together. With whole pieces selected instead, the
 * extrudable face nearest the mouse moves, along with every selected face in its plane
 * (Tab picks another). Otherwise explains why not.
 * Returns whether an extrude started.
 */
export function startExtrude() {
	const { doc, showNotice } = store();
	const faces = doc.selectedFaces.filter((f) => doc.pieces[f.pieceId]);
	if (faces.length === 0) return startPieceExtrude();
	const fixed = faces
		.map((f) => doc.pieces[f.pieceId])
		.find((piece, i) => !extrudableDimension(piece, faces[i]));
	if (fixed) {
		const which =
			faces.length > 1 ? `${fixed.name} has a face that` : "That face";
		showNotice(`${which} can't be extruded: ${FIXED_REASON[fixed.kind]}`);
		return false;
	}
	return beginExtrude(faces);
}

/**
 * Extrudes the selected pieces' face nearest the mouse, with the other selected faces in its
 * plane (so four legs' ends move as one). Tab then steps to the next nearest set.
 */
function startPieceExtrude() {
	const { doc, showNotice } = store();
	const pieces = selectedPieces(doc);
	const faces = pieces.flatMap((piece) =>
		extrudableFaces(piece).map((face) => ({
			face,
			at: toScreen(faceCentre(piece, face)),
		})),
	);
	if (faces.length === 0) {
		showNotice(
			doc.selection.length > 0
				? "Nothing selected can be extruded."
				: "Select a piece or click a face, then press E to extrude.",
		);
		return false;
	}
	const choices = groupsNearestFirst(
		facesNearestPointer(faces, lastPointer()),
		coplanarFaceGroups(pieces),
	);
	return beginExtrude(choices[0], choices);
}

/**
 * The groups in the order their nearest face comes in `ranked`, each with that face last so it
 * is the primary one (it follows the mouse and carries the readout).
 */
function groupsNearestFirst(
	ranked: FaceRef[],
	groups: FaceRef[][],
): FaceRef[][] {
	const seen = new Set<FaceRef[]>();
	return ranked.flatMap((face) => {
		const group = groups.find((g) => g.some((f) => sameFace(f, face)));
		if (!group || seen.has(group)) return [];
		seen.add(group);
		return [[...group.filter((f) => !sameFace(f, face)), face]];
	});
}

/** Starts an extrude of exactly these faces, e.g. from a resize handle. Returns false if one is fixed. */
export function beginExtrude(faces: FaceRef[], choices: FaceRef[][] = []) {
	const { doc, setExtrude } = store();
	const movable = faces.every((f) => {
		const piece = doc.pieces[f.pieceId];
		return piece && extrudableDimension(piece, f);
	});
	if (!movable || faces.length === 0) return false;
	setExtrude({
		faces,
		choices,
		startParam: null,
		distance: 0,
		typed: "",
		snapTarget: null,
	});
	return true;
}

/** Tab / Shift+Tab: extrude the next (or previous) set of faces instead, starting again from zero. */
function cycleFace(step: 1 | -1) {
	const { extrude, setExtrude } = store();
	if (!extrude || extrude.choices.length < 2) return;
	const { choices } = extrude;
	const primary = primaryFace(extrude);
	const at = choices.findIndex((g) => g.some((f) => sameFace(f, primary)));
	const next = choices[(at + step + choices.length) % choices.length];
	setExtrude({
		...extrude,
		faces: next,
		startParam: null,
		distance: 0,
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
 * Tab picks another face (when extruding a whole piece), Enter confirms, Escape cancels. Returns true when the key was used.
 */
export function handleExtrudeKey(
	e: Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey">,
): boolean {
	const { extrude, setExtrude } = store();
	if (!extrude) return false;
	if (e.key === "Enter") confirmExtrude();
	else if (e.key === "Escape") cancelExtrude();
	else if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
		if (extrude.choices.length < 2) return false;
		cycleFace(e.shiftKey ? -1 : 1);
	} else if (e.key === "Backspace")
		setExtrude({ ...extrude, typed: extrude.typed.slice(0, -1) });
	else if (/^[0-9.]$/.test(e.key))
		setExtrude({ ...extrude, typed: extrude.typed + e.key });
	else if (e.key === "-" && extrude.typed === "")
		setExtrude({ ...extrude, typed: "-" });
	else return false;
	return true;
}
