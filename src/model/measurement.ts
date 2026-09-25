import type { EdgeRef } from "@/geometry/box";
import type { Id } from "@/model/types";

/**
 * A saved dimension from the middle of one edge to the middle of another (possibly on the same
 * piece). It references the edges, not fixed points, so it follows the pieces as they move or resize.
 */
export type Measurement = { id: Id; from: EdgeRef; to: EdgeRef };
