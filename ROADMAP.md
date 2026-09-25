# Roadmap

What the modeller is for, what's built, and what's next. Update it when a feature lands or the plan changes.

**Goal:** a simple 3D modeller for furniture and woodworking, built from sheets and timber. Change a stock size and the whole project follows. The UI should feel clean and game-like (Shapr3D is the reference).

## Built

- Sheets and timber from project stock sizes. Editing a stock size resizes every piece cut from it. The create wheel (R) has one slice per stock entry.
- Select pieces or faces (Shift+click adds), plus groups (Alt+click reaches inside one).
- Move and rotate gizmo with snapping, and a fine mode (1 mm / 5°). Seven rotation pivots, picked by dragging the white dot.
- Drag a selected piece across the plane of the face you grabbed.
- Extrude one or more faces together (E).
- Joinery (J): pick which of two overlapping pieces gets cut. Cuts are live-linked, so they follow the cutting piece.
- Measurements between edges, and live gap dimensions while dragging.
- Object list grouped by stock and identical cuts. Right-click context menu.
- Exports: the cut list to the clipboard, and a PNG sheet of the Top, Right, Left and Perspective views with dimensions.
- Projects autosave to `projects/*.json`, with VS Code-style tabs.
- Icon-only tool strip with tooltips, and a view cube.

## Next

- Halving / lap joints, as an option in the join wheel (deferred from the joinery pass).

Add new items here as they're agreed, in rough priority order.
