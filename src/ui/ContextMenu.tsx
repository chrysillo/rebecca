import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cutSizeLabel, stockLabel } from "@/model/stock";
import { useAppStore } from "@/state/store";
import { closeContextMenu, menuItems } from "@/tools/contextMenuSession";

/** Gap (px) kept between the menu and the window edge. */
const EDGE = 8;

/**
 * The right-click menu for a piece: its name and size, then the actions. Closes on a pick,
 * Escape, a press anywhere else, or the wheel.
 */
export function ContextMenu() {
	const menu = useAppStore((s) => s.contextMenu);
	const piece = useAppStore((s) =>
		menu ? s.doc.pieces[menu.pieceId] : undefined,
	);
	const doc = useAppStore((s) => s.doc);
	const stock = useAppStore((s) =>
		piece ? s.doc.stock[piece.stockId] : undefined,
	);
	const ref = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ x: 0, y: 0 });

	// Kept on screen: flipped left/up if it would run off the right or bottom edge.
	useLayoutEffect(() => {
		if (!menu || !ref.current) return;
		const { width, height } = ref.current.getBoundingClientRect();
		setPos({
			x: Math.max(EDGE, Math.min(menu.x, window.innerWidth - width - EDGE)),
			y: Math.max(EDGE, Math.min(menu.y, window.innerHeight - height - EDGE)),
		});
	}, [menu]);

	useEffect(() => {
		if (!menu) return;
		const onPointerDown = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) closeContextMenu();
		};
		// Capture phase, ahead of the global keybindings, so Escape only closes the menu.
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.stopPropagation();
			e.preventDefault();
			closeContextMenu();
		};
		window.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("wheel", closeContextMenu, true);
		window.addEventListener("blur", closeContextMenu);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("wheel", closeContextMenu, true);
			window.removeEventListener("blur", closeContextMenu);
		};
	}, [menu]);

	// The piece was deleted (e.g. undo) while the menu was open.
	useEffect(() => {
		if (menu && !piece) closeContextMenu();
	}, [menu, piece]);

	if (!menu || !piece) return null;
	return (
		<div
			ref={ref}
			role="menu"
			aria-label={`${piece.name} actions`}
			className="fixed z-50 min-w-44 rounded-lg border border-black/8 bg-white/96 p-1 text-xs shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md"
			style={{ left: pos.x, top: pos.y }}
			onContextMenu={(e) => e.preventDefault()}
		>
			<div className="flex items-baseline justify-between gap-3 px-2 pt-1 pb-1.5">
				<span className="truncate font-medium text-neutral-800">
					{piece.name}
				</span>
				<span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-400">
					{cutSizeLabel(piece)}
					{stock && ` · ${stockLabel(stock)}`}
				</span>
			</div>
			<div className="mx-1 mb-1 h-px bg-black/6" />
			{menuItems(doc, piece.id).map((item, i) =>
				item === "separator" ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: separators have nothing else to key on.
					<div key={`sep-${i}`} className="mx-1 my-1 h-px bg-black/6" />
				) : (
					<button
						key={item.label}
						type="button"
						role="menuitem"
						disabled={item.disabled}
						className={`flex h-7 w-full items-center justify-between gap-4 rounded-md px-2 text-left disabled:text-neutral-300 disabled:hover:bg-transparent ${
							item.danger
								? "text-red-600 hover:bg-red-50"
								: "text-neutral-700 hover:bg-amber-50 hover:text-neutral-900"
						}`}
						onClick={() => {
							item.run();
							closeContextMenu();
						}}
					>
						{item.label}
						{item.shortcut && (
							<span className="font-mono text-[10px] text-neutral-400">
								{item.shortcut}
							</span>
						)}
					</button>
				),
			)}
		</div>
	);
}
