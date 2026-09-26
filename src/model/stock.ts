import { cutListKey } from "@/model/cutListKey";
import type { Id, Piece, PieceKind } from "@/model/types";

/**
 * A sheet the project uses, e.g. 18 mm plywood. Two sheets of the same thickness but different
 * materials (plywood and OSB) are separate entries, so they stay apart in the object list and cut list.
 */
export type SheetStock = {
	id: Id;
	kind: "sheet";
	/** Free text, e.g. "Plywood" or "OSB". */
	material: string;
	thickness: number;
};

/** A timber section the project uses, e.g. 38 × 63. */
export type FramingStock = {
	id: Id;
	kind: "framing";
	width: number;
	depth: number;
};

/**
 * A project-level size. Every piece points at one; changing a stock value resizes every
 * piece that uses it. This is also what the cut list groups by.
 */
export type Stock = SheetStock | FramingStock;

/** The fixed dimensions a stock entry gives its pieces. */
export type StockSize =
	| { thickness: number }
	| { width: number; depth: number };

/** "18 mm" or "38 × 63". */
export const stockLabel = (s: Stock): string =>
	s.kind === "sheet" ? `${s.thickness} mm` : `${s.width} × ${s.depth}`;

/** The size plus, for sheets, the material: "18 mm Plywood" or "38 × 63". */
export const stockFullLabel = (s: Stock): string =>
	s.kind === "sheet" ? `${stockLabel(s)} ${s.material}` : stockLabel(s);

/** The dimensions a piece of this stock must have. */
export const stockSize = (s: Stock): StockSize =>
	s.kind === "sheet"
		? { thickness: s.thickness }
		: { width: s.width, depth: s.depth };

/** Stock entries of one kind, in the order they were added. */
export const stockOfKind = <K extends PieceKind>(
	stock: Record<Id, Stock>,
	kind: K,
): Extract<Stock, { kind: K }>[] =>
	Object.values(stock).filter(
		(s): s is Extract<Stock, { kind: K }> => s.kind === kind,
	);

/** Sheets first, then framing: the order shown in the create wheel and the stock panel. */
export const orderedStock = (stock: Record<Id, Stock>): Stock[] => [
	...stockOfKind(stock, "sheet"),
	...stockOfKind(stock, "framing"),
];

/** True if every value given in `size` matches the stock's own. */
export const sizeMatches = (s: Stock, size: Partial<StockSize>): boolean =>
	Object.entries(size).every(
		([k, v]) => (stockSize(s) as Record<string, number>)[k] === v,
	);

/** An existing entry like `like` (same kind and, for sheets, material) with exactly this size, if any. */
export function findStock(
	stock: Record<Id, Stock>,
	like: Stock,
	size: StockSize,
): Stock | undefined {
	return Object.values(stock).find(
		(s) =>
			s.kind === like.kind && sameMaterial(s, like) && sizeMatches(s, size),
	);
}

const sameMaterial = (a: Stock, b: Stock) =>
	a.kind !== "sheet" || b.kind !== "sheet" || a.material === b.material;

/** The pieces cut from one stock entry. */
export type StockSection = { stock: Stock; pieces: Piece[] };

/**
 * Pieces bucketed by their stock, in stock order, each bucket longest first: the same grouping
 * as the cut list. Stock with no pieces is left out.
 */
export function stockSections(
	pieces: Piece[],
	stock: Record<Id, Stock>,
): StockSection[] {
	return orderedStock(stock)
		.map((s) => ({
			stock: s,
			pieces: pieces
				.filter((p) => p.stockId === s.id)
				.sort(
					(a, b) =>
						cutLong(b) - cutLong(a) ||
						cutShort(b) - cutShort(a) ||
						a.name.localeCompare(b.name, undefined, { numeric: true }),
				),
		}))
		.filter((section) => section.pieces.length > 0);
}

/** A cut's longer and shorter side, so a sheet drawn either way round sorts the same. */
const cutLong = (p: Piece) =>
	p.kind === "sheet" ? Math.max(p.length, p.width) : p.length;
const cutShort = (p: Piece) =>
	p.kind === "sheet" ? Math.min(p.length, p.width) : 0;

/** What a piece adds to its stock's size: a timber length, or a sheet's length × width. */
export const cutSizeLabel = (p: Piece): string =>
	p.kind === "sheet" ? `${p.length} × ${p.width}` : `${p.length}`;

/**
 * Splits a stock section's pieces (already sorted by size) into runs of the same cut, i.e. the
 * same cut-list line. Name and joints don't matter. A run of more than one shows as a single
 * "× N" row in the object list.
 */
export function identicalRuns(pieces: Piece[]): Piece[][] {
	const runs: Piece[][] = [];
	for (const piece of pieces) {
		const last = runs.at(-1);
		if (last && cutListKey(last[0]) === cutListKey(piece)) last.push(piece);
		else runs.push([piece]);
	}
	return runs;
}
