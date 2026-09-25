import { Hud } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { type Camera, type Group, MathUtils, PerspectiveCamera } from "three";

/** The cube's width on screen, in pixels. */
const CUBE_SIZE = 56;
/** Where the cube's centre sits, in pixels in from the canvas's right and top edges. */
const MARGIN_RIGHT = 96;
const MARGIN_TOP = 84;
/**
 * How far the cube's camera stands from it, in cube widths. Nearer shows stronger perspective
 * (the near edge looks longer than the far ones); very far looks flat. 4 gives a gentle perspective.
 */
const CAMERA_DISTANCE = 4;
/** Depth either side of the cube's centre to draw: it covers the axis triad and its letters. */
const DEPTH_REACH = 2;

type CubeHudProps = {
	/** Drawn in unit-cube units (the cube is 1 wide), centred on the origin. */
	children: ReactNode;
};

/**
 * Top-right overlay for the view cube. It's drawn on top of the scene with its own perspective
 * camera, so the cube looks solid rather than flat, and it's turned to match the main camera.
 */
export function CubeHud({ children }: CubeHudProps) {
	const mainCamera = useThree((s) => s.camera);
	return (
		<Hud>
			<CubeView mainCamera={mainCamera}>{children}</CubeView>
		</Hud>
	);
}

function CubeView({
	mainCamera,
	children,
}: CubeHudProps & { mainCamera: Camera }) {
	const set = useThree((s) => s.set);
	const [camera] = useState(() => {
		const cam = new PerspectiveCamera();
		cam.position.set(0, 0, CAMERA_DISTANCE);
		cam.near = CAMERA_DISTANCE - DEPTH_REACH;
		cam.far = CAMERA_DISTANCE + DEPTH_REACH;
		return cam;
	});
	// The overlay's picking and drawing use this camera, not the main one.
	useLayoutEffect(() => set({ camera }), [set, camera]);
	const turn = useRef<Group>(null);

	useFrame(({ size: { width, height } }) => {
		// A face seen head-on is CUBE_SIZE pixels across, as it was when the cube was drawn flat.
		// (Sized at the cube's centre instead, the near face and its label would come out bigger.)
		camera.fov =
			2 *
			Math.atan(height / 2 / (CUBE_SIZE * (CAMERA_DISTANCE - 0.5))) *
			MathUtils.RAD2DEG;
		camera.aspect = width / height;
		// Centre the lens on the cube rather than the canvas, so the cube is seen head-on
		// in its corner instead of skewed as if glimpsed from the middle of the screen.
		camera.setViewOffset(
			width,
			height,
			MARGIN_RIGHT - width / 2,
			height / 2 - MARGIN_TOP,
			width,
			height,
		);
		camera.updateProjectionMatrix();
		// Show the cube from the same side the main camera sees the model.
		turn.current?.quaternion.copy(mainCamera.quaternion).invert();
	});

	return <group ref={turn}>{children}</group>;
}
