import type { PointerEvent, ReactNode, WheelEvent } from "react";
import type { ScreenPoint } from "@/input/pointer";

const OUTER = 140;
const INNER = 54;
/** Degrees trimmed from each side of a slice, leaving a thin gap between slices. */
const SLICE_GAP = 0.8;
/** Within this distance of the centre, moving the mouse doesn't change the highlight. */
const DEADZONE = 30;
const EDGE = 12;

/** Centre angle (degrees, 0 = right, counter-clockwise) of slice i of n. The first option sits on the left. */
const sliceAngle = (i: number, n: number) => 180 - (i * 360) / n;

export type RadialSlice = { id: string; content: ReactNode };

type Props = {
	/** Accessible name of the menu. */
	label: string;
	/** Where it opened, in window pixels (kept clear of the window edges). */
	at: ScreenPoint;
	slices: RadialSlice[];
	highlighted: string;
	onHighlight: (id: string) => void;
	onCycle: (step: 1 | -1) => void;
	onConfirm: () => void;
	onCancel: () => void;
	/** Shown in the hub. */
	centre: ReactNode;
	/** Shown under the ring. */
	hint: ReactNode;
	/** Dims the scene behind the wheel. Off when the scene is showing a live preview. */
	backdrop?: boolean;
};

/**
 * Weapon-wheel style ring: point at a slice (or scroll) to highlight it, click to confirm,
 * right-click to cancel. Keyboard handling belongs to whoever opens it.
 */
export function RadialMenu({
	label,
	at,
	slices,
	highlighted,
	onHighlight,
	onCycle,
	onConfirm,
	onCancel,
	centre,
	hint,
	backdrop = true,
}: Props) {
	const n = slices.length;
	const halfSpan = 180 / n;
	const cx = clamp(at.x, OUTER + EDGE, window.innerWidth - OUTER - EDGE);
	const cy = clamp(at.y, OUTER + EDGE, window.innerHeight - OUTER - EDGE);

	const onPointerMove = (e: PointerEvent) => {
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		if (Math.hypot(dx, dy) < DEADZONE) return;
		const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
		const nearest = slices.reduce(
			(best, _, i) =>
				angleGap(angle, sliceAngle(i, n)) < angleGap(angle, sliceAngle(best, n))
					? i
					: best,
			0,
		);
		onHighlight(slices[nearest].id);
	};

	const onPointerDown = (e: PointerEvent) => {
		e.preventDefault();
		if (e.button === 0) onConfirm();
		else onCancel();
	};

	const onWheel = (e: WheelEvent) => onCycle(e.deltaY > 0 ? 1 : -1);

	return (
		<div
			role="menu"
			aria-label={label}
			tabIndex={-1}
			className={`fixed inset-0 z-30 cursor-default ${backdrop ? "bg-[rgba(240,240,240,0.28)]" : ""}`}
			onPointerMove={onPointerMove}
			onPointerDown={onPointerDown}
			onWheel={onWheel}
			onContextMenu={(e) => e.preventDefault()}
		>
			<div
				className="wheel-pop absolute"
				style={{
					left: cx - OUTER,
					top: cy - OUTER,
					width: OUTER * 2,
					height: OUTER * 2,
				}}
			>
				<svg
					width={OUTER * 2}
					height={OUTER * 2}
					viewBox={`${-OUTER} ${-OUTER} ${OUTER * 2} ${OUTER * 2}`}
					className="overflow-visible [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.06))_drop-shadow(0_14px_28px_rgba(0,0,0,0.1))]"
					aria-hidden
				>
					{slices.map((s, i) => (
						<path
							key={s.id}
							d={sector(
								sliceAngle(i, n) - halfSpan + (n > 1 ? SLICE_GAP : 0),
								sliceAngle(i, n) + halfSpan - (n > 1 ? SLICE_GAP : 0),
							)}
							className={`transition-colors duration-100 ${
								s.id === highlighted
									? "fill-neutral-800/94 stroke-neutral-800/94"
									: "fill-white/97 stroke-black/7"
							}`}
							strokeWidth={1}
						/>
					))}
					<circle
						r={INNER - 4}
						className="fill-white stroke-neutral-200"
						strokeWidth={1}
					/>
				</svg>

				{slices.map((s, i) => (
					<SliceContent
						key={s.id}
						angle={sliceAngle(i, n)}
						active={s.id === highlighted}
					>
						{s.content}
					</SliceContent>
				))}

				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center text-neutral-800">
					{centre}
				</div>
			</div>

			<p
				className="pointer-events-none absolute flex -translate-x-1/2 items-center gap-3 rounded-[10px] border border-black/6 bg-white/95 px-3 py-1.5 text-[11px] whitespace-nowrap text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.06)]"
				style={{ left: cx, top: cy + OUTER + 16 }}
			>
				{hint}
			</p>
		</div>
	);
}

/** A slice's label, placed in the middle of its slice. */
function SliceContent({
	angle,
	active,
	children,
}: {
	angle: number;
	active: boolean;
	children: ReactNode;
}) {
	const r = (OUTER + INNER) / 2 + 4;
	const a = (angle * Math.PI) / 180;
	return (
		<div
			className={`group pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 whitespace-nowrap text-center ${
				active ? "text-white" : "text-neutral-600"
			}`}
			data-active={active || undefined}
			style={{ left: OUTER + r * Math.cos(a), top: OUTER - r * Math.sin(a) }}
		>
			{children}
		</div>
	);
}

/** SVG path for a ring slice between two angles (degrees, counter-clockwise from +X, screen Y down). */
function sector(from: number, to: number): string {
	// A single option fills the whole ring: an SVG arc can't start and end at the same point, so split it.
	if (to - from >= 360)
		return `${sector(from, from + 180)} ${sector(from + 180, to)}`;
	const point = (radius: number, deg: number) => {
		const a = (deg * Math.PI) / 180;
		return `${radius * Math.cos(a)} ${-radius * Math.sin(a)}`;
	};
	const large = to - from > 180 ? 1 : 0;
	return [
		`M ${point(OUTER, from)}`,
		`A ${OUTER} ${OUTER} 0 ${large} 0 ${point(OUTER, to)}`,
		`L ${point(INNER, to)}`,
		`A ${INNER} ${INNER} 0 ${large} 1 ${point(INNER, from)}`,
		"Z",
	].join(" ");
}

const angleGap = (a: number, b: number) =>
	Math.abs(((a - b + 540) % 360) - 180);
const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(v, hi));

export type ScreenBox = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
};

/** Space kept between the wheel (and its hint) and whatever it sits beside. */
const BESIDE_GAP = 32;

/**
 * A wheel centre next to `box` (right, left, below, then above) that keeps the wheel fully
 * on screen and off the box, or null if none fits.
 */
export function wheelBeside(
	box: ScreenBox,
	screen: { width: number; height: number },
): ScreenPoint | null {
	const r = OUTER + EDGE;
	const midX = clamp((box.minX + box.maxX) / 2, r, screen.width - r);
	const midY = clamp((box.minY + box.maxY) / 2, r, screen.height - r);
	const candidates: ScreenPoint[] = [
		{ x: box.maxX + BESIDE_GAP + OUTER, y: midY },
		{ x: box.minX - BESIDE_GAP - OUTER, y: midY },
		{ x: midX, y: box.maxY + BESIDE_GAP + OUTER },
		{ x: midX, y: box.minY - BESIDE_GAP - OUTER - 40 },
	];
	return (
		candidates.find(
			(c) =>
				c.x >= r &&
				c.x <= screen.width - r &&
				c.y >= r &&
				// Room for the hint under the ring.
				c.y <= screen.height - r - 40,
		) ?? null
	);
}
