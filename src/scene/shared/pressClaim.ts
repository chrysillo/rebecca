/**
 * Left presses in the 3D view that something has taken (a gizmo handle, a selected piece about to
 * be dragged, the view cube). A press nobody claims may start a selection box instead.
 */
const claimed = new WeakSet<Event>();

export const claimPress = (e: Event) => {
	claimed.add(e);
};

export const isPressClaimed = (e: Event) => claimed.has(e);
