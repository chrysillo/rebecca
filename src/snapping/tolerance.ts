/**
 * Converts a screen distance to world millimetres at a given depth, for a perspective camera,
 * so snapping feels the same at any zoom level.
 */
export function pixelsToMm(
	pixels: number,
	cameraDistance: number,
	fovDegrees: number,
	viewportHeightPx: number,
): number {
	const visibleHeight =
		2 * cameraDistance * Math.tan((fovDegrees * Math.PI) / 360);
	return (pixels * visibleHeight) / viewportHeightPx;
}
