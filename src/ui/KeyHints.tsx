const HINTS = [
	["Click", "select face"],
	["Double-click", "select object"],
	["Right-drag", "orbit"],
	["Middle-drag / ⇧ right-drag", "pan"],
	["Wheel", "zoom"],
	["Shift + drag", "1 mm / 15° steps"],
	["Alt + move", "duplicate"],
	["E", "extrude face (type mm, Enter)"],
	["Esc", "deselect / cancel"],
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
