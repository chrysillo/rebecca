import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import type { Group, PerspectiveCamera } from "three";
import type { Vec3 } from "@/geometry/vec";

/** Size as a fraction of camera distance (at the normal 45° lens), so gizmos look the same size at any zoom. */
const SCREEN_SCALE = 0.14;
const BASE_HALF_FOV = Math.tan((45 * Math.PI) / 360);

/** A group at `position` whose children keep a constant on-screen size. */
export function ScreenSizeGroup({
	position,
	children,
}: {
	position: Vec3;
	children: ReactNode;
}) {
	const group = useRef<Group>(null);
	useFrame(({ camera }) => {
		const g = group.current;
		if (!g) return;
		// A narrower lens (the flat standard views) shows less per unit distance: scale to match.
		const lens =
			Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360) /
			BASE_HALF_FOV;
		g.scale.setScalar(
			camera.position.distanceTo(g.position) * SCREEN_SCALE * lens,
		);
	});
	return (
		<group ref={group} position={[position.x, position.y, position.z]}>
			{children}
		</group>
	);
}
