/** Every way the document can change. UI, keybindings and tools all go through these. */
import {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	extrudeFaces,
	renamePiece,
	setDimension,
	setPivot,
} from "@/commands/pieces";
import {
	clearSelection,
	selectFaces,
	selectPieces,
	setGroupPivot,
	toggleFace,
	togglePiece,
} from "@/commands/selection";
import {
	addPieceFromStock,
	addStock,
	removeStock,
	setPieceStock,
	updateStock,
} from "@/commands/stock";
import { setTransforms } from "@/commands/transform";

export const commands = {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	extrudeFaces,
	renamePiece,
	setDimension,
	setPivot,
	selectPieces,
	selectFaces,
	toggleFace,
	togglePiece,
	setGroupPivot,
	clearSelection,
	setTransforms,
	addStock,
	addPieceFromStock,
	updateStock,
	removeStock,
	setPieceStock,
};
