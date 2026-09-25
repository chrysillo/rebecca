import { ACTIONS } from "@/input/actions";
import { type Action, shortcutLabel } from "@/input/keymap";
import { ACTION_ICONS } from "@/ui/icons";

/**
 * A 36px icon button bound to an action, with its name and shortcut in a hover tooltip.
 * Shared by the tool strip and the export bar so both sets of buttons look and behave alike.
 */
export function IconButton({
	action,
	label,
	active = false,
	disabled = false,
	tooltipSide = "right",
}: {
	action: Action;
	label: string;
	active?: boolean;
	disabled?: boolean;
	/** Which side of the button the tooltip opens on, so it doesn't fall off the edge of the screen. */
	tooltipSide?: "right" | "left" | "bottom";
}) {
	return (
		<div className="group relative">
			<button
				type="button"
				aria-label={`${label} (${shortcutLabel(action)})`}
				onClick={ACTIONS[action]}
				disabled={disabled}
				className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:text-neutral-400 ${
					active
						? "bg-neutral-800 text-amber-300"
						: "text-neutral-600 hover:bg-neutral-100 disabled:hover:bg-transparent"
				}`}
			>
				{ACTION_ICONS[action]}
			</button>
			<span
				role="tooltip"
				className={`pointer-events-none absolute z-20 rounded-lg bg-neutral-800/92 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow transition-opacity delay-150 group-hover:opacity-100 ${
					tooltipSide === "right"
						? "top-1/2 left-full ml-2 -translate-y-1/2"
						: tooltipSide === "left"
							? "top-1/2 right-full mr-2 -translate-y-1/2"
							: "top-full left-1/2 mt-2 -translate-x-1/2"
				}`}
			>
				{label}
				<span className="ml-2 text-white/60">{shortcutLabel(action)}</span>
			</span>
		</div>
	);
}
