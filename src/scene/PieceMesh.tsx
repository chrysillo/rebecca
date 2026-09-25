import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { commands } from "../commands";
import { pieceSize } from "../model/dimensions";
import type { Piece } from "../model/types";
import { applyCommand } from "../state/store";

const DEG = Math.PI / 180;

const COLORS = {
	sheet: "#dcc196",
	framing: "#c99a63",
	selected: "#f2b36b",
} as const;

type Props = { piece: Piece; selected: boolean; ghost: boolean };

/** Draws one piece as a box. Double-click selects it. */
export function PieceMesh({ piece, selected, ghost }: Props) {
	const size = pieceSize(piece);
	const { position: p, rotation: r } = piece;

	const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
		e.stopPropagation();
		if (!ghost) applyCommand(commands.selectPieces([piece.id]));
	};

	return (
		<mesh
			position={[p.x, p.y, p.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			onDoubleClick={onDoubleClick}
		>
			<boxGeometry args={[size.x, size.y, size.z]} />
			<meshStandardMaterial
				color={selected ? COLORS.selected : COLORS[piece.kind]}
				transparent={ghost}
				opacity={ghost ? 0.6 : 1}
				polygonOffset
				polygonOffsetFactor={1}
			/>
			<Edges
				color={selected ? "#d9480f" : "#5c4a32"}
				lineWidth={selected ? 2.5 : 1}
			/>
		</mesh>
	);
}
