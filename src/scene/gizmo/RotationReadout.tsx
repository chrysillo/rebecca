import { Html } from "@react-three/drei";
import { DoubleSide } from "three";
import { AXIS_COLOR } from "@/colors";
import { DEG } from "@/geometry/vec";
import {
	GIZMO_RENDER_ORDER,
	PLANE_ORIENTATION,
} from "@/scene/shared/gizmoStyle";
import { useAppStore } from "@/state/store";

const WEDGE_RADIUS = 0.75;
const LABEL_RADIUS = 1.05;

/**
 * While a rotation arc is dragged: a translucent wedge sweeping the angle turned so far,
 * and a label with the degrees (Shapr3D style). Lives inside the gizmo's screen-sized group.
 */
export function RotationReadout() {
	const rotation = useAppStore((s) => s.drag?.rotation);
	if (!rotation) return null;

	const { axis, startAngle, degrees } = rotation;
	const start = startAngle * DEG;
	const sweep = degrees * DEG;
	const mid = start + sweep / 2;

	return (
		<group rotation={PLANE_ORIENTATION[axis]}>
			{degrees !== 0 && (
				<mesh renderOrder={GIZMO_RENDER_ORDER - 1}>
					<circleGeometry args={[WEDGE_RADIUS, 48, start, sweep]} />
					<meshBasicMaterial
						color={AXIS_COLOR[axis]}
						transparent
						opacity={0.22}
						side={DoubleSide}
						depthTest={false}
						depthWrite={false}
						toneMapped={false}
					/>
				</mesh>
			)}
			<Html
				position={[
					LABEL_RADIUS * Math.cos(mid),
					LABEL_RADIUS * Math.sin(mid),
					0,
				]}
				center
				zIndexRange={[20, 10]}
				style={{ pointerEvents: "none" }}
			>
				<div className="rounded-md bg-neutral-900/85 px-2 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap text-white shadow">
					{formatDegrees(degrees)}
				</div>
			</Html>
		</group>
	);
}

/** "90°", "-45°", "0°". Avoids "-0°" and float noise. */
function formatDegrees(d: number): string {
	const rounded = Math.round(d * 10) / 10;
	return `${rounded === 0 ? 0 : rounded}°`;
}
