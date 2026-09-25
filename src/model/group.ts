import type { Id } from "@/model/types";

/**
 * Pieces that are picked, moved and rotated together, like one object. Flat: a piece is in at
 * most one group, and groups don't nest. A group always has at least two pieces.
 */
export type Group = { id: Id; name: string; pieceIds: Id[] };

/** The group a piece belongs to, if any. */
export const groupOf = (
	groups: Record<Id, Group>,
	pieceId: Id,
): Group | undefined =>
	Object.values(groups).find((g) => g.pieceIds.includes(pieceId));

/** The ids plus every other piece in their groups, in order, without repeats. */
export function expandToGroups(groups: Record<Id, Group>, ids: Id[]): Id[] {
	const out: Id[] = [];
	for (const id of ids)
		for (const member of groupOf(groups, id)?.pieceIds ?? [id])
			if (!out.includes(member)) out.push(member);
	return out;
}

/** Groups whose pieces are all in `ids` (the whole group is selected). */
export const groupsWithin = (groups: Record<Id, Group>, ids: Id[]): Group[] =>
	Object.values(groups).filter((g) => g.pieceIds.every((p) => ids.includes(p)));

/** Next unused default name, e.g. "Group 3". */
export function defaultGroupName(groups: Record<Id, Group>): string {
	let highest = 0;
	for (const g of Object.values(groups)) {
		const n = Number(g.name.replace(/^Group /, ""));
		if (g.name.startsWith("Group ") && Number.isInteger(n))
			highest = Math.max(highest, n);
	}
	return `Group ${highest + 1}`;
}

/** Drops missing pieces from groups, and groups left with fewer than two. */
export function pruneGroups(
	groups: Record<Id, Group>,
	exists: (id: Id) => boolean,
): Record<Id, Group> {
	const out: Record<Id, Group> = {};
	let changed = false;
	for (const g of Object.values(groups)) {
		const pieceIds = g.pieceIds.filter(exists);
		if (pieceIds.length !== g.pieceIds.length) changed = true;
		if (pieceIds.length >= 2) out[g.id] = { ...g, pieceIds };
		else changed = true;
	}
	return changed ? out : groups;
}
