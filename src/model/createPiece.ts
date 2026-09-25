import { vec3 } from "@/geometry/vec";
import type { FramingStock, SheetStock } from "@/model/stock";
import type { Framing, Id, Sheet } from "@/model/types";

export const newId = (): Id => crypto.randomUUID();

/** Pieces are created unnamed; `addPiece` gives them a default name such as "Sheet 3". */
export function createSheet(
	stock: SheetStock,
	dims: { length: number; width: number },
): Sheet {
	return {
		id: newId(),
		name: "",
		kind: "sheet",
		stockId: stock.id,
		thickness: stock.thickness,
		...dims,
		position: vec3(),
		rotation: vec3(),
		pivot: "centre",
	};
}

export function createFraming(stock: FramingStock, length: number): Framing {
	return {
		id: newId(),
		name: "",
		kind: "framing",
		stockId: stock.id,
		width: stock.width,
		depth: stock.depth,
		length,
		position: vec3(),
		rotation: vec3(),
		pivot: "centre",
	};
}
