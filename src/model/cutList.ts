import { cutListKey } from "@/model/cutListKey";
import type { Piece, PieceKind } from "@/model/types";

/** One line of the cut list: identical pieces counted together. */
export type CutListRow = {
	kind: PieceKind;
	/** The stock section: a sheet's thickness, or framing's width × depth. */
	stock: string;
	length: number;
	/** Sheets only (framing width is part of its stock). */
	width: number | null;
	quantity: number;
};

/**
 * Groups identical pieces into rows with a count. Joints are ignored: a piece's dimensions are
 * its size before any cut, so a notched rail counts as a whole rail of the same length.
 * Sorted by kind, then stock, then longest first.
 */
export function cutList(pieces: Piece[]): CutListRow[] {
	const rows = new Map<string, CutListRow>();
	for (const piece of pieces) {
		const key = cutListKey(piece);
		const row = rows.get(key);
		if (row) row.quantity++;
		else rows.set(key, rowFor(piece));
	}
	return [...rows.values()].sort(
		(a, b) =>
			a.kind.localeCompare(b.kind) ||
			a.stock.localeCompare(b.stock, undefined, { numeric: true }) ||
			b.length - a.length ||
			(b.width ?? 0) - (a.width ?? 0),
	);
}

function rowFor(piece: Piece): CutListRow {
	const base = { kind: piece.kind, quantity: 1 };
	switch (piece.kind) {
		case "sheet": {
			const [short, long] = [piece.length, piece.width].sort((a, b) => a - b);
			return {
				...base,
				stock: `${piece.thickness}`,
				length: long,
				width: short,
			};
		}
		case "framing": {
			const [a, b] = [piece.width, piece.depth].sort((x, y) => x - y);
			return { ...base, stock: `${a}x${b}`, length: piece.length, width: null };
		}
	}
}

const SECTION_NAME: Record<PieceKind, string> = {
	framing: "Framing",
	sheet: "Sheets",
};

/**
 * The cut list as grouped, human-readable text (mm): one section per kind + stock size, e.g.
 *
 * Framing
 * 38x63mm
 * 2x 1300mm
 * 1x 1000mm
 */
export function cutListText(rows: CutListRow[]): string {
	const sections: string[] = [];
	let group: { kind: PieceKind; stock: string; lines: string[] } | null = null;
	for (const row of rows) {
		if (!group || group.kind !== row.kind || group.stock !== row.stock) {
			if (group) sections.push(sectionText(group));
			group = { kind: row.kind, stock: row.stock, lines: [] };
		}
		group.lines.push(lineFor(row));
	}
	if (group) sections.push(sectionText(group));
	return sections.join("\n\n");
}

const sectionText = (group: {
	kind: PieceKind;
	stock: string;
	lines: string[];
}) => [SECTION_NAME[group.kind], `${group.stock}mm`, ...group.lines].join("\n");

const lineFor = (row: CutListRow) => {
	const dims =
		row.width === null ? `${row.length}mm` : `${row.length}x${row.width}mm`;
	return `${row.quantity}x ${dims}`;
};
