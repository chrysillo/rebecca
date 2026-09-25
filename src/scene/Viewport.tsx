import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE, Object3D } from "three";
import { commands } from "@/commands";
import { ExtrudeController } from "@/scene/ExtrudeController";
import { ExtrudeReadout } from "@/scene/ExtrudeReadout";
import { FaceHighlight } from "@/scene/FaceHighlight";
import { Floor } from "@/scene/Floor";
import { Gizmos } from "@/scene/Gizmos";
import { gizmoFirstEvents } from "@/scene/gizmoEvents";
import { JoinOverlap } from "@/scene/JoinOverlap";
import { LiveGaps } from "@/scene/LiveGaps";
import { Measurements } from "@/scene/Measurements";
import { Pieces } from "@/scene/Pieces";
import { SnapGuide } from "@/scene/SnapGuide";
import { ScreenProjection } from "@/scene/screenProjection";
import { ViewCube } from "@/scene/ViewCube";
import { applyCommand } from "@/state/store";
import { cancelMeasure } from "@/tools/measureSession";

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
			events={gizmoFirstEvents}
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
				// Clicking empty space drops a half-made measurement, or else deselects.
				if (e.button === 0 && !cancelMeasure())
					applyCommand(commands.clearSelection);
			}}
		>
			{/* No background colour: the canvas is transparent over the page gradient (see App). */}
			<ambientLight intensity={1.2} />
			<directionalLight position={[3000, -2000, 5000]} intensity={1.6} />
			<directionalLight position={[-3000, 2500, 2000]} intensity={0.5} />
			<Floor />
			<Pieces />
			<JoinOverlap />
			<ScreenProjection />
			<FaceHighlight />
			<Measurements />
			<LiveGaps />
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
