import { useEffect } from "react";
import { ACTIONS } from "./actions";
import { actionFor } from "./keymap";

const isTextEntry = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** The single global keyboard listener. Mount once, at the app root. */
export function useKeybindings() {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (isTextEntry(e.target)) return;
			const action = actionFor(e);
			if (!action) return;
			e.preventDefault();
			ACTIONS[action]();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}
