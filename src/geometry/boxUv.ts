import { BufferAttribute, type BufferGeometry } from "three";

/**
 * Gives a piece's shape texture coordinates in millimetres (÷ `tileMm`), projected straight onto
 * each face from the side it faces. A pattern then keeps its scale however far the piece is
 * extruded, and still covers the faces a joint cut leaves (the cut drops the box's own UVs).
 *
 * Faces pointing along ±Z (a sheet's faces) map (x, y), so a pattern's U runs along the piece's
 * length; ±Y faces map (x, z) and ±X faces (y, z).
 */
export function setBoxUvs(geometry: BufferGeometry, tileMm: number): void {
	const position = geometry.getAttribute("position");
	const normal = geometry.getAttribute("normal");
	const uv = new Float32Array(position.count * 2);
	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const y = position.getY(i);
		const z = position.getZ(i);
		const nx = Math.abs(normal.getX(i));
		const ny = Math.abs(normal.getY(i));
		const nz = Math.abs(normal.getZ(i));
		const [u, v] = nz >= nx && nz >= ny ? [x, y] : ny >= nx ? [x, z] : [y, z];
		uv[i * 2] = u / tileMm;
		uv[i * 2 + 1] = v / tileMm;
	}
	geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}
