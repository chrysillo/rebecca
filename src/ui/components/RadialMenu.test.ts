import { describe, expect, it } from "vitest";
import { wheelBeside } from "@/ui/components/RadialMenu";

describe("wheelBeside", () => {
	const screen = { width: 1400, height: 800 };

	it("sits to the right of the pieces when there's room", () => {
		const at = wheelBeside(
			{ minX: 300, minY: 300, maxX: 600, maxY: 500 },
			screen,
		);
		expect(at?.x).toBeGreaterThan(600 + 150);
	});

	it("falls back to the left when the pieces reach the right edge", () => {
		const at = wheelBeside(
			{ minX: 800, minY: 300, maxX: 1300, maxY: 500 },
			screen,
		);
		expect(at?.x).toBeLessThan(800 - 150);
	});

	it("gives up when the pieces fill the screen", () => {
		expect(
			wheelBeside({ minX: 0, minY: 0, maxX: 1400, maxY: 800 }, screen),
		).toBeNull();
	});
});
