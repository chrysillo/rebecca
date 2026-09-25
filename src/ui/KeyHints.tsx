const HINTS = [
	["Click", "select face"],
	["⇧ Click", "add/remove piece or face"],
	["Double-click", "select object"],
	["⌘A", "select all"],
	["T", "measure (click two edges)"],
	["Right-drag", "orbit"],
	["Middle-drag / ⇧ right-drag", "pan"],
	["Wheel", "zoom"],
	["Shift + drag", "1 mm / 5° steps"],
	["Alt + move/rotate", "duplicate"],
	["E", "extrude face (type mm, Enter)"],
	["J", "join: cut overlapping pieces"],
	["⌘G / ⇧⌘G", "group / ungroup"],
	["⌥ Click", "one piece inside a group"],
	["Esc", "deselect / cancel"],
] as const;

/** Bottom-left reminder of mouse and modifier controls (key shortcuts are on the tool strip). */
export function KeyHints() {
	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
			{HINTS.map(([key, action]) => (
				<li key={key} className="flex items-center gap-1.5">
					<kbd className="rounded border border-neutral-200 bg-white/85 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-tight text-neutral-600">
						{key}
					</kbd>
					{action}
				</li>
			))}
		</ul>
	);
}
