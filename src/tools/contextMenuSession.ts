import { commands } from "@/commands";
import { shortcutLabel } from "@/input/keymap";
import { cutListKey } from "@/model/cutListKey";
import { expandToGroups, groupOf, groupsWithin } from "@/model/group";
import type { Id, Transform } from "@/model/types";
import type { Command, DocumentState } from "@/state/document";
import { applyCommand, useAppStore } from "@/state/store";

/** Max pointer travel (px) between right press and release for it to open the menu, not orbit. */
const CLICK_SLOP = 4;

/**
 * Called on a right press over a piece. Right-drag orbits the camera, so the menu only opens if
 * the button comes up close to where it went down.
 */
export function armContextMenu(pieceId: Id, down: PointerEvent) {
	const onUp = (up: PointerEvent) => {
		if (up.button !== 2) return;
		window.removeEventListener("pointerup", onUp);
		if (
			Math.hypot(up.clientX - down.clientX, up.clientY - down.clientY) >
			CLICK_SLOP
		)
			return;
		openContextMenu(pieceId, up.clientX, up.clientY);
	};
	window.addEventListener("pointerup", onUp);
}

export const openContextMenu = (pieceId: Id, x: number, y: number) =>
	useAppStore.getState().setContextMenu({ pieceId, x, y });

export const closeContextMenu = () =>
	useAppStore.getState().setContextMenu(null);

export type MenuItem =
	| {
			label: string;
			shortcut?: string;
			disabled?: boolean;
			danger?: boolean;
			run: () => void;
	  }
	| "separator";

/**
 * What an action applies to: the whole selection if the piece is part of it (as in a file
 * manager), otherwise the piece and the rest of its group.
 */
export const menuTargets = (doc: DocumentState, pieceId: Id): Id[] =>
	doc.selection.includes(pieceId)
		? doc.selection
		: expandToGroups(doc.groups, [pieceId]);

/** Every piece with the same cut (the same cut-list line) as this one. */
export const sameCut = (doc: DocumentState, pieceId: Id): Id[] => {
	const key = cutListKey(doc.pieces[pieceId]);
	return Object.values(doc.pieces)
		.filter((p) => cutListKey(p) === key)
		.map((p) => p.id);
};

/** Selects the targets and runs `then` on them, as one undo step. */
const onTargets =
	(targets: Id[], then: Command): Command =>
	(doc) =>
		then(commands.selectPieces(targets)(doc));

/** Copies the pieces in place (right on top of the originals) and selects the copies. */
const duplicateInPlace = (doc: DocumentState, ids: Id[]): Command => {
	const transforms: Record<Id, Transform> = {};
	for (const id of ids) {
		const p = doc.pieces[id];
		if (p) transforms[id] = { position: p.position, rotation: p.rotation };
	}
	return commands.duplicatePiecesTo(transforms);
};

const count = (n: number, one: string, many: string) =>
	n === 1 ? one : `${many} (${n})`;

/** The menu for a right-clicked piece, top to bottom. */
export function menuItems(doc: DocumentState, pieceId: Id): MenuItem[] {
	const targets = menuTargets(doc, pieceId);
	const cut = sameCut(doc, pieceId);
	const inGroup = !!groupOf(doc.groups, pieceId);
	const anyGrouped = targets.some((id) => groupOf(doc.groups, id));
	const oneWholeGroup = (() => {
		const within = groupsWithin(doc.groups, targets);
		return within.length === 1 && within[0].pieceIds.length === targets.length;
	})();
	const { revealInList } = useAppStore.getState();

	return [
		{
			label: inGroup ? "Select group" : "Select",
			run: () => applyCommand(commands.selectObjects([pieceId])),
		},
		{
			label: `Select same cut (${cut.length})`,
			disabled: cut.length < 2,
			run: () => applyCommand(commands.selectPieces(cut)),
		},
		"separator",
		{
			label: count(targets.length, "Duplicate", "Duplicate"),
			run: () => applyCommand(duplicateInPlace(doc, targets)),
		},
		anyGrouped && (oneWholeGroup || targets.length < 2)
			? {
					label: "Ungroup",
					shortcut: shortcutLabel("ungroup"),
					run: () =>
						applyCommand(onTargets(targets, commands.ungroupSelection)),
				}
			: {
					label: count(targets.length, "Group", "Group"),
					shortcut: shortcutLabel("group"),
					disabled: targets.length < 2,
					run: () => applyCommand(onTargets(targets, commands.groupSelection)),
				},
		{
			label: "Rename",
			run: () => revealInList(pieceId, { rename: true }),
		},
		{ label: "Show in object list", run: () => revealInList(pieceId) },
		"separator",
		{
			label: count(targets.length, "Delete", "Delete"),
			shortcut: shortcutLabel("delete"),
			danger: true,
			run: () => applyCommand(commands.deletePieces(targets)),
		},
	];
}
