/** Every way the document can change. UI, keybindings and tools all go through these. */
import {
	groupSelection,
	renameGroup,
	selectObjects,
	toggleObject,
	ungroupSelection,
} from "@/commands/groups";
import { flipJoint, joinInto, removeJoint } from "@/commands/joints";
import {
	addMeasurement,
	moveMeasurement,
	removeMeasurement,
} from "@/commands/measurements";
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
	setStockMaterial,
	updateStock,
} from "@/commands/stock";
import { setTransforms } from "@/commands/transform";

export const commands = {
	groupSelection,
	ungroupSelection,
	renameGroup,
	selectObjects,
	toggleObject,
	flipJoint,
	joinInto,
	removeJoint,
	addMeasurement,
	moveMeasurement,
	removeMeasurement,
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
	setStockMaterial,
};
