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
				className="flex items-center gap-2 rounded-lg bg-neutral-800/92 px-3.5 py-2 text-xs text-white shadow"
			>
				<span className="h-1.5 w-1.5 rounded-[2px] bg-amber-300" />
				{notice.text}
			</div>
		</div>
	);
}
