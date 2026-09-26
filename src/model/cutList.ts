import { cutListKey } from "@/model/cutListKey";
import type { Stock } from "@/model/stock";
import type { Id, Piece, PieceKind } from "@/model/types";

/** One line of the cut list: identical pieces counted together. */
export type CutListRow = {
	kind: PieceKind;
	/** The stock section: a sheet's thickness, or framing's width × depth. */
	stock: string;
	/** Sheets only: what the sheet is, e.g. "Plywood" or "OSB". */
	material: string | null;
	length: number;
	/** Sheets only (framing width is part of its stock). */
	width: number | null;
	quantity: number;
};

/**
 * Groups identical pieces into rows with a count. Joints are ignored: a piece's dimensions are
 * its size before any cut, so a notched rail counts as a whole rail of the same length.
 * Sorted by kind, then stock size and material, then longest first.
 */
export function cutList(
	pieces: Piece[],
	stock: Record<Id, Stock>,
): CutListRow[] {
	const rows = new Map<string, CutListRow>();
	for (const piece of pieces) {
		const key = cutListKey(piece);
		const row = rows.get(key);
		if (row) row.quantity++;
		else rows.set(key, rowFor(piece, stock[piece.stockId]));
	}
	return [...rows.values()].sort(
		(a, b) =>
			a.kind.localeCompare(b.kind) ||
			a.stock.localeCompare(b.stock, undefined, { numeric: true }) ||
			(a.material ?? "").localeCompare(b.material ?? "") ||
			b.length - a.length ||
			(b.width ?? 0) - (a.width ?? 0),
	);
}

function rowFor(piece: Piece, stock: Stock | undefined): CutListRow {
	const material = stock?.kind === "sheet" ? stock.material : null;
	const base = { kind: piece.kind, material, quantity: 1 };
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
 * The cut list as grouped, human-readable text (mm): one section per kind + stock size (and
 * sheet material), e.g.
 *
 * Framing
 * 38x63mm
 * 2x 1300mm
 * 1x 1000mm
 *
 * Sheets
 * 18mm OSB
 * 1x 1200x600mm
 */
export function cutListText(rows: CutListRow[]): string {
	// Rows arrive sorted, so each heading's rows are consecutive.
	const sections: string[][] = [];
	for (const row of rows) {
		const heading = headingFor(row);
		const last = sections.at(-1);
		if (last?.[0] === heading) last.push(lineFor(row));
		else sections.push([heading, lineFor(row)]);
	}
	return sections.map((lines) => lines.join("\n")).join("\n\n");
}

const headingFor = (row: CutListRow) =>
	`${SECTION_NAME[row.kind]}\n${row.stock}mm${row.material ? ` ${row.material}` : ""}`;

const lineFor = (row: CutListRow) => {
	const dims =
		row.width === null ? `${row.length}mm` : `${row.length}x${row.width}mm`;
	return `${row.quantity}x ${dims}`;
};
