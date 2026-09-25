/** Every way the document can change. UI, keybindings and tools all go through these. */
import {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	extrudeFace,
	renamePiece,
	setDimension,
} from "./pieces";
import { clearSelection, selectFace, selectPieces } from "./selection";
import { setCornerCoordinate, setRotation, setTransforms } from "./transform";

export const commands = {
	addPiece,
	deletePieces,
	duplicatePiecesTo,
	extrudeFace,
	renamePiece,
	setDimension,
	selectPieces,
	selectFace,
	clearSelection,
	setTransforms,
	setRotation,
	setCornerCoordinate,
};
