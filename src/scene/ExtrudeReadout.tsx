import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { faceCentre } from "../geometry/box";
import { extrudableDimension } from "../geometry/extrude";
import { effectiveDistance } from "../state/extrude";
import { extrudePreview } from "../state/selectors";
import { useAppStore } from "../state/store";

const DIMENSION_LABEL: Record<string, string> = {
	length: "Length",
	width: "Width",
};

/** Label on the moving face while extruding: the distance (or what's being typed) and the new dimension. */
export function ExtrudeReadout() {
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const preview = useMemo(() => extrudePreview(doc, extrude), [doc, extrude]);
	if (!extrude || !preview) return null;

	const key = extrudableDimension(preview, extrude.face);
	const value = key
		? (preview as unknown as Record<string, number>)[key]
		: null;
	const centre = faceCentre(preview, extrude.face);
	const distance = effectiveDistance(extrude);

	return (
		<Html
			position={[centre.x, centre.y, centre.z]}
			center
			zIndexRange={[20, 10]}
			style={{ pointerEvents: "none" }}
		>
			<div className="flex translate-y-7 flex-col items-center gap-0.5 whitespace-nowrap">
				<div className="rounded-md bg-neutral-900/85 px-2 py-0.5 text-xs font-semibold tabular-nums text-white shadow">
					{extrude.typed ? (
						<span>
							{extrude.typed}
							<span className="animate-pulse">▏</span> mm
						</span>
					) : (
						`${distance > 0 ? "+" : ""}${Math.round(distance * 10) / 10} mm`
					)}
				</div>
				{key && value !== null && (
					<div className="rounded bg-white/90 px-1.5 text-[10px] tabular-nums text-neutral-600 shadow-sm">
						{DIMENSION_LABEL[key] ?? key} {value} mm
					</div>
				)}
			</div>
		</Html>
	);
}
