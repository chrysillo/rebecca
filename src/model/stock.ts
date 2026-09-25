import type { Id, PieceKind } from "@/model/types";

/** A sheet material the project uses, e.g. 18 mm ply. */
export type SheetStock = { id: Id; kind: "sheet"; thickness: number };

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

/** An existing entry with exactly this size, if any. */
export function findStock(
	stock: Record<Id, Stock>,
	kind: PieceKind,
	size: StockSize,
): Stock | undefined {
	return Object.values(stock).find(
		(s) =>
			s.kind === kind &&
			Object.entries(size).every(
				([k, v]) => (s as unknown as Record<string, number>)[k] === v,
			),
	);
}
