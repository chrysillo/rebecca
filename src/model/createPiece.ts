import { vec3 } from "../geometry/vec";
import type { Framing, Id, Sheet } from "./types";

export const newId = (): Id => crypto.randomUUID();

/** Pieces are created unnamed; `addPiece` gives them a default name such as "Sheet 3". */
export function createSheet(dims: {
	length: number;
	width: number;
	thickness: number;
}): Sheet {
	return {
		id: newId(),
		name: "",
		kind: "sheet",
		...dims,
		position: vec3(),
		rotation: vec3(),
	};
}

export function createFraming(dims: {
	length: number;
	width: number;
	depth: number;
}): Framing {
	return {
		id: newId(),
		name: "",
		kind: "framing",
		...dims,
		position: vec3(),
		rotation: vec3(),
	};
}
