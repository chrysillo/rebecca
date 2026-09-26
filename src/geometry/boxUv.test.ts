import { BoxGeometry } from "three";
import { describe, expect, it } from "vitest";
import { setBoxUvs } from "@/geometry/boxUv";

/** Every vertex's position, normal and UV, for vertices on faces pointing along `axis`. */
function vertices(geometry: BoxGeometry, axis: "x" | "y" | "z") {
	const pos = geometry.getAttribute("position");
	const nrm = geometry.getAttribute("normal");
	const uv = geometry.getAttribute("uv");
	const out = [];
	for (let i = 0; i < pos.count; i++) {
		const n = { x: nrm.getX(i), y: nrm.getY(i), z: nrm.getZ(i) };
		if (Math.abs(n[axis]) !== 1) continue;
		out.push({
			p: { x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) },
			uv: [uv.getX(i), uv.getY(i)],
		});
	}
	return out;
}

describe("setBoxUvs", () => {
	const TILE = 100;

	it("maps a sheet's faces by x and y in tiles", () => {
		const box = new BoxGeometry(800, 400, 18);
		setBoxUvs(box, TILE);
		const top = vertices(box, "z");
		expect(top.length).toBeGreaterThan(0);
		for (const { p, uv } of top) {
			expect(uv[0]).toBeCloseTo(p.x / TILE);
			expect(uv[1]).toBeCloseTo(p.y / TILE);
		}
	});

	it("maps side faces by the two axes they span", () => {
		const box = new BoxGeometry(800, 400, 18);
		setBoxUvs(box, TILE);
		for (const { p, uv } of vertices(box, "y")) {
			expect(uv[0]).toBeCloseTo(p.x / TILE);
			expect(uv[1]).toBeCloseTo(p.z / TILE);
		}
		for (const { p, uv } of vertices(box, "x")) {
			expect(uv[0]).toBeCloseTo(p.y / TILE);
			expect(uv[1]).toBeCloseTo(p.z / TILE);
		}
	});

	it("covers shapes that have no UVs of their own (a joint cut)", () => {
		const box = new BoxGeometry(200, 100, 18).toNonIndexed();
		box.deleteAttribute("uv");
		setBoxUvs(box, TILE);
		expect(box.getAttribute("uv").count).toBe(
			box.getAttribute("position").count,
		);
	});
});
