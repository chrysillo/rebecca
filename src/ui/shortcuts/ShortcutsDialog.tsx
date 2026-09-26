import { useEffect, useRef } from "react";
import { actionFor, bindingLabel, KEYMAP } from "@/input/keymap";
import { useAppStore } from "@/state/store";
import {
	SHORTCUT_SECTIONS,
	type ShortcutRow,
} from "@/ui/shortcuts/shortcutList";

const close = () => useAppStore.getState().setShortcutsOpen(false);

/**
 * Every key shortcut and mouse gesture, in a scrolling dialog over the view. Opened with "?" or
 * the button in the bottom-left corner; closed by either again, Escape, or a click outside.
 */
export function ShortcutsDialog() {
	const open = useAppStore((s) => s.shortcutsOpen);
	const dialog = useRef<HTMLDivElement>(null);
	const body = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		// Focused so the arrow and page keys scroll the list.
		body.current?.focus();
		// Capture phase, ahead of the global keybindings, so nothing happens behind the dialog.
		// Browser shortcuts still work: only propagation is stopped, not the default.
		const onKeyDown = (e: KeyboardEvent) => {
			e.stopPropagation();
			if (e.key === "Escape" || actionFor(e) === "shortcuts") {
				e.preventDefault();
				close();
			}
		};
		const onPointerDown = (e: PointerEvent) => {
			if (!dialog.current?.contains(e.target as Node)) close();
		};
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("pointerdown", onPointerDown, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("pointerdown", onPointerDown, true);
		};
	}, [open]);

	if (!open) return null;
	return (
		// The backdrop also keeps clicks off the view: a press on it just closes the dialog.
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/15 p-4">
			<div
				ref={dialog}
				role="dialog"
				aria-modal
				aria-labelledby="shortcuts-title"
				className="flex max-h-[min(80vh,44rem)] w-full max-w-2xl flex-col rounded-xl border border-black/8 bg-white/96 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.14)] backdrop-blur-md"
			>
				<header className="flex items-center justify-between border-b border-black/6 px-5 py-3.5">
					<h2
						id="shortcuts-title"
						className="font-condensed text-sm font-semibold uppercase leading-none tracking-[0.12em] text-neutral-600"
					>
						Shortcuts
					</h2>
					<button
						type="button"
						aria-label="Close"
						onClick={close}
						className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
					>
						✕
					</button>
				</header>
				<div
					ref={body}
					tabIndex={-1}
					className="overflow-y-auto px-5 pt-4 outline-none sm:columns-2 sm:gap-8"
				>
					{SHORTCUT_SECTIONS.map((section) => (
						<section key={section.title} className="mb-5 break-inside-avoid">
							<h3 className="mb-1.5 text-[11px] text-neutral-400">
								{section.title}
							</h3>
							<ul className="flex flex-col">
								{section.rows.map((row) => (
									<li
										key={row.does}
										className="flex min-h-7 items-center justify-between gap-3 text-xs text-neutral-700"
									>
										{row.does}
										<Keys row={row} />
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</div>
	);
}

/** The keys for one row: alternatives separated by "or", combinations as keys side by side. */
function Keys({ row }: { row: ShortcutRow }) {
	const alternatives =
		"action" in row ? KEYMAP[row.action].map(bindingLabel) : row.keys;
	return (
		<span className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-400">
			{alternatives.map((alt, i) => (
				<span key={String(alt)} className="flex items-center gap-1">
					{i > 0 && "or"}
					{(Array.isArray(alt) ? alt : [alt]).map((key) => (
						<kbd
							key={key}
							className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-tight text-neutral-600"
						>
							{key}
						</kbd>
					))}
				</span>
			))}
		</span>
	);
}
