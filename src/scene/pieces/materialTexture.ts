import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { materialHash, type Stock } from "@/model/stock";

/**
 * Faint pencil patterns over each sheet material's tint, so plywood, OSB and anything else read
 * apart at a glance. They're drawn once, in grey on white: the material multiplies them by the
 * piece's colour, so selection, hover and the join preview tint them like before.
 */

type Pattern = "grain" | "strands" | "stipple" | "crosshatch" | "diagonal";

/** Materials with a pattern that suits them. Any other name gets one of `OTHER_PATTERNS`. */
const MATERIAL_PATTERN: Record<string, Pattern> = {
	Plywood: "grain",
	OSB: "strands",
	MDF: "stipple",
};
const OTHER_PATTERNS: Pattern[] = ["crosshatch", "diagonal", "stipple"];

/** Pixels across one tile. A power of two, so it mipmaps and doesn't shimmer when far away. */
const SIZE = 256;
const PAPER = "#ffffff";
const PENCIL = "#3a3128";
/** How dark the strokes are: kept faint so the tint and the outlines still lead. */
const PENCIL_ALPHA = 0.22;
const ANISOTROPY = 4;

/** One texture per pattern, shared by every piece that uses it. */
const cache = new Map<Pattern, CanvasTexture>();

/** A sheet's pattern texture (framing has none). */
export function materialTexture(stock: Stock): CanvasTexture | null {
	if (stock.kind !== "sheet") return null;
	const pattern =
		MATERIAL_PATTERN[stock.material] ??
		OTHER_PATTERNS[materialHash(stock.material) % OTHER_PATTERNS.length];
	let texture = cache.get(pattern);
	if (!texture) {
		texture = drawTexture(pattern);
		cache.set(pattern, texture);
	}
	return texture;
}

function drawTexture(pattern: Pattern): CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = SIZE;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = PAPER;
		ctx.fillRect(0, 0, SIZE, SIZE);
		ctx.strokeStyle = ctx.fillStyle = PENCIL;
		ctx.lineCap = "round";
		DRAW[pattern](ctx, seeded(pattern.length * 7919));
	}
	const texture = new CanvasTexture(canvas);
	texture.wrapS = texture.wrapT = RepeatWrapping;
	texture.colorSpace = SRGBColorSpace;
	texture.anisotropy = ANISOTROPY;
	return texture;
}

type Random = () => number;

/** The same "random" strokes every load. */
function seeded(seed: number): Random {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Draws `path` in all nine tile positions, so strokes crossing an edge carry on across the next tile. */
function tiled(ctx: CanvasRenderingContext2D, path: () => void) {
	for (const dx of [-SIZE, 0, SIZE])
		for (const dy of [-SIZE, 0, SIZE]) {
			ctx.save();
			ctx.translate(dx, dy);
			path();
			ctx.restore();
		}
}

/** A pencil stroke: slightly uneven weight and darkness, like a hand-drawn line. */
function pencil(ctx: CanvasRenderingContext2D, rand: Random, width: number) {
	ctx.lineWidth = width * (0.8 + rand() * 0.4);
	ctx.globalAlpha = PENCIL_ALPHA * (0.7 + rand() * 0.6);
}

const DRAW: Record<
	Pattern,
	(ctx: CanvasRenderingContext2D, rand: Random) => void
> = {
	/** Plywood: long wavy grain lines along the sheet's length. */
	grain(ctx, rand) {
		const LINES = 7;
		for (let i = 0; i < LINES; i++) {
			const y0 = ((i + rand() * 0.6) / LINES) * SIZE;
			// Whole waves per tile, so the line meets itself at the tile edge.
			const waves = 1 + Math.floor(rand() * 2);
			const amp = 3 + rand() * 6;
			const phase = rand() * Math.PI * 2;
			pencil(ctx, rand, 1.6);
			tiled(ctx, () => {
				ctx.beginPath();
				for (let x = 0; x <= SIZE; x += 4) {
					const y =
						y0 + amp * Math.sin((x / SIZE) * waves * Math.PI * 2 + phase);
					if (x === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.stroke();
			});
		}
	},
	/** OSB: short strands lying every which way. */
	strands(ctx, rand) {
		const STRANDS = 70;
		for (let i = 0; i < STRANDS; i++) {
			const x = rand() * SIZE;
			const y = rand() * SIZE;
			const angle = rand() * Math.PI;
			const half = 10 + rand() * 14;
			const dx = Math.cos(angle) * half;
			const dy = Math.sin(angle) * half;
			pencil(ctx, rand, 1.8);
			tiled(ctx, () => {
				ctx.beginPath();
				ctx.moveTo(x - dx, y - dy);
				ctx.lineTo(x + dx, y + dy);
				ctx.stroke();
			});
		}
	},
	/** MDF: fine scattered dots. */
	stipple(ctx, rand) {
		const DOTS = 220;
		for (let i = 0; i < DOTS; i++) {
			const x = rand() * SIZE;
			const y = rand() * SIZE;
			const r = 1 + rand() * 0.8;
			ctx.globalAlpha = PENCIL_ALPHA * (1 + rand());
			tiled(ctx, () => {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			});
		}
	},
	crosshatch(ctx, rand) {
		hatch(ctx, rand, 1);
		hatch(ctx, rand, -1);
	},
	diagonal(ctx, rand) {
		hatch(ctx, rand, 1);
	},
};

/** Evenly spaced 45° lines (`slope` 1 or -1); the spacing divides the tile, so they meet across edges. */
function hatch(ctx: CanvasRenderingContext2D, rand: Random, slope: 1 | -1) {
	const LINES = 8;
	const step = SIZE / LINES;
	for (let i = 0; i < LINES; i++) {
		const x = i * step;
		pencil(ctx, rand, 1.4);
		tiled(ctx, () => {
			ctx.beginPath();
			ctx.moveTo(x, slope > 0 ? 0 : SIZE);
			ctx.lineTo(x + SIZE, slope > 0 ? SIZE : 0);
			ctx.stroke();
		});
	}
}
