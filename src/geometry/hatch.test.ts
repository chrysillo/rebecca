import { describe, expect, it } from "vitest";
import { boxHatch, clipOutside } from "@/geometry/hatch";

const segments = (flat: number[]) => {
	const out: number[][][] = [];
	for (let i = 0; i < flat.length; i += 6)
		out.push([flat.slice(i, i + 3), flat.slice(i + 3, i + 6)]);
	return out;
};

describe("boxHatch", () => {
	const size = { x: 100, y: 40, z: 20 };
	const lines = segments(boxHatch(size, 10));

	it("keeps every line on the box surface", () => {
		for (const [a, b] of lines)
			for (const p of [a, b]) {
				expect(Math.abs(p[0])).toBeLessThanOrEqual(50 + 1e-9);
				expect(Math.abs(p[1])).toBeLessThanOrEqual(20 + 1e-9);
				expect(Math.abs(p[2])).toBeLessThanOrEqual(10 + 1e-9);
				const onFace =
					Math.abs(Math.abs(p[0]) - 50) < 1e-9 ||
					Math.abs(Math.abs(p[1]) - 20) < 1e-9 ||
					Math.abs(Math.abs(p[2]) - 10) < 1e-9;
				expect(onFace).toBe(true);
			}
	});

	it("draws lines at 45° within a face", () => {
		for (const [a, b] of lines) {
			const d = a.map((n, i) => Math.abs(b[i] - n)).filter((n) => n > 1e-9);
			expect(d).toHaveLength(2);
			expect(d[0]).toBeCloseTo(d[1]);
		}
	});

	it("spaces lines evenly across a face", () => {
		// The top face (100 × 40) crosses (100 + 40) / 10 = 14 diagonals, less the corner touch.
		const top = lines.filter(([a, b]) => a[2] === 10 && b[2] === 10);
		expect(top).toHaveLength(13);
	});
});

describe("clipOutside", () => {
	const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };

	it("keeps a line that misses the box", () => {
		expect(clipOutside([-5, 20, 5, 15, 20, 5], box)).toEqual([
			-5, 20, 5, 15, 20, 5,
		]);
	});

	it("cuts the middle out of a line passing through", () => {
		const out = clipOutside([-5, 5, 5, 15, 5, 5], box);
		expect(out).toHaveLength(12);
		expect(out[3]).toBeCloseTo(-0.01);
		expect(out[6]).toBeCloseTo(10.01);
	});

	it("drops a line lying on the box's face", () => {
		expect(clipOutside([2, 0, 2, 8, 0, 8], box)).toEqual([]);
	});
});
