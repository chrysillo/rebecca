import { commands } from "../commands";
import { pieceAabb } from "../geometry/box";
import { AXES } from "../geometry/vec";
import { dimensionEntries } from "../model/dimensions";
import { kindName } from "../model/naming";
import type { Piece } from "../model/types";
import { selectedPieces } from "../state/selectors";
import { applyCommand, useAppStore } from "../state/store";
import { NumberField } from "./components/NumberField";
import { Group, Panel } from "./Panel";

const DIMENSION_LABEL: Record<string, string> = {
	length: "Length",
	width: "Width",
	thickness: "Thickness",
	depth: "Depth",
};

/** Top-right: numeric properties of the selected piece. */
export function PropertiesPanel() {
	const doc = useAppStore((s) => s.doc);
	const selected = selectedPieces(doc);

	if (selected.length === 0) return null;
	if (selected.length > 1)
		return <Panel title="Selection">{selected.length} pieces selected</Panel>;
	return <PieceProperties piece={selected[0]} />;
}

function PieceProperties({ piece }: { piece: Piece }) {
	const corner = pieceAabb(piece).min;

	return (
		<Panel title={piece.name}>
			<p className="-mt-2 text-[11px] text-neutral-400">
				{kindName(piece.kind)}
			</p>
			<Group title="Dimensions">
				{dimensionEntries(piece).map((d) => (
					<NumberField
						key={d.key}
						label={DIMENSION_LABEL[d.key]}
						value={d.value}
						greaterThan={0}
						unit="mm"
						onCommit={
							d.editable
								? (v) => applyCommand(commands.setDimension(piece.id, d.key, v))
								: undefined
						}
					/>
				))}
			</Group>
			<Group title="Position (min corner)">
				{AXES.map((axis) => (
					<NumberField
						key={axis}
						label={axis.toUpperCase()}
						value={corner[axis]}
						unit="mm"
						onCommit={(v) =>
							applyCommand(commands.setCornerCoordinate(piece.id, axis, v))
						}
					/>
				))}
			</Group>
			<Group title="Rotation">
				{AXES.map((axis) => (
					<NumberField
						key={axis}
						label={axis.toUpperCase()}
						value={piece.rotation[axis]}
						unit="°"
						onCommit={(v) =>
							applyCommand(
								commands.setRotation(piece.id, {
									...piece.rotation,
									[axis]: v,
								}),
							)
						}
					/>
				))}
			</Group>
		</Panel>
	);
}
