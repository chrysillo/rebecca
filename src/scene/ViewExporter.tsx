import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
	type Camera,
	OrthographicCamera,
	PerspectiveCamera,
	Vector2,
	Vector3,
	type WebGLRenderer,
} from "three";
import { pieceCorners, piecesAabb } from "@/geometry/box";
import {
	DIMENSION_OFFSET,
	type Dimension,
	dimensionOffsetDirection,
	formatMm,
	measureEdges,
} from "@/geometry/measure";
import { type Axis, add, scale, sub, type Vec3 } from "@/geometry/vec";
import type { Piece } from "@/model/types";
import { download, exportBaseName } from "@/persistence/download";
import { useProjectsStore } from "@/state/projects";
import { useAppStore } from "@/state/store";

/** Size of each view on the exported sheet, in pixels. */
const VIEW_W = 1200;
const VIEW_H = 900;
const TITLE_H = 56;
/** Space kept around the model in each view, for the dimensions. */
const MARGIN = 0.22;
const INK = "#262626";
const DIM_COLOR = "#0f766e";
const FONT = '500 22px "Barlow", system-ui, sans-serif';

type ViewSpec = {
	title: string;
	/** Direction from the model to the camera. */
	direction: Vector3;
	up: Vector3;
	/** Orthographic views: the world axes running across and up the picture (overall dimensions). */
	across?: Axis;
	upward?: Axis;
};

const VIEWS: ViewSpec[] = [
	{
		title: "Top",
		direction: new Vector3(0, 0, 1),
		up: new Vector3(0, 1, 0),
		across: "x",
		upward: "y",
	},
	{
		title: "Right",
		direction: new Vector3(1, 0, 0),
		up: new Vector3(0, 0, 1),
		across: "y",
		upward: "z",
	},
	{
		title: "Left",
		direction: new Vector3(-1, 0, 0),
		up: new Vector3(0, 0, 1),
		across: "y",
		upward: "z",
	},
	{
		title: "Perspective",
		direction: new Vector3(2400, -3200, 2200).normalize(),
		up: new Vector3(0, 0, 1),
	},
];

/** Set while mounted: renders and downloads the views. */
let runExport: (() => Promise<void>) | null = null;

/** Downloads a sheet of the Top, Right, Left and Perspective views with their dimensions. */
export function exportViews() {
	const { doc, showNotice } = useAppStore.getState();
	if (Object.keys(doc.pieces).length === 0) {
		showNotice("Nothing to export yet.");
		return;
	}
	void runExport?.();
}

/**
 * Mount inside the Canvas. Exporting hides the gizmos, grid and overlays (via `exporting`), renders
 * each view straight from the scene at a fixed size, and draws the dimensions on top in 2D (the
 * on-screen labels are HTML, so a canvas capture wouldn't include them).
 */
export function ViewExporter() {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);

	useEffect(() => {
		runExport = async () => {
			const { setExporting } = useAppStore.getState();
			setExporting(true);
			// Let React drop the overlays before rendering.
			await nextFrame();
			await nextFrame();
			try {
				const pieces = Object.values(useAppStore.getState().doc.pieces);
				const sheet = document.createElement("canvas");
				sheet.width = VIEW_W * 2;
				sheet.height = (VIEW_H + TITLE_H) * 2;
				const ctx = sheet.getContext("2d");
				if (!ctx) return;
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, sheet.width, sheet.height);
				VIEWS.forEach((view, i) => {
					const x = (i % 2) * VIEW_W;
					const y = Math.floor(i / 2) * (VIEW_H + TITLE_H);
					drawView(ctx, gl, scene, view, pieces, x, y);
				});
				const name = exportBaseName(useProjectsStore.getState().active);
				const blob = await new Promise<Blob | null>((r) =>
					sheet.toBlob(r, "image/png"),
				);
				if (blob) download(`${name}-views.png`, blob);
			} finally {
				setExporting(false);
			}
		};
		return () => {
			runExport = null;
		};
	}, [gl, scene]);

	return null;
}

const nextFrame = () =>
	new Promise<void>((r) => requestAnimationFrame(() => r()));

function drawView(
	ctx: CanvasRenderingContext2D,
	gl: WebGLRenderer,
	scene: Parameters<WebGLRenderer["render"]>[0],
	view: ViewSpec,
	pieces: Piece[],
	x: number,
	y: number,
) {
	const box = piecesAabb(pieces);
	const camera = fitCamera(view, box);

	// Render at the export size, copy the frame out, then put the viewport back.
	const size = gl.getSize(new Vector2());
	const ratio = gl.getPixelRatio();
	gl.setPixelRatio(1);
	gl.setSize(VIEW_W, VIEW_H, false);
	gl.render(scene, camera);
	ctx.drawImage(gl.domElement, x, y + TITLE_H, VIEW_W, VIEW_H);
	gl.setPixelRatio(ratio);
	gl.setSize(size.x, size.y, false);

	ctx.save();
	ctx.translate(x, y + TITLE_H);
	ctx.beginPath();
	ctx.rect(0, 0, VIEW_W, VIEW_H);
	ctx.clip();
	const project = (p: Vec3): [number, number] => {
		const v = new Vector3(p.x, p.y, p.z).project(camera);
		return [((v.x + 1) / 2) * VIEW_W, ((1 - v.y) / 2) * VIEW_H];
	};
	drawMeasurements(ctx, pieces, project);
	if (view.across && view.upward)
		drawOverall(ctx, box, view, pieces.flatMap(pieceCorners).map(project));
	ctx.restore();

	// Title and frame.
	ctx.fillStyle = INK;
	ctx.font = '600 28px "Barlow Condensed", system-ui, sans-serif';
	ctx.textBaseline = "middle";
	ctx.fillText(view.title, x + 20, y + TITLE_H / 2);
	ctx.strokeStyle = "#d4d4d4";
	ctx.lineWidth = 2;
	ctx.strokeRect(x + 1, y + 1, VIEW_W - 2, VIEW_H + TITLE_H - 2);
}

function fitCamera(view: ViewSpec, box: { min: Vec3; max: Vec3 }): Camera {
	const centre = new Vector3(
		(box.min.x + box.max.x) / 2,
		(box.min.y + box.max.y) / 2,
		(box.min.z + box.max.z) / 2,
	);
	const radius =
		new Vector3(
			box.max.x - box.min.x,
			box.max.y - box.min.y,
			box.max.z - box.min.z,
		).length() / 2 || 500;
	const aspect = VIEW_W / VIEW_H;

	if (view.across && view.upward) {
		const w = box.max[view.across] - box.min[view.across];
		const h = box.max[view.upward] - box.min[view.upward];
		// Half-size of the view, with room for the dimensions.
		const halfH = Math.max(h, w / aspect) * (0.5 + MARGIN) || 500;
		const cam = new OrthographicCamera(
			-halfH * aspect,
			halfH * aspect,
			halfH,
			-halfH,
			1,
			radius * 20 + 10000,
		);
		cam.up.copy(view.up);
		cam.position
			.copy(centre)
			.addScaledVector(view.direction, radius * 5 + 1000);
		cam.lookAt(centre);
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
		return cam;
	}
	const fov = 35;
	const cam = new PerspectiveCamera(fov, aspect, 5, 200000);
	const distance = (radius * (1 + MARGIN)) / Math.sin((fov * Math.PI) / 360);
	cam.up.copy(view.up);
	cam.position.copy(centre).addScaledVector(view.direction, distance);
	cam.lookAt(centre);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return cam;
}

type Project = (p: Vec3) => [number, number];

/** The saved measurements, lifted off the pieces as on screen. Ones seen end-on are skipped. */
function drawMeasurements(
	ctx: CanvasRenderingContext2D,
	pieces: Piece[],
	project: Project,
) {
	const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
	for (const m of Object.values(useAppStore.getState().doc.measurements)) {
		const d = measureEdges(byId, m.from, m.to);
		if (!d || d.distance <= 0) continue;
		const lift = dimensionOffsetDirection(sub(d.end, d.start), d.start);
		const lifted: Dimension = {
			...d,
			start: add(d.start, scale(lift, DIMENSION_OFFSET)),
			end: add(d.end, scale(lift, DIMENSION_OFFSET)),
		};
		drawDimension(ctx, project(lifted.start), project(lifted.end), d.distance, [
			project(d.start),
			project(d.end),
		]);
	}
}

/** Overall width and height of the model, below and to the right of it. */
function drawOverall(
	ctx: CanvasRenderingContext2D,
	box: { min: Vec3; max: Vec3 },
	view: ViewSpec,
	/** Every piece corner, on screen. */
	pts: [number, number][],
) {
	const across = view.across as Axis;
	const upward = view.upward as Axis;
	const left = Math.min(...pts.map((p) => p[0]));
	const right = Math.max(...pts.map((p) => p[0]));
	const top = Math.min(...pts.map((p) => p[1]));
	const bottom = Math.max(...pts.map((p) => p[1]));
	const gap = 48;
	drawDimension(
		ctx,
		[left, bottom + gap],
		[right, bottom + gap],
		box.max[across] - box.min[across],
		[
			[left, bottom],
			[right, bottom],
		],
	);
	drawDimension(
		ctx,
		[right + gap, bottom],
		[right + gap, top],
		box.max[upward] - box.min[upward],
		[
			[right, bottom],
			[right, top],
		],
	);
}

function drawDimension(
	ctx: CanvasRenderingContext2D,
	a: [number, number],
	b: [number, number],
	distance: number,
	from: [[number, number], [number, number]],
) {
	if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 12) return;
	ctx.strokeStyle = DIM_COLOR;
	ctx.fillStyle = DIM_COLOR;
	ctx.lineWidth = 1;
	ctx.setLineDash([]);
	// Extension lines back to the measured points.
	for (const [p, q] of [
		[from[0], a],
		[from[1], b],
	] as const) {
		ctx.beginPath();
		ctx.moveTo(p[0], p[1]);
		ctx.lineTo(q[0], q[1]);
		ctx.stroke();
	}
	ctx.lineWidth = 2;
	ctx.setLineDash([8, 5]);
	ctx.beginPath();
	ctx.moveTo(a[0], a[1]);
	ctx.lineTo(b[0], b[1]);
	ctx.stroke();
	ctx.setLineDash([]);
	for (const p of [a, b]) {
		ctx.beginPath();
		ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
		ctx.fill();
	}
	const label = formatMm(distance);
	ctx.font = FONT;
	const w = ctx.measureText(label).width + 16;
	const mx = (a[0] + b[0]) / 2;
	const my = (a[1] + b[1]) / 2;
	ctx.fillStyle = "#ffffff";
	ctx.strokeStyle = DIM_COLOR;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(mx - w / 2, my - 16, w, 32, 8);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = DIM_COLOR;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, mx, my + 1);
	ctx.textAlign = "start";
}
