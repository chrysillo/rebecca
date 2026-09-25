import { useCallback, useEffect, useRef, useState } from "react";
import { shortcutLabel } from "@/input/keymap";
import type { ProjectInfo } from "@/persistence/api";
import {
	closeTab,
	deleteProject,
	newProject,
	openProject,
	renameProject,
	savedProjects,
	useProjectsStore,
} from "@/state/projects";
import { RenameField } from "@/ui/components/RenameField";

/**
 * Top-centre tabs, one per open project (VS Code style). Click to switch, double-click to rename,
 * × or middle-click to close. + starts a new project; ▾ lists saved projects that aren't open.
 */
export function ProjectTabs() {
	const available = useProjectsStore((s) => s.available);
	const tabs = useProjectsStore((s) => s.tabs);
	const active = useProjectsStore((s) => s.active);
	const [renaming, setRenaming] = useState<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const closeMenu = useCallback(() => setMenuOpen(false), []);

	if (!available) return null;

	return (
		<div className="relative flex max-w-[50vw] items-center rounded-[10px] border border-black/6 bg-white/92 p-1 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
			<div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
				{tabs.map((name) => (
					<Tab
						key={name}
						name={name}
						active={name === active}
						renaming={renaming === name}
						onRename={() => setRenaming(name)}
						onRenameDone={() => setRenaming(null)}
					/>
				))}
			</div>
			<span className="mx-0.5 h-4 border-l border-neutral-200" />
			<IconButton
				label={`New project (${shortcutLabel("newProject")})`}
				onClick={() => void newProject()}
			>
				+
			</IconButton>
			<OpenMenu
				open={menuOpen}
				onToggle={() => setMenuOpen((o) => !o)}
				onClose={closeMenu}
			/>
		</div>
	);
}

type TabProps = {
	name: string;
	active: boolean;
	renaming: boolean;
	onRename: () => void;
	onRenameDone: () => void;
};

function Tab({ name, active, renaming, onRename, onRenameDone }: TabProps) {
	const saveStatus = useProjectsStore((s) => s.saveStatus);

	return (
		<div
			className={`group flex shrink-0 items-center gap-1 rounded-[7px] py-1 pr-1.5 pl-3 ${
				active
					? "bg-neutral-100 font-medium text-neutral-800"
					: "text-neutral-500 hover:bg-neutral-100"
			}`}
			onAuxClick={(e) => {
				if (e.button === 1) void closeTab(name);
			}}
		>
			{renaming ? (
				<div className="w-32">
					<RenameField
						value={name}
						onCommit={(to) => void renameProject(name, to)}
						onDone={onRenameDone}
					/>
				</div>
			) : (
				<button
					type="button"
					className="max-w-40 truncate"
					title={name}
					onClick={() => void openProject(name)}
					onDoubleClick={onRename}
				>
					{name}
				</button>
			)}
			{/* The active tab's save state sits where the × is, VS Code style; hovering swaps it for the ×. */}
			<span className="relative flex h-4 w-4 items-center justify-center">
				{active && saveStatus !== "saved" && (
					<span
						title={saveStatus === "error" ? "Not saved" : "Saving…"}
						className={`h-1.5 w-1.5 rounded-full group-hover:hidden ${
							saveStatus === "error" ? "bg-red-500" : "bg-amber-500"
						}`}
					/>
				)}
				<button
					type="button"
					aria-label={`Close ${name}`}
					title={active ? `Close (${shortcutLabel("closeProject")})` : "Close"}
					onClick={() => void closeTab(name)}
					className={`absolute inset-0 items-center justify-center rounded text-[13px] leading-none hover:bg-black/10 ${
						active && saveStatus === "saved" ? "flex" : "hidden"
					} group-hover:flex`}
				>
					×
				</button>
			</span>
		</div>
	);
}

/** The ▾ button and its list of saved projects that aren't open, newest first. */
function OpenMenu({
	open,
	onToggle,
	onClose,
}: {
	open: boolean;
	onToggle: () => void;
	onClose: () => void;
}) {
	// Wraps the button too, so clicking ▾ again toggles rather than closing and reopening.
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) onClose();
		};
		window.addEventListener("pointerdown", onDown);
		return () => window.removeEventListener("pointerdown", onDown);
	}, [open, onClose]);

	return (
		<div ref={ref} className="relative">
			<IconButton label="Open a saved project" onClick={onToggle}>
				▾
			</IconButton>
			{open && <ProjectList onClose={onClose} />}
		</div>
	);
}

function ProjectList({ onClose }: { onClose: () => void }) {
	const tabs = useProjectsStore((s) => s.tabs);
	const [projects, setProjects] = useState<ProjectInfo[] | null>(null);

	const refresh = useCallback(
		() => savedProjects().then(setProjects, () => setProjects([])),
		[],
	);
	useEffect(() => {
		void refresh();
	}, [refresh]);

	const closed = projects?.filter((p) => !tabs.includes(p.name)) ?? [];

	return (
		<div className="absolute top-full right-0 z-30 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-md">
			{projects === null ? (
				<p className="px-2 py-1 text-neutral-400">Loading…</p>
			) : closed.length === 0 ? (
				<p className="px-2 py-1 text-neutral-400">
					Every saved project is open.
				</p>
			) : (
				<ul className="max-h-72 overflow-y-auto">
					{closed.map((p) => (
						<li
							key={p.name}
							className="group flex items-center rounded hover:bg-neutral-100"
						>
							<button
								type="button"
								className="min-w-0 flex-1 px-2 py-1 text-left"
								onClick={() => {
									onClose();
									void openProject(p.name);
								}}
							>
								<span className="block truncate">{p.name}</span>
								<span className="text-[10px] text-neutral-400">
									{new Date(p.modified).toLocaleString()}
								</span>
							</button>
							<button
								type="button"
								aria-label={`Delete ${p.name}`}
								title="Delete"
								className="mr-1 hidden rounded px-1.5 py-0.5 text-neutral-500 group-hover:block hover:bg-red-100 hover:text-red-700"
								onClick={async () => {
									if (
										!window.confirm(`Delete "${p.name}"? This can't be undone.`)
									)
										return;
									await deleteProject(p.name);
									await refresh();
								}}
							>
								🗑
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function IconButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: string;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm text-neutral-600 hover:bg-neutral-100"
		>
			{children}
		</button>
	);
}
