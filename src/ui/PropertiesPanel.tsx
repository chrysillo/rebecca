import { commands } from "@/commands";
import { type FaceRef, faceNormal } from "@/geometry/box";
import { AXES } from "@/geometry/vec";
import { dimensionEntries, pieceSize } from "@/model/dimensions";
import { kindName } from "@/model/naming";
import type { Piece } from "@/model/types";
import { selectedPieces } from "@/state/selectors";
import { applyCommand, useAppStore } from "@/state/store";
import { NumberField } from "@/ui/components/NumberField";
import { Group, Panel } from "@/ui/Panel";

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
	const faces = doc.selectedFaces.filter((f) => doc.pieces[f.pieceId]);

	if (faces.length > 1) return <FacesSummary faces={faces} />;
	if (faces.length === 1)
		return (
			<FaceProperties face={faces[0]} piece={doc.pieces[faces[0].pieceId]} />
		);
	if (selected.length === 0) return null;
	if (selected.length > 1)
		return (
			<Panel title={`${selected.length} pieces`}>
				<ul className="-mt-1 flex flex-col gap-0.5 text-xs text-neutral-700">
					{selected.map((p) => (
						<li key={p.id}>{p.name}</li>
					))}
				</ul>
				<p className="text-[11px] text-neutral-400">
					Move and rotate them together. Drag the white dot to change the group
					pivot.
				</p>
			</Panel>
		);
	return <PieceProperties piece={selected[0]} />;
}

/** Which way a face points, named by its closest world direction (Z up, -Y is the front). */
const FACING: Record<string, string> = {
	"x+": "Right",
	"x-": "Left",
	"y+": "Back",
	"y-": "Front",
	"z+": "Top",
	"z-": "Bottom",
};

/** Closest world direction a face points, e.g. "Top" or "Left". */
function facingName(piece: Piece, face: FaceRef): string {
	const n = faceNormal(piece, face.axis, face.sign);
	const main = AXES.reduce((best, a) =>
		Math.abs(n[a]) > Math.abs(n[best]) ? a : best,
	);
	return FACING[`${main}${n[main] < 0 ? "-" : "+"}`];
}

/** Several faces selected (Shift+click): list them; E extrudes them together. */
function FacesSummary({ faces }: { faces: FaceRef[] }) {
	const pieces = useAppStore((s) => s.doc.pieces);
	return (
		<Panel title={`${faces.length} faces`}>
			<ul className="-mt-1 flex flex-col gap-0.5 text-xs text-neutral-700">
				{faces.map((f) => (
					<li key={`${f.pieceId}:${f.axis}${f.sign}`}>
						{pieces[f.pieceId].name} · {facingName(pieces[f.pieceId], f)}
					</li>
				))}
			</ul>
			<p className="text-[11px] text-neutral-400">
				Press E to extrude them together.
			</p>
		</Panel>
	);
}

function FaceProperties({ face, piece }: { face: FaceRef; piece: Piece }) {
	const size = pieceSize(piece);
	const [u, v] = AXES.filter((a) => a !== face.axis);
	const facing = facingName(piece, face);

	return (
		<Panel title="Face">
			<p className="-mt-2 text-[11px] text-neutral-400">
				of {piece.name} ({kindName(piece.kind)})
			</p>
			<Group title="Size">
				<NumberField
					label="Across"
					value={Math.max(size[u], size[v])}
					unit="mm"
				/>
				<NumberField
					label="Down"
					value={Math.min(size[u], size[v])}
					unit="mm"
				/>
			</Group>
			<Group title="Facing">
				<p className="text-xs text-neutral-700">{facing}</p>
			</Group>
		</Panel>
	);
}

function PieceProperties({ piece }: { piece: Piece }) {
	return (
		<Panel title={piece.name} width="w-44">
			<Joints piece={piece} />
			<div className="flex flex-col gap-1.5">
				{dimensionEntries(piece).map((d) => (
					<NumberField
						key={d.key}
						label={DIMENSION_LABEL[d.key]}
						value={d.value}
						greaterThan={0}
						unit="mm"
						smallLabel
						onCommit={
							d.editable
								? (v) => applyCommand(commands.setDimension(piece.id, d.key, v))
								: undefined
						}
					/>
				))}
			</div>
		</Panel>
	);
}

/** The piece's joints, each with a × to remove it. Nothing when it has none. */
function Joints({ piece }: { piece: Piece }) {
	const joints = useAppStore((s) => s.doc.joints);
	const pieces = useAppStore((s) => s.doc.pieces);
	const mine = Object.values(joints).filter(
		(j) => j.target === piece.id || j.tool === piece.id,
	);
	if (mine.length === 0) return null;
	return (
		<Group title="Joints">
			<ul className="flex flex-col gap-0.5 text-xs text-neutral-700">
				{mine.map((j) => (
					<li key={j.id} className="flex items-center justify-between gap-2">
						<span className="truncate">
							{j.target === piece.id
								? `Cut by ${pieces[j.tool]?.name}`
								: `Cuts ${pieces[j.target]?.name}`}
						</span>
						<button
							type="button"
							aria-label="Flip which piece is cut"
							title="Flip which piece is cut"
							className="ml-auto rounded px-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
							onClick={() => applyCommand(commands.flipJoint(j.id))}
						>
							⇄
						</button>
						<button
							type="button"
							aria-label="Remove joint"
							title="Remove joint"
							className="rounded px-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
							onClick={() => applyCommand(commands.removeJoint(j.id))}
						>
							×
						</button>
					</li>
				))}
			</ul>
		</Group>
	);
}
