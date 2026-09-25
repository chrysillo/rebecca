import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { OrbitControls } from "three-stdlib";
import type { Vec3 } from "@/geometry/vec";
import { setScreenView } from "@/input/screen";

/** Mount inside the Canvas so UI outside it can place itself by the model (see `toScreen`). */
export function ScreenProjection() {
	const camera = useThree((s) => s.camera);
	const size = useThree((s) => s.size);
	const controls = useThree((s) => s.controls) as OrbitControls | null;
	useEffect(() => {
		const aim = (position: Vec3, target: Vec3) => {
			camera.position.set(position.x, position.y, position.z);
			controls?.target.set(target.x, target.y, target.z);
			controls?.update();
		};
		setScreenView({ camera, rect: size, aim });
		return () => setScreenView(null);
	}, [camera, size, controls]);
	return null;
}
