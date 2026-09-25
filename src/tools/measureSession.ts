import { commands } from "@/commands";
import type { EdgeRef } from "@/geometry/box";
import { useAppStore } from "@/state/store";

const store = () => useAppStore.getState();

/**
 * Measure tool: the first edge click sets where the measurement starts; each next click adds a
 * measurement from there to the clicked edge (one undo step) and chains on from it.
 */
export function measureClick(edge: EdgeRef) {
	const { measureStart, setMeasureStart, apply } = store();
	if (measureStart) apply(commands.addMeasurement(measureStart, edge));
	setMeasureStart(edge);
}

/** Ends a measurement chain. Returns true if one was in progress. */
export function cancelMeasure(): boolean {
	if (!store().measureStart) return false;
	store().setMeasureStart(null);
	return true;
}
