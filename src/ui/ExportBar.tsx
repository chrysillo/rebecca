import { useAppStore } from "@/state/store";
import { IconButton } from "@/ui/IconButton";

/**
 * Outputs generated from the model, not actions performed on it — a vertical strip mirroring
 * the tool strip, placed below the view cube the 3D view draws in the top-right corner.
 */
export function ExportBar() {
	const hasPieces = useAppStore((s) => Object.keys(s.doc.pieces).length > 0);

	return (
		<nav className="flex flex-col items-center gap-0.5 rounded-xl border border-black/6 bg-white/92 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.05)] backdrop-blur-md p-1.5">
			<IconButton
				action="exportCutList"
				label="Copy cut list"
				disabled={!hasPieces}
				tooltipSide="left"
			/>
			<IconButton
				action="exportViews"
				label="Export views (PNG)"
				disabled={!hasPieces}
				tooltipSide="left"
			/>
		</nav>
	);
}
