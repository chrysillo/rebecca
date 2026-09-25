import { describe, expect, it } from "vitest";
import { isValidProjectName, nextFreeName } from "@/persistence/projectName";

describe("isValidProjectName", () => {
	it("accepts ordinary names", () => {
		for (const name of ["Untitled", "Bookshelf 2", "desk_v1.2", "Shed (big)"])
			expect(isValidProjectName(name)).toBe(true);
	});

	it("rejects anything that could escape the projects folder or hide a file", () => {
		for (const name of [
			"",
			"../x",
			"..",
			".hidden",
			"a/b",
			"a\\b",
			" padded",
			"x".repeat(81),
		])
			expect(isValidProjectName(name)).toBe(false);
	});
});

describe("nextFreeName", () => {
	it("numbers from 2 once the base is taken", () => {
		expect(nextFreeName([])).toBe("Untitled");
		expect(nextFreeName(["Untitled"])).toBe("Untitled 2");
		expect(nextFreeName(["Untitled", "Untitled 2"])).toBe("Untitled 3");
	});
});
