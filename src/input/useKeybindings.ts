import { useEffect } from "react";
import { ACTIONS } from "@/input/actions";
import { actionFor } from "@/input/keymap";
import { handleCreatorKey, handleCreatorKeyUp } from "@/tools/creatorSession";
import { handleExtrudeKey } from "@/tools/extrudeSession";

const isTextEntry = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The single global keyboard listener (plus key-up for hold-to-create). Mount once, at the app root. */
export function useKeybindings() {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (isTextEntry(e.target)) return;
			// While the create wheel is open or a face is being extruded, their keys come first.
			if (handleCreatorKey(e) || handleExtrudeKey(e)) {
				e.preventDefault();
				return;
			}
			const action = actionFor(e);
			if (!action) return;
			e.preventDefault();
			ACTIONS[action]();
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", handleCreatorKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", handleCreatorKeyUp);
		};
	}, []);
}
