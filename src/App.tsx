import { usePointerTracking } from "@/input/pointer";
import { useKeybindings } from "@/input/useKeybindings";
import { Viewport } from "@/scene/Viewport";
import { BoxSelectRect } from "@/ui/BoxSelectRect";
import { ContextMenu } from "@/ui/ContextMenu";
import { CreateWheel } from "@/ui/CreateWheel";
import { ExportBar } from "@/ui/ExportBar";
import { JoinWheel } from "@/ui/JoinWheel";
import { Notice } from "@/ui/Notice";
import { Outliner } from "@/ui/outliner/Outliner";
import { ProjectTabs } from "@/ui/ProjectTabs";
import { PropertiesPanel } from "@/ui/PropertiesPanel";
import { StockPanel } from "@/ui/StockPanel";
import { ShortcutsButton } from "@/ui/shortcuts/ShortcutsButton";
import { ShortcutsDialog } from "@/ui/shortcuts/ShortcutsDialog";
import { ToolStrip } from "@/ui/ToolStrip";

export function App() {
	useKeybindings();
	usePointerTracking();

	return (
		<div className="relative h-full select-none bg-[linear-gradient(#f6f6f6_0%,#ededed_45%,#e6e6e6_100%)] font-sans text-neutral-800">
			<Viewport />
			<div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
				<div className="flex items-start gap-3">
					{/* Above the panels so its hover tooltips aren't covered by them. */}
					<div className="pointer-events-auto relative z-20">
						<ToolStrip />
					</div>
					{/* Scrolls rather than running into the shortcuts button at the bottom. */}
					<div className="pointer-events-auto flex max-h-[calc(100vh-4.5rem)] flex-col gap-3 overflow-y-auto">
						<StockPanel />
						<Outliner />
					</div>
				</div>
				{/* Below the view cube, which the 3D view draws in the top-right corner: the export
				    strip right under it, the properties panel stacked below that. */}
				<div className="flex flex-col items-end gap-3 mt-40">
					<div className="pointer-events-auto relative z-20">
						<ExportBar />
					</div>
					<div className="pointer-events-auto">
						<PropertiesPanel />
					</div>
				</div>
			</div>
			<div className="absolute bottom-3 left-3">
				<ShortcutsButton />
			</div>
			<div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
				<div className="pointer-events-auto">
					<ProjectTabs />
				</div>
			</div>
			<CreateWheel />
			<JoinWheel />
			<Notice />
			<BoxSelectRect />
			<ContextMenu />
			<ShortcutsDialog />
		</div>
	);
}
