import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { MOUSE, Object3D } from "three";
import { commands } from "@/commands";
import { LiveGaps } from "@/scene/annotations/LiveGaps";
import { Measurements } from "@/scene/annotations/Measurements";
import { SnapGuide } from "@/scene/annotations/SnapGuide";
import { ScreenProjection } from "@/scene/camera/ScreenProjection";
import { ViewCube } from "@/scene/camera/ViewCube";
import { ViewExporter } from "@/scene/export/ViewExporter";
import { ExtrudeController } from "@/scene/extrude/ExtrudeController";
import { ExtrudeReadout } from "@/scene/extrude/ExtrudeReadout";
import { FaceArrow } from "@/scene/extrude/FaceArrow";
import { FaceHighlight } from "@/scene/extrude/FaceHighlight";
import { ResizeHandles } from "@/scene/extrude/ResizeHandles";
import { Floor } from "@/scene/Floor";
import { Gizmos } from "@/scene/gizmo/Gizmos";
import { gizmoFirstEvents } from "@/scene/gizmoEvents";
import { Pieces } from "@/scene/pieces/Pieces";
import { BoxSelectController } from "@/scene/select/BoxSelectController";
import { applyCommand, useAppStore } from "@/state/store";
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
	// While exporting views, only the pieces are drawn.
	const exporting = useAppStore((s) => s.exporting);
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
			<Pieces />
			<ScreenProjection />
			<ExtrudeController />
			<BoxSelectController />
			<ViewExporter />
			{/* Hidden, not unmounted, while exporting: unmounting the HTML labels mid-render breaks them. */}
			<group visible={!exporting}>
				<Floor />
				<FaceHighlight />
				<Measurements />
				<LiveGaps />
				<ExtrudeReadout />
				<SnapGuide />
				<Gizmos />
				<FaceArrow />
				<ResizeHandles />
			</group>
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
