import { type PointerEvent, useMemo, type WheelEvent } from "react";
import { kindName } from "@/model/naming";
import { orderedStock, type Stock, stockLabel } from "@/model/stock";
import type { PieceKind } from "@/model/types";
import { useAppStore } from "@/state/store";
import {
	cancelCreator,
	confirmCreate,
	cycle,
	highlight,
	resolveStock,
} from "@/tools/creatorSession";

const OUTER = 112;
const INNER = 50;
/** Within this distance of the centre, moving the mouse doesn't change the highlight. */
const DEADZONE = 30;
const EDGE = 12;

/** Centre angle (degrees, 0 = right, counter-clockwise) of slice i of n. The first option sits on the left. */
const sliceAngle = (i: number, n: number) => 180 - (i * 360) / n;

/**
 * Weapon-wheel style chooser for new pieces. Opens at the cursor with the last-used kind preselected.
 * Point, scroll, press R / arrows / 1–2 to change; release R, click, Enter or Space to create.
 */
export function CreateWheel() {
	const creator = useAppStore((s) => s.creator);
	const stock = useAppStore((s) => s.doc.stock);
	const options = useMemo(() => orderedStock(stock), [stock]);
	if (!creator || options.length === 0) return null;
	const n = options.length;
	const halfSpan = 180 / n;
	// What confirm would create right now (a typed size may pick or add a different stock).
	const target = resolveStock();

	const cx = clamp(
		creator.at.x,
		OUTER + EDGE,
		window.innerWidth - OUTER - EDGE,
	);
	const cy = clamp(
		creator.at.y,
		OUTER + EDGE,
		window.innerHeight - OUTER - EDGE,
	);

	const onPointerMove = (e: PointerEvent) => {
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		if (Math.hypot(dx, dy) < DEADZONE) return;
		const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
		const nearest = options.reduce(
			(best, _, i) =>
				angleGap(angle, sliceAngle(i, n)) < angleGap(angle, sliceAngle(best, n))
					? i
					: best,
			0,
		);
		highlight(options[nearest].id);
	};

	const onPointerDown = (e: PointerEvent) => {
		e.preventDefault();
		if (e.button === 0) confirmCreate();
		else cancelCreator();
	};

	const onWheel = (e: WheelEvent) => cycle(e.deltaY > 0 ? 1 : -1);

	return (
		<div
			role="menu"
			aria-label="Create a piece"
			tabIndex={-1}
			className="fixed inset-0 z-30 cursor-default"
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
					className="drop-shadow-xl"
					aria-hidden
				>
					{options.map((s, i) => (
						<path
							key={s.id}
							d={sector(
								sliceAngle(i, n) - halfSpan,
								sliceAngle(i, n) + halfSpan,
							)}
							className={`transition-colors duration-100 ${
								s.id === creator.highlighted
									? "fill-blue-500/90"
									: "fill-neutral-900/75"
							} stroke-white/15`}
							strokeWidth={1.5}
						/>
					))}
					<circle
						r={INNER - 4}
						className="fill-neutral-900/85 stroke-white/15"
						strokeWidth={1.5}
					/>
				</svg>

				{options.map((s, i) => (
					<Option
						key={s.id}
						stock={s}
						angle={sliceAngle(i, n)}
						active={s.id === creator.highlighted}
					/>
				))}

				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white">
					<span className="text-[11px] font-semibold uppercase tracking-wide">
						{target ? kindName(target.kind) : ""}
					</span>
					<span className="text-[10px] tabular-nums text-white/70">
						{creator.typed ? (
							<>
								{creator.typed}
								<span className="animate-pulse">▏</span>
								{target && !stock[target.id] && " (new)"}
							</>
						) : (
							target && stockLabel(target)
						)}
					</span>
				</div>
			</div>

			<p
				className="pointer-events-none absolute -translate-x-1/2 rounded bg-neutral-900/75 px-2 py-0.5 text-[10px] whitespace-nowrap text-white/80"
				style={{ left: cx, top: cy + OUTER + 8 }}
			>
				Release R / click to create · scroll or R to switch · S / F quick pick ·
				type a size · Esc
			</p>
		</div>
	);
}

type OptionProps = { stock: Stock; angle: number; active: boolean };

/** Icon, name and size of one stock option, placed in the middle of its slice. */
function Option({ stock, angle, active }: OptionProps) {
	const r = (OUTER + INNER) / 2;
	const a = (angle * Math.PI) / 180;
	return (
		<div
			className={`pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center transition-transform duration-100 ${
				active ? "scale-110 text-white" : "text-white/70"
			}`}
			style={{ left: OUTER + r * Math.cos(a), top: OUTER - r * Math.sin(a) }}
		>
			<KindIcon kind={stock.kind} />
			<span className="text-[11px] font-semibold">{kindName(stock.kind)}</span>
			<span className="text-[10px] tabular-nums opacity-80">
				{stockLabel(stock)}
			</span>
		</div>
	);
}

/** Tiny silhouettes: a flat board for sheets, a long bar for framing. */
function KindIcon({ kind }: { kind: PieceKind }) {
	return (
		<svg
			width="28"
			height="16"
			viewBox="0 0 28 16"
			aria-hidden
			className="fill-current"
		>
			{kind === "sheet" ? (
				<path d="M2 9 L14 4 L26 9 L14 14 Z" opacity={0.9} />
			) : (
				<rect x="1" y="6" width="26" height="5" rx="1" opacity={0.9} />
			)}
		</svg>
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
