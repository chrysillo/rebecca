import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE, Object3D } from "three";
import { Floor } from "./Floor";
import { Gizmos } from "./Gizmos";
import { Pieces } from "./Pieces";
import { SnapGuide } from "./SnapGuide";
import { ViewCube } from "./ViewCube";

// The model is Z-up (floor at Z = 0). Make three.js agree so no axis swapping is needed.
Object3D.DEFAULT_UP.set(0, 0, 1);

/**
 * Right-drag orbits; left or middle drag pans across the screen; the wheel zooms.
 * Left-drag on a gizmo handle is taken by the gizmo instead.
 */
const MOUSE_BUTTONS = {
	LEFT: MOUSE.PAN,
	MIDDLE: MOUSE.PAN,
	RIGHT: MOUSE.ROTATE,
};

/** The 3D view. It only renders application state; it never owns it. */
export function Viewport() {
	return (
		<Canvas
			camera={{
				position: [2400, -3200, 2200],
				up: [0, 0, 1],
				fov: 45,
				near: 5,
				far: 200000,
			}}
			onContextMenu={(e) => e.preventDefault()}
		>
			<color attach="background" args={["#ecebe7"]} />
			<ambientLight intensity={1.2} />
			<directionalLight position={[3000, -2000, 5000]} intensity={1.6} />
			<directionalLight position={[-3000, 2500, 2000]} intensity={0.5} />
			<Floor />
			<Pieces />
			<SnapGuide />
			<Gizmos />
			<OrbitControls
				makeDefault
				target={[600, 300, 0]}
				mouseButtons={MOUSE_BUTTONS}
				screenSpacePanning
				// No momentum: the camera stops the moment the mouse button is released.
				enableDamping={false}
			/>
			<ViewCube />
		</Canvas>
	);
}
