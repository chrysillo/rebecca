import type { EdgeRef } from "@/geometry/box";
import type { Id } from "@/model/types";

/**
 * A saved dimension from one edge to another (possibly on the same
 * piece). It references the edges, not fixed points, so it follows the pieces as they move or resize.
 * `at` is where it crosses, along the first edge (0.5 = the middle); dragging the label slides it.
 */
export type Measurement = { id: Id; from: EdgeRef; to: EdgeRef; at: number };
