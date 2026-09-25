import { describe, expect, it } from "vitest";
import { fromProjectFile, newDocument, toProjectFile } from "@/state/document";
import { docWith, sheet } from "@/test/fixtures";

describe("project files", () => {
	it("round-trips the model and drops session state", () => {
		const doc = docWith([sheet()], { selection: ["sheet"] });
		const loaded = fromProjectFile(
			JSON.parse(JSON.stringify(toProjectFile(doc))),
		);
		expect(loaded.pieces).toEqual(doc.pieces);
		expect(loaded.stock).toEqual(doc.stock);
		expect(loaded.measurements).toEqual(doc.measurements);
		expect(loaded.joints).toEqual(doc.joints);
		expect(loaded.selection).toEqual([]);
	});

	it("refuses a file missing a collection", () => {
		expect(() =>
			fromProjectFile({ version: 1, pieces: {}, stock: {} }),
		).toThrow("missing measurements, joints, groups");
	});

	it("refuses files it doesn't understand", () => {
		expect(() => fromProjectFile({ version: 99 })).toThrow();
		expect(() => fromProjectFile(null)).toThrow();
	});

	it("gives each new project its own stock ids", () => {
		expect(Object.keys(newDocument().stock)).not.toEqual(
			Object.keys(newDocument().stock),
		);
	});
});
