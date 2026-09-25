import type { Id } from "../model/types";
import type { Command } from "../state/document";

const sameIds = (a: Id[], b: Id[]) =>
	a.length === b.length && a.every((id, i) => id === b[i]);

export const selectPieces =
	(ids: Id[]): Command =>
	(doc) => {
		const valid = ids.filter((id) => doc.pieces[id]);
		return sameIds(valid, doc.selection) ? doc : { ...doc, selection: valid };
	};

export const clearSelection: Command = selectPieces([]);
