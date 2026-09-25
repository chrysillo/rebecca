import { usePointerTracking } from "@/input/pointer";
import { useKeybindings } from "@/input/useKeybindings";
import { Viewport } from "@/scene/Viewport";
import { CreateWheel } from "@/ui/CreateWheel";
import { KeyHints } from "@/ui/KeyHints";
import { Notice } from "@/ui/Notice";
import { Outliner } from "@/ui/Outliner";
import { ProjectTabs } from "@/ui/ProjectTabs";
import { PropertiesPanel } from "@/ui/PropertiesPanel";
import { StockPanel } from "@/ui/StockPanel";
import { ToolStrip } from "@/ui/ToolStrip";

export function App() {
	useKeybindings();
	usePointerTracking();

	return (
		<div className="relative h-full select-none font-sans text-neutral-800">
			<Viewport />
			<div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
				<div className="flex items-start gap-3">
					{/* Above the panels so its hover tooltips aren't covered by them. */}
					<div className="pointer-events-auto relative z-20">
						<ToolStrip />
					</div>
					{/* Scrolls rather than running into the hint strip at the bottom. */}
					<div className="pointer-events-auto flex max-h-[calc(100vh-4.5rem)] flex-col gap-3 overflow-y-auto">
						<StockPanel />
						<Outliner />
					</div>
				</div>
				{/* Sits below the view cube, which the 3D view draws in the top-right corner. */}
				<div className="pointer-events-auto mt-40">
					<PropertiesPanel />
				</div>
			</div>
			<div className="pointer-events-none absolute bottom-3 left-3">
				<KeyHints />
			</div>
			<div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
				<div className="pointer-events-auto">
					<ProjectTabs />
				</div>
			</div>
			<CreateWheel />
			<Notice />
		</div>
	);
}
