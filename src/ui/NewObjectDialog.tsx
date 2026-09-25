import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { commands } from "../commands";
import { CONFIG } from "../config";
import { createFraming, createSheet } from "../model/createPiece";
import { applyCommand, useAppStore } from "../state/store";
import { NumberField } from "./components/NumberField";

/**
 * Small chooser for creating a piece: Sheet or Framing, with their fixed dimensions.
 * Opened with R or from the tool strip. S / F create directly; Escape or clicking away closes.
 * Stays mounted while hidden so the chosen thickness and section are remembered.
 */
export function NewObjectDialog() {
	const open = useAppStore((s) => s.newObjectOpen);
	const setOpen = useAppStore((s) => s.setNewObjectOpen);
	const { sheet, framing } = CONFIG.defaults;
	const [thickness, setThickness] = useState<number>(sheet.thickness);
	const [section, setSection] = useState<{ width: number; depth: number }>({
		width: framing.width,
		depth: framing.depth,
	});
	const dialog = useRef<HTMLDivElement>(null);

	// Take focus when opened so S / F work straight away.
	useEffect(() => {
		if (open) dialog.current?.focus();
	}, [open]);

	const create = (kind: "sheet" | "framing") => {
		const piece =
			kind === "sheet"
				? createSheet({ ...sheet, thickness })
				: createFraming({ length: framing.length, ...section });
		applyCommand(commands.addPiece(piece));
		setOpen(false);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.target instanceof HTMLInputElement) return;
		if (e.code === "KeyS") create("sheet");
		if (e.code === "KeyF") create("framing");
	};

	if (!open) return null;

	return (
		<>
			{/* Click-away catcher. */}
			<button
				type="button"
				aria-label="Close"
				className="pointer-events-auto fixed inset-0 cursor-default"
				onClick={() => setOpen(false)}
			/>
			<div
				ref={dialog}
				role="dialog"
				aria-label="New object"
				tabIndex={-1}
				onKeyDown={onKeyDown}
				className="pointer-events-auto relative w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg focus:outline-none"
			>
				<div className="mb-2 flex items-center justify-between">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
						New object
					</h2>
					<button
						type="button"
						className="text-sm leading-none text-neutral-400 hover:text-neutral-700"
						onClick={() => setOpen(false)}
						aria-label="Close"
					>
						×
					</button>
				</div>
				<div className="flex flex-col gap-2">
					<Choice label="Sheet" shortcut="S" onCreate={() => create("sheet")}>
						<NumberField
							label="Thickness"
							value={thickness}
							onCommit={setThickness}
							greaterThan={0}
							unit="mm"
						/>
					</Choice>
					<Choice
						label="Framing"
						shortcut="F"
						onCreate={() => create("framing")}
					>
						<NumberField
							label="Width"
							value={section.width}
							onCommit={(width) => setSection((s) => ({ ...s, width }))}
							greaterThan={0}
							unit="mm"
						/>
						<NumberField
							label="Depth"
							value={section.depth}
							onCommit={(depth) => setSection((s) => ({ ...s, depth }))}
							greaterThan={0}
							unit="mm"
						/>
					</Choice>
				</div>
			</div>
		</>
	);
}

type ChoiceProps = {
	label: string;
	shortcut: string;
	onCreate: () => void;
	children: ReactNode;
};

/** One kind of piece: its fixed dimensions and a create button. */
function Choice({ label, shortcut, onCreate, children }: ChoiceProps) {
	return (
		<div className="flex flex-col gap-1 rounded-md border border-neutral-200 p-2">
			<h3 className="text-[11px] font-medium text-neutral-500">{label}</h3>
			{children}
			<button
				type="button"
				onClick={onCreate}
				className="mt-1 flex items-center justify-between rounded bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200"
			>
				Create {label.toLowerCase()}
				<span className="font-normal text-amber-700">({shortcut})</span>
			</button>
		</div>
	);
}
