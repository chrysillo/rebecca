import { useThree } from "@react-three/fiber";
import type { OrbitControls } from "three-stdlib";

/** The camera controls `Viewport` mounts (`makeDefault`), or null before they exist. */
export const useOrbitControls = () =>
	useThree((s) => s.controls) as unknown as OrbitControls | null;
