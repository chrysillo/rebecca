import { useEffect } from "react";
import { useAppStore } from "@/state/store";

const SHOW_MS = 2800;

/** Bottom-centre message for things like "that face can't be extruded". Fades after a moment. */
export function Notice() {
	const notice = useAppStore((s) => s.notice);
	const clear = useAppStore((s) => s.clearNotice);

	useEffect(() => {
		if (!notice) return;
		const timer = setTimeout(clear, SHOW_MS);
		return () => clearTimeout(timer);
	}, [notice, clear]);

	if (!notice) return null;
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
			<div
				role="status"
				className="rounded-md bg-neutral-900/90 px-3 py-1.5 text-xs text-white shadow"
			>
				{notice.text}
			</div>
		</div>
	);
}
