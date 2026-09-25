import { commands } from "@/commands";
import { type Aabb, pieceAabb } from "@/geometry/box";
import { piecesOverlap } from "@/geometry/overlap";
import type { ScreenPoint } from "@/input/pointer";
import { toScreen } from "@/input/screen";
import { wheelBeside } from "@/input/wheelPlacement";
import { pieceSize } from "@/model/dimensions";
import type { Id, Piece } from "@/model/types";
import type { DocumentState } from "@/state/document";
import type { JoinerState } from "@/state/joiner";
import { selectedPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";

const store = () => useAppStore.getState();

/** Holding J at least this long, then releasing, confirms (like the create wheel). */
const HOLD_MS = 250;

const volume = (p: Piece) => {
	const s = pieceSize(p);
	return s.x * s.y * s.z;
};

/** The other selected pieces that overlap `target`: what cutting it would cut with. */
export function toolsFor(doc: DocumentState, target: Id): Id[] {
	const piece = doc.pieces[target];
	if (!piece) return [];
	return selectedPieces(doc)
		.filter((p) => p.id !== target && piecesOverlap(piece, p))
		.map((p) => p.id);
}

/** Room (mm) kept around a joint for the preview, which pulls the cutting piece clear of it. */
const JOINT_MARGIN = 120;

/**
 * Where the wheel goes: beside the joints (where the selected pieces overlap), not over them,
 * so the preview stays in view. Long pieces often run off screen, so it's the joints that
 * must stay clear, not the whole pieces. Null if there's no room (it then opens at the pointer).
 */
function wheelSpot(doc: DocumentState, ids: Id[]): ScreenPoint | null {
	const boxes: Aabb[] = [];
	for (const [i, a] of ids.entries())
		for (const b of ids.slice(i + 1)) {
			const pa = doc.pieces[a];
			const pb = doc.pieces[b];
			if (!piecesOverlap(pa, pb)) continue;
			const A = pieceAabb(pa);
			const B = pieceAabb(pb);
			boxes.push({
				min: {
					x: Math.max(A.min.x, B.min.x),
					y: Math.max(A.min.y, B.min.y),
					z: Math.max(A.min.z, B.min.z),
				},
				max: {
					x: Math.min(A.max.x, B.max.x),
					y: Math.min(A.max.y, B.max.y),
					z: Math.min(A.max.z, B.max.z),
				},
			});
		}
	const points = boxes.flatMap((box) => {
		const corners = [];
		for (const x of [box.min.x - JOINT_MARGIN, box.max.x + JOINT_MARGIN])
			for (const y of [box.min.y - JOINT_MARGIN, box.max.y + JOINT_MARGIN])
				for (const z of [box.min.z - JOINT_MARGIN, box.max.z + JOINT_MARGIN])
					corners.push(toScreen({ x, y, z }));
		return corners.filter((c) => c !== null);
	});
	if (points.length === 0) return null;
	return wheelBeside(
		{
			minX: Math.min(...points.map((c) => c.x)),
			minY: Math.min(...points.map((c) => c.y)),
			maxX: Math.max(...points.map((c) => c.x)),
			maxY: Math.max(...points.map((c) => c.y)),
		},
		{ width: window.innerWidth, height: window.innerHeight },
	);
}

/**
 * Opens the wheel beside the pieces, offering each selected piece that overlaps another. It starts
 * on the piece already cut if they're joined (picking the other flips the joint), else the largest:
 * usually the one that gets cut (a side panel housing a shelf, a leg taking a rail).
 */
export function openJoiner(at: ScreenPoint) {
	const { doc } = store();
	if (doc.selection.length < 2) {
		store().showNotice("Select two or more overlapping pieces to join.");
		return;
	}
	const options = selectedPieces(doc)
		.filter((p) => toolsFor(doc, p.id).length > 0)
		.map((p) => p.id);
	if (options.length === 0) {
		store().showNotice("The selected pieces don't overlap.");
		return;
	}
	const screen = wheelSpot(doc, options);
	// Already joined: start on the piece that's cut now, so the wheel shows how things stand.
	const alreadyCut = options.find((id) =>
		Object.values(doc.joints).some(
			(j) => j.target === id && options.includes(j.tool),
		),
	);
	const preselect =
		alreadyCut ??
		options.reduce((best, id) =>
			volume(doc.pieces[id]) > volume(doc.pieces[best]) ? id : best,
		);
	store().setJoiner({
		at: screen ?? at,
		options,
		highlighted: preselect,
		openedAt: performance.now(),
	});
}

export function cancelJoiner() {
	store().setJoiner(null);
}

export function highlightJoin(id: Id) {
	const j = store().joiner;
	if (j && j.highlighted !== id && j.options.includes(id))
		store().setJoiner({ ...j, highlighted: id });
}

/** Moves the highlight to the next (+1) or previous (−1) option. */
export function cycleJoin(step: 1 | -1) {
	const j = store().joiner;
	if (!j) return;
	const i = j.options.indexOf(j.highlighted);
	highlightJoin(j.options[(i + step + j.options.length) % j.options.length]);
}

/** The document as it would be if the wheel were confirmed now (for the live preview). */
export function joinPreview(
	doc: DocumentState,
	joiner: JoinerState | null,
): DocumentState {
	if (!joiner) return doc;
	return commands.joinInto(
		joiner.highlighted,
		toolsFor(doc, joiner.highlighted),
	)(doc);
}

/** Cuts the highlighted piece with every selected piece overlapping it, then closes. One undo step. */
export function confirmJoin() {
	const { joiner, doc } = store();
	store().setJoiner(null);
	if (!joiner) return;
	const next = joinPreview(doc, joiner);
	if (next === doc) {
		store().showNotice("Those pieces are already joined.");
		return;
	}
	store().apply(() => next);
	// The cut ends up hidden inside the tool, so say what happened.
	const cut = doc.pieces[joiner.highlighted];
	const tools = toolsFor(doc, joiner.highlighted).map(
		(id) => doc.pieces[id].name,
	);
	store().showNotice(
		`Cut ${cut.name} with ${tools.join(", ")}. Press J to see it again.`,
	);
}

/** Keys while the wheel is open. Returns true when the key was used. */
export function handleJoinerKey(e: KeyboardEvent): boolean {
	const joiner = store().joiner;
	if (!joiner) return false;
	// Holding J auto-repeats; the wheel is already open.
	if (e.repeat && e.code === "KeyJ") return true;
	const optionNumber = Number(e.key);
	if (e.key === "Enter" || e.key === " ") confirmJoin();
	else if (e.key === "Escape") cancelJoiner();
	else if (
		e.code === "KeyJ" ||
		e.key === "ArrowRight" ||
		e.key === "ArrowDown" ||
		e.key === "Tab"
	)
		cycleJoin(1);
	else if (e.key === "ArrowLeft" || e.key === "ArrowUp") cycleJoin(-1);
	else if (optionNumber >= 1 && optionNumber <= joiner.options.length)
		highlightJoin(joiner.options[optionNumber - 1]);
	else return false;
	return true;
}

/** Releasing J after holding it confirms; a quick tap leaves the wheel open. */
export function handleJoinerKeyUp(e: KeyboardEvent) {
	const joiner = store().joiner;
	if (joiner && e.code === "KeyJ" && e.timeStamp - joiner.openedAt >= HOLD_MS)
		confirmJoin();
}
