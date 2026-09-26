import { useAppStore } from "@/state/store";
import { IconButton } from "@/ui/IconButton";

/**
 * Opens the shortcuts list. Sits alone in the bottom-left corner, where the hint strip used to be,
 * so it's easy to find without taking space from the tools.
 */
export function ShortcutsButton() {
	const open = useAppStore((s) => s.shortcutsOpen);

	return (
		<nav className="rounded-xl border border-black/6 bg-white/92 p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.05)] backdrop-blur-md">
			<IconButton action="shortcuts" label="Shortcuts" active={open} />
		</nav>
	);
}
