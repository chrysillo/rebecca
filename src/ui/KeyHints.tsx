const HINTS = [
	["Double-click", "select"],
	["Right-drag", "orbit"],
	["Left/middle-drag", "pan"],
	["Wheel", "zoom"],
	["Shift + drag", "1 mm / 15° steps"],
	["Alt + move", "duplicate"],
	["Esc", "deselect"],
] as const;

/** Bottom-left reminder of mouse and modifier controls (key shortcuts are on the tool strip). */
export function KeyHints() {
	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
			{HINTS.map(([key, action]) => (
				<li key={key}>
					<kbd className="font-semibold text-neutral-700">{key}</kbd> {action}
				</li>
			))}
		</ul>
	);
}
