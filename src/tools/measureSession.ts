import { commands } from "@/commands";
import type { EdgeRef } from "@/geometry/box";
import { useAppStore } from "@/state/store";

const store = () => useAppStore.getState();

/**
 * Measure tool: the first edge click sets where the measurement starts; the second adds a
 * measurement from there to the clicked edge (one undo step) and goes back to the select tool.
 */
export function measureClick(edge: EdgeRef) {
	const { measureStart, setMeasureStart, apply, setTool } = store();
	if (!measureStart) {
		setMeasureStart(edge);
		return;
	}
	apply(commands.addMeasurement(measureStart, edge));
	setTool("select");
}

/** Ends a measurement chain. Returns true if one was in progress. */
export function cancelMeasure(): boolean {
	if (!store().measureStart) return false;
	store().setMeasureStart(null);
	return true;
}
