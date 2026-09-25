import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";
import { FLOOR_AXIS_COLOR } from "@/colors";

/** Where the axis triad starts (a corner just outside the unit cube) and how far its arms reach. */
const TRIAD_ORIGIN = -0.54;
const TRIAD_LENGTH = 1.45;
const AXES = [
	{ name: "X", dir: [1, 0, 0], color: FLOOR_AXIS_COLOR.x },
	{ name: "Y", dir: [0, 1, 0], color: FLOOR_AXIS_COLOR.y },
	{ name: "Z", dir: [0, 0, 1], color: FLOOR_AXIS_COLOR.z },
] as const;

/** X / Y / Z arms from the view cube's back-bottom-left corner, labelled, in the axis colours (unit-cube units). */
export function AxisTriad() {
	const letters = useMemo(
		() => AXES.map((a) => letterTexture(a.name, a.color)),
		[],
	);
	useEffect(
		() => () => {
			for (const t of letters) t.dispose();
		},
		[letters],
	);
	const along = (dir: readonly number[], length: number) =>
		dir.map((d) => TRIAD_ORIGIN + d * length) as [number, number, number];
	const origin: [number, number, number] = [
		TRIAD_ORIGIN,
		TRIAD_ORIGIN,
		TRIAD_ORIGIN,
	];

	return (
		<>
			{AXES.map((a, i) => (
				<group key={a.name}>
					<Line
						points={[origin, along(a.dir, TRIAD_LENGTH)]}
						color={a.color}
						lineWidth={1.5}
						raycast={() => null}
					/>
					<sprite
						position={along(a.dir, TRIAD_LENGTH + 0.24)}
						scale={0.34}
						raycast={() => null}
					>
						<spriteMaterial map={letters[i]} />
					</sprite>
				</group>
			))}
		</>
	);
}

function letterTexture(letter: string, color: string): CanvasTexture {
	const size = 64;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = color;
		ctx.font = '600 40px "JetBrains Mono", ui-monospace, monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(letter, size / 2, size / 2);
	}
	return new CanvasTexture(canvas);
}
