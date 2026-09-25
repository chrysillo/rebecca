import { selectPieces } from "@/commands/selection";
import { newId } from "@/model/createPiece";
import {
	defaultGroupName,
	expandToGroups,
	type Group,
	groupOf,
	groupsWithin,
} from "@/model/group";
import type { Id } from "@/model/types";
import type { Command } from "@/state/document";

/**
 * Groups the selected pieces (and any groups they're in) into one new group. Needs at least two.
 * Groups don't nest, so grouping groups merges them.
 */
export const groupSelection: Command = (doc) => {
	const ids = expandToGroups(doc.groups, doc.selection);
	if (ids.length < 2) return doc;
	const existing = groupsWithin(doc.groups, ids);
	if (existing.length === 1 && existing[0].pieceIds.length === ids.length)
		return doc;
	const groups = { ...doc.groups };
	for (const g of existing) delete groups[g.id];
	const group: Group = {
		id: newId(),
		name: defaultGroupName(doc.groups),
		pieceIds: ids,
	};
	groups[group.id] = group;
	return { ...doc, groups, selection: ids, selectedFaces: [] };
};

/** Ungroups every group touched by the selection. The pieces stay selected. */
export const ungroupSelection: Command = (doc) => {
	const touched = new Set(
		doc.selection.map((id) => groupOf(doc.groups, id)?.id).filter(Boolean),
	);
	if (touched.size === 0) return doc;
	const groups = Object.fromEntries(
		Object.entries(doc.groups).filter(([id]) => !touched.has(id)),
	);
	return { ...doc, groups };
};

export const renameGroup =
	(id: Id, name: string): Command =>
	(doc) => {
		const group = doc.groups[id];
		const trimmed = name.trim();
		if (!group || !trimmed || trimmed === group.name) return doc;
		return {
			...doc,
			groups: { ...doc.groups, [id]: { ...group, name: trimmed } },
		};
	};

/** Selects pieces as objects: a piece in a group brings the whole group with it. */
export const selectObjects =
	(ids: Id[]): Command =>
	(doc) =>
		selectPieces(expandToGroups(doc.groups, ids))(doc);

/** Shift+click on an object: adds it (and its group) to the selection, or removes them. */
export const toggleObject =
	(id: Id): Command =>
	(doc) => {
		const members = expandToGroups(doc.groups, [id]);
		const next = doc.selection.includes(id)
			? doc.selection.filter((s) => !members.includes(s))
			: [
					...doc.selection,
					...members.filter((m) => !doc.selection.includes(m)),
				];
		return selectPieces(next)(doc);
	};
