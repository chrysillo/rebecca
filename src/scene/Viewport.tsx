import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE, Object3D } from "three";
import { commands } from "../commands";
import { applyCommand } from "../state/store";
import { ExtrudeController } from "./ExtrudeController";
import { ExtrudeReadout } from "./ExtrudeReadout";
import { FaceHighlight } from "./FaceHighlight";
import { Floor } from "./Floor";
import { Gizmos } from "./Gizmos";
import { Pieces } from "./Pieces";
import { SnapGuide } from "./SnapGuide";
import { ViewCube } from "./ViewCube";

// The model is Z-up (floor at Z = 0). Make three.js agree so no axis swapping is needed.
Object3D.DEFAULT_UP.set(0, 0, 1);

/**
 * Left button is for picking (faces, pieces, gizmo handles), never the camera.
 * Right-drag orbits (Shift + right-drag pans), middle-drag pans, the wheel zooms.
 */
const MOUSE_BUTTONS = {
	// LEFT deliberately unset: drei replaces the whole map, so left does nothing to the camera.
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
			// A left click that hits no piece or gizmo deselects.
			onPointerMissed={(e) => {
				if (e.button === 0) applyCommand(commands.clearSelection);
			}}
		>
			<color attach="background" args={["#ecebe7"]} />
			<ambientLight intensity={1.2} />
			<directionalLight position={[3000, -2000, 5000]} intensity={1.6} />
			<directionalLight position={[-3000, 2500, 2000]} intensity={0.5} />
			<Floor />
			<Pieces />
			<FaceHighlight />
			<ExtrudeController />
			<ExtrudeReadout />
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
