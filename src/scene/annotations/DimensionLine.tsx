import { Html, Line } from "@react-three/drei";
import {
	DIMENSION_OFFSET,
	type Dimension,
	dimensionOffsetDirection,
	formatMm,
} from "@/geometry/measure";
import { add, scale, sub, type Vec3 } from "@/geometry/vec";
import { ScreenSizeGroup } from "@/scene/shared/ScreenSizeGroup";

type Props = {
	dimension: Dimension;
	/** Line and label colour. */
	color: string;
	/** The line is offset to the side away from this point (e.g. the measured pieces' centre). */
	awayFrom?: Vec3;
	/** How far the line sits off the measured points (mm); stacked dimensions sit further out. */
	offset?: number;
	/** Shows a × on the label that calls this. */
	onRemove?: () => void;
};

type Point = [number, number, number];

const toPoint = (v: Dimension["start"]): Point => [v.x, v.y, v.z];

/**
 * A dashed dimension line with a dot at each end and the distance in the middle. Drawn over the
 * model (no depth test) so it's never hidden. Shared by saved measurements and live drag gaps.
 */
export function DimensionLine({
	dimension,
	color,
	awayFrom,
	offset = DIMENSION_OFFSET,
	onRemove,
}: Props) {
	const { distance } = dimension;
	// Like a drawing dimension: the line is lifted off the pieces by OFFSET_MM, with thin
	// extension lines back to the measured points, so it never sits on top of an edge.
	const along = sub(dimension.end, dimension.start);
	const lift = dimensionOffsetDirection(along, dimension.start, awayFrom);
	const start = add(dimension.start, scale(lift, offset));
	const end = add(dimension.end, scale(lift, offset));
	const mid: Point = [
		(start.x + end.x) / 2,
		(start.y + end.y) / 2,
		(start.z + end.z) / 2,
	];
	// Dash length relative to the line so short and long dimensions both read as dashed.
	const dash = Math.min(60, Math.max(4, distance / 25));

	return (
		<group>
			{distance > 0 && (
				<Line
					points={[toPoint(start), toPoint(end)]}
					color={color}
					lineWidth={1.75}
					dashed
					dashSize={dash}
					gapSize={dash * 0.7}
					depthTest={false}
					transparent
					renderOrder={900}
				/>
			)}
			{[
				[dimension.start, start],
				[dimension.end, end],
			].map(([from, to], i) => (
				<Line
					// biome-ignore lint/suspicious/noArrayIndexKey: always exactly the two extension lines
					key={`ext${i}`}
					points={[toPoint(from), toPoint(to)]}
					color={color}
					lineWidth={1}
					opacity={0.6}
					depthTest={false}
					transparent
					renderOrder={900}
				/>
			))}
			{[start, end].map((p, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: always exactly the two ends
				<ScreenSizeGroup key={i} position={p}>
					<mesh renderOrder={900}>
						<sphereGeometry args={[0.014, 12, 8]} />
						<meshBasicMaterial
							color={color}
							transparent
							depthTest={false}
							toneMapped={false}
						/>
					</mesh>
				</ScreenSizeGroup>
			))}
			<Html position={mid} center zIndexRange={[15, 5]}>
				<div
					className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap text-white shadow"
					style={{ background: color }}
				>
					{formatMm(distance)}
					{onRemove && (
						<button
							type="button"
							aria-label="Remove measurement"
							className="-mr-1 rounded-full px-1 leading-none text-white/70 hover:bg-white/20 hover:text-white"
							onClick={onRemove}
						>
							×
						</button>
					)}
				</div>
			</Html>
		</group>
	);
}
