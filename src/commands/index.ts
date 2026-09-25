/** Every way the document can change. UI, keybindings and tools all go through these. */
import {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	renamePiece,
	setDimension,
} from "./pieces";
import { clearSelection, selectPieces } from "./selection";
import { setCornerCoordinate, setRotation, setTransforms } from "./transform";

export const commands = {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	renamePiece,
	setDimension,
	selectPieces,
	clearSelection,
	setTransforms,
	setRotation,
	setCornerCoordinate,
};
