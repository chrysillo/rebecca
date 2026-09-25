import { useRef, useState } from "react";

type Props = {
	value: string;
	onCommit: (name: string) => void;
	onDone: () => void;
};

/** Inline text input for renaming. Enter or blur saves; Escape cancels. */
export function RenameField({ value, onCommit, onDone }: Props) {
	const [draft, setDraft] = useState(value);
	const cancelled = useRef(false);

	return (
		<input
			className="h-6 w-full min-w-0 rounded-md border border-amber-500 bg-white px-1.5 text-[13px] focus:outline-none"
			value={draft}
			// biome-ignore lint/a11y/noAutofocus: the field only appears when the user asks to rename.
			autoFocus
			onFocus={(e) => e.currentTarget.select()}
			onChange={(e) => setDraft(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
				if (e.key === "Escape") {
					cancelled.current = true;
					e.currentTarget.blur();
				}
			}}
			onBlur={() => {
				if (!cancelled.current) onCommit(draft);
				onDone();
			}}
		/>
	);
}
