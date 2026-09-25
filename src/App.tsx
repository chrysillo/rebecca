import { usePointerTracking } from "./input/pointer";
import { useKeybindings } from "./input/useKeybindings";
import { Viewport } from "./scene/Viewport";
import { CreateWheel } from "./ui/CreateWheel";
import { KeyHints } from "./ui/KeyHints";
import { Notice } from "./ui/Notice";
import { Outliner } from "./ui/Outliner";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { ToolStrip } from "./ui/ToolStrip";

export function App() {
	useKeybindings();
	usePointerTracking();

	return (
		<div className="relative h-full select-none font-sans text-neutral-800">
			<Viewport />
			<div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
				<div className="pointer-events-auto flex flex-col gap-3">
					<ToolStrip />
					<Outliner />
				</div>
				{/* Sits below the view cube, which the 3D view draws in the top-right corner. */}
				<div className="pointer-events-auto mt-40">
					<PropertiesPanel />
				</div>
			</div>
			<div className="pointer-events-none absolute bottom-3 left-3">
				<KeyHints />
			</div>
			<CreateWheel />
			<Notice />
		</div>
	);
}
