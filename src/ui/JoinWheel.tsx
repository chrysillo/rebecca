import { dimensionEntries } from "@/model/dimensions";
import { useAppStore } from "@/state/store";
import {
	cancelJoiner,
	confirmJoin,
	cycleJoin,
	highlightJoin,
	toolsFor,
} from "@/tools/joinSession";
import { RadialMenu } from "@/ui/components/RadialMenu";

/**
 * Chooses which of the overlapping selected pieces gets cut. The scene previews the highlighted
 * choice. Point, scroll, press J / arrows / 1–9 to change; release J, click, Enter or Space to cut.
 */
export function JoinWheel() {
	const joiner = useAppStore((s) => s.joiner);
	const doc = useAppStore((s) => s.doc);
	if (!joiner) return null;
	const target = doc.pieces[joiner.highlighted];
	const tools = toolsFor(doc, joiner.highlighted);

	return (
		<RadialMenu
			label="Choose the piece to cut"
			at={joiner.at}
			highlighted={joiner.highlighted}
			onHighlight={highlightJoin}
			onCycle={cycleJoin}
			onConfirm={confirmJoin}
			onCancel={cancelJoiner}
			slices={joiner.options.map((id) => {
				const piece = doc.pieces[id];
				return {
					id,
					content: (
						<>
							<span className="text-[10px] uppercase tracking-wide opacity-70">
								Cut
							</span>
							<span className="max-w-20 truncate text-[11px] font-semibold">
								{piece.name}
							</span>
							<span className="text-[10px] tabular-nums opacity-80">
								{dimensionEntries(piece)
									.map((d) => d.value)
									.join(" × ")}
							</span>
						</>
					),
				};
			})}
			centre={
				<>
					<span className="text-[11px] font-semibold uppercase tracking-wide">
						Join
					</span>
					<span className="max-w-20 truncate text-[10px] text-neutral-500">
						{target && tools.length === 1
							? `with ${doc.pieces[tools[0]].name}`
							: `with ${tools.length} pieces`}
					</span>
				</>
			}
			hint="Amber piece gets cut · red is removed from it · release J / click to cut · scroll or J to switch · Esc"
			backdrop={false}
		/>
	);
}
