import { MEASURE_COLOR } from "@/colors";
import {
	DIMENSION_OFFSET,
	type Dimension,
	dimensionOffsetDirection,
	formatMm,
	measureEdges,
} from "@/geometry/measure";
import { type Axis, add, scale, sub, type Vec3 } from "@/geometry/vec";
import type { Measurement } from "@/model/measurement";
import type { Piece } from "@/model/types";

/** 2D canvas drawing for the exported views sheet: dimension lines over the rendered views. */

const FONT = '500 22px "Barlow", system-ui, sans-serif';

export type Project = (p: Vec3) => [number, number];

/** The saved measurements, lifted off the pieces as on screen. Ones seen end-on are skipped. */
export function drawMeasurements(
	ctx: CanvasRenderingContext2D,
	pieces: Piece[],
	measurements: Measurement[],
	project: Project,
) {
	const byId = Object.fromEntries(pieces.map((p) => [p.id, p]));
	for (const m of measurements) {
		const d = measureEdges(byId, m.from, m.to, m.at);
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
export function drawOverall(
	ctx: CanvasRenderingContext2D,
	box: { min: Vec3; max: Vec3 },
	/** The world axes running across and up the picture. */
	across: Axis,
	upward: Axis,
	/** Every piece corner, on screen. */
	pts: [number, number][],
) {
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

/** A dimension line from a to b with extension lines back to the measured points and a label. */
export function drawDimension(
	ctx: CanvasRenderingContext2D,
	a: [number, number],
	b: [number, number],
	distance: number,
	from: [[number, number], [number, number]],
) {
	if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 12) return;
	ctx.strokeStyle = MEASURE_COLOR;
	ctx.fillStyle = MEASURE_COLOR;
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
	ctx.strokeStyle = MEASURE_COLOR;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.roundRect(mx - w / 2, my - 16, w, 32, 8);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = MEASURE_COLOR;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(label, mx, my + 1);
	ctx.textAlign = "start";
}
