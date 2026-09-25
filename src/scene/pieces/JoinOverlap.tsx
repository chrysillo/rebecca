import { Edges } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { overlapGeometry } from "@/geometry/cut";
import { DEG } from "@/geometry/vec";
import type { Piece } from "@/model/types";
import { useAppStore } from "@/state/store";
import { toolsFor } from "@/tools/joinSession";

const CUT_COLOR = "#e5484d";

/**
 * While the join wheel is open: the material that would be removed, drawn in red on top of
 * everything, so even a shallow housing buried inside the tool is obvious.
 */
export function JoinOverlap() {
	const joiner = useAppStore((s) => s.joiner);
	const doc = useAppStore((s) => s.doc);
	if (!joiner) return null;
	const target = doc.pieces[joiner.highlighted];
	if (!target) return null;
	return toolsFor(doc, target.id).map((id) => (
		<Overlap key={id} target={target} tool={doc.pieces[id]} />
	));
}

function Overlap({ target, tool }: { target: Piece; tool: Piece }) {
	const geometry = useMemo(() => overlapGeometry(target, tool), [target, tool]);
	useEffect(() => () => geometry.dispose(), [geometry]);
	const { position: p, rotation: r } = target;
	return (
		<mesh
			geometry={geometry}
			position={[p.x, p.y, p.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			renderOrder={10}
			raycast={() => null}
		>
			<meshBasicMaterial
				color={CUT_COLOR}
				transparent
				opacity={0.55}
				depthTest={false}
				depthWrite={false}
			/>
			<Edges
				color={CUT_COLOR}
				lineWidth={2}
				renderOrder={11}
				depthTest={false}
			/>
		</mesh>
	);
}
