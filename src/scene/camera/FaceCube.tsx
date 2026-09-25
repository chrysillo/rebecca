import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { OrbitControls } from "three-stdlib";
import { SELECTION_COLOR } from "@/colors";

/** Chamfer size and smoothness, in units of the cube's unit-box geometry. */
const BEVEL_RADIUS = 0.09;
const BEVEL_SEGMENTS = 4;
/**
 * Share of the texture's width/height, on each edge, that RoundedBoxGeometry maps onto
 * the curved bevel rather than the flat part of the face (mirrors the arc/plane ratio
 * getUv() in three's RoundedBoxGeometry computes for a unit box). Used to keep the
 * texture's flat-face rectangle lined up with the geometry's actual flat region, so the
 * chamfer reads as a plain white band around a tinted face, not a color that bleeds onto
 * the curve or a rectangle that misses it.
 */
const BEVEL_UV_MARGIN = (() => {
	const arc = (Math.PI / 2) * BEVEL_RADIUS;
	const flat = Math.max(1 - 2 * BEVEL_RADIUS, 0);
	return 0.5 * (arc / (arc + flat));
})();
/** The chamfer itself stays this colour on every face, so the cube's edges read crisp
 * against the page no matter what the flat faces are tinted. */
const EDGE_COLOR = "#ffffff";
/** Flat-face fill — a soft neutral, a little more colour than the pure-white edges. */
const FACE = { fill: "#f2f1ee", ink: "#737373" };
/** Matches the scene's selection accent (see FaceHighlight/FaceArrow/PivotHandle). */
const HOVER = { fill: "#eff6ff", ink: SELECTION_COLOR };
/** Label texture resolution; the font size is relative to it. */
const TEX = 256;
const LABEL_SIZE = 76;
const labelFont = (size: number) =>
	`600 ${size}px "Barlow Condensed", system-ui, sans-serif`;
const LABEL_FONT = labelFont(LABEL_SIZE);
/** Widest a label may be, as a share of the flat face, so long names like "BOTTOM" stay inside it. */
const LABEL_MAX_WIDTH = 0.82;

/**
 * Faces in BoxGeometry material order (+X, -X, +Y, -Y, +Z, -Z of the cube mesh), with the
 * world direction the camera moves to. The cube is turned +90° about X so its +Y is our +Z (up).
 * Looking straight down/up is singular for orbit controls, so Top/Bottom lean a hair toward Front.
 */
const FACES = [
	{ label: "Right", view: new Vector3(1, 0, 0) },
	{ label: "Left", view: new Vector3(-1, 0, 0) },
	{ label: "Top", view: new Vector3(0, -1e-4, 1).normalize() },
	{ label: "Bottom", view: new Vector3(0, -1e-4, -1).normalize() },
	{ label: "Front", view: new Vector3(0, -1, 0) },
	{ label: "Back", view: new Vector3(0, 1, 0) },
] as const;

type FaceCubeProps = {
	onPick: (view: Vector3) => void;
	controls: OrbitControls | null;
};

/** The clickable, labelled unit cube of the view cube. The hovered face is the one that will be picked. */
export function FaceCube({ onPick, controls }: FaceCubeProps) {
	const [hovered, setHovered] = useState<number | null>(null);
	const [textures, setTextures] = useState(faceTextures);
	// Redraw the labels once the UI font has loaded (canvas text doesn't wait for web fonts).
	useEffect(() => {
		let live = true;
		document.fonts.load(LABEL_FONT).then(() => {
			if (live) setTextures(faceTextures());
		});
		return () => {
			live = false;
		};
	}, []);
	useEffect(
		() => () => {
			for (const t of [...textures.normal, ...textures.hover]) t.dispose();
		},
		[textures],
	);

	// A true beveled box, so faces meet at real chamfered edges instead of a painted gap.
	const geometry = useMemo(
		() => new RoundedBoxGeometry(1, 1, 1, BEVEL_SEGMENTS, BEVEL_RADIUS),
		[],
	);
	useEffect(() => () => geometry.dispose(), [geometry]);

	// The bevel is subdivided into many triangles, so read the face from its material
	// group rather than assuming two triangles per face as a plain box would have.
	const faceOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
		e.face?.materialIndex ?? null;

	return (
		<mesh
			onPointerMove={(e) => {
				e.stopPropagation();
				setHovered(faceOf(e));
			}}
			onPointerDown={(e) => {
				// Stop the press on the cube from also starting a camera pan.
				e.stopPropagation();
				if (controls) controls.enabled = false;
			}}
			onPointerUp={() => {
				if (controls) controls.enabled = true;
			}}
			onPointerOut={() => {
				setHovered(null);
				if (controls) controls.enabled = true;
			}}
			onClick={(e) => {
				e.stopPropagation();
				const face = faceOf(e);
				if (face !== null) onPick(FACES[face].view);
			}}
		>
			<primitive object={geometry} attach="geometry" />
			{FACES.map((face, i) => (
				<meshBasicMaterial
					key={face.label}
					attach={`material-${i}`}
					map={hovered === i ? textures.hover[i] : textures.normal[i]}
					// Unlit: the fill colour renders exactly as painted, not dimmed by scene
					// lights or the tone curve — the one way to guarantee it reads whiter
					// than the page background regardless of the main viewport's lighting.
					toneMapped={false}
				/>
			))}
		</mesh>
	);
}

function faceTextures() {
	return {
		normal: FACES.map((f) => labelTexture(f.label, FACE)),
		hover: FACES.map((f) => labelTexture(f.label, HOVER)),
	};
}

/**
 * A face tile. The texture wraps the whole face including the curved chamfer at its
 * border (see BEVEL_UV_MARGIN), so it's painted as two layers: the chamfer band stays
 * EDGE_COLOR everywhere, and an inset rectangle — sized to land exactly on the flat part
 * of the geometry — gets this face's tint. The material is unlit (meshBasicMaterial), so
 * both colours render exactly as painted, with nothing dimming them toward grey.
 */
function labelTexture(
	label: string,
	look: { fill: string; ink: string },
): CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = TEX;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = EDGE_COLOR;
		ctx.fillRect(0, 0, TEX, TEX);

		const inset = TEX * BEVEL_UV_MARGIN;
		ctx.fillStyle = look.fill;
		ctx.fillRect(inset, inset, TEX - 2 * inset, TEX - 2 * inset);

		const text = label.toUpperCase();
		ctx.fillStyle = look.ink;
		ctx.font = LABEL_FONT;
		ctx.letterSpacing = `${TEX * 0.02}px`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		// Shrink to fit rather than overflow, which also covers the wider fallback font drawn
		// before the UI font has loaded.
		const maxWidth = (TEX - 2 * inset) * LABEL_MAX_WIDTH;
		const width = ctx.measureText(text).width;
		if (width > maxWidth) ctx.font = labelFont((LABEL_SIZE * maxWidth) / width);
		ctx.fillText(text, TEX / 2, TEX / 2 + TEX * 0.02);
	}
	const texture = new CanvasTexture(canvas);
	texture.anisotropy = 4;
	return texture;
}
