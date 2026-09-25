import { addPiece } from "@/commands/pieces";
import { CONFIG } from "@/config";
import { resizePiece } from "@/geometry/resize";
import { createFraming, createSheet } from "@/model/createPiece";
import { type Stock, type StockSize, stockSize } from "@/model/stock";
import type { Id, Piece } from "@/model/types";
import type { Command } from "@/state/document";

export const addStock =
	(stock: Stock): Command =>
	(doc) => ({ ...doc, stock: { ...doc.stock, [stock.id]: stock } });

/** Changes a stock size and resizes every piece cut from it. Non-positive values are refused. */
export const updateStock =
	(id: Id, size: Partial<StockSize>): Command =>
	(doc) => {
		const current = doc.stock[id];
		if (
			!current ||
			Object.values(size).some((v) => !(v !== undefined && v > 0))
		)
			return doc;
		const next = { ...current, ...size } as Stock;
		if (
			Object.entries(size).every(
				([k, v]) => (current as unknown as Record<string, number>)[k] === v,
			)
		)
			return doc;
		const pieces = { ...doc.pieces };
		for (const piece of Object.values(doc.pieces))
			if (piece.stockId === id)
				pieces[piece.id] = resizePiece(piece, stockSize(next));
		return { ...doc, stock: { ...doc.stock, [id]: next }, pieces };
	};

export const stockInUse = (pieces: Record<Id, Piece>, id: Id): number =>
	Object.values(pieces).filter((p) => p.stockId === id).length;

/** Removes a stock entry. Refused while any piece still uses it. */
export const removeStock =
	(id: Id): Command =>
	(doc) => {
		if (!doc.stock[id] || stockInUse(doc.pieces, id) > 0) return doc;
		const stock = { ...doc.stock };
		delete stock[id];
		return { ...doc, stock };
	};

/** Moves a piece onto another stock entry of the same kind, taking on its size. */
export const setPieceStock =
	(pieceId: Id, stockId: Id): Command =>
	(doc) => {
		const piece = doc.pieces[pieceId];
		const stock = doc.stock[stockId];
		if (
			!piece ||
			!stock ||
			stock.kind !== piece.kind ||
			piece.stockId === stockId
		)
			return doc;
		const moved = { ...resizePiece(piece, stockSize(stock)), stockId } as Piece;
		return { ...doc, pieces: { ...doc.pieces, [pieceId]: moved } };
	};

/** Adds a new piece cut from `stock`, adding the stock entry first if it's new. One undo step. */
export const addPieceFromStock =
	(stock: Stock): Command =>
	(doc) => {
		const withStock = doc.stock[stock.id] ? doc : addStock(stock)(doc);
		const { sheet, framing } = CONFIG.defaults;
		const piece =
			stock.kind === "sheet"
				? createSheet(stock, { length: sheet.length, width: sheet.width })
				: createFraming(stock, framing.length);
		return addPiece(piece)(withStock);
	};
