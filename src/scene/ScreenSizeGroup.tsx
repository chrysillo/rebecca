import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import type { Group } from "three";
import type { Vec3 } from "@/geometry/vec";

/** Size as a fraction of camera distance, so gizmos look the same size at any zoom. */
const SCREEN_SCALE = 0.14;

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
		if (g)
			g.scale.setScalar(camera.position.distanceTo(g.position) * SCREEN_SCALE);
	});
	return (
		<group ref={group} position={[position.x, position.y, position.z]}>
			{children}
		</group>
	);
}
