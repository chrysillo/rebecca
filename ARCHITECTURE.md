# Architecture

How the code is organised, the patterns it follows, and the rules that keep it tidy. Read this before adding a file. Update it in the same change whenever a rule or the layout changes.

**Start reading at:** `main.tsx` (boot) → `App.tsx` (layout of every panel) → `scene/Viewport.tsx` (everything in the 3D view).

## How it works

Five ideas cover almost everything:

1. **The document** (`DocumentState` in `state/document.ts`) holds everything that is saved and undoable: pieces, stock, measurements, joints, groups, and the selection.
2. **Commands** (`commands/`) are the only way the document changes. Each one is a pure `(doc) => doc` function that returns the *same* object when nothing changed. Run one with `applyCommand(commands.x(...))`; the store records one undo step.
3. **Transient state** (drag previews, open wheels, hover, the active tool) lives beside `doc` in `state/store.ts`. It is never saved or undone.
4. **Sessions** (`tools/*Session.ts`) are the multi-step interactions: open the create wheel, pick a joint, click two edges to measure. They read the store, set transient state, and finish by applying a command.
5. **Views only render.** `scene/` (the 3D view) and `ui/` (the panels) read the store and call commands or sessions. They never own model data.

```
 keys, tool strip ──► input/actions ──┐
 clicks in the 3D view (scene/) ──────┼──► tools/ sessions ──► commands/ ──► state/store (doc + history)
 clicks in the panels (ui/) ──────────┘            │                               │
                                                   └──► transient state ──────────►┤
                                                                                   ▼
                                                        scene/ and ui/ re-render from the store
```

## Folders

```
src/
  main.tsx, App.tsx    boot, and the page layout
  config.ts            tunable numbers (default sizes, snap distances, steps)
  colors.ts            colours used by more than one file
  geometry/            pure maths: vectors, boxes, rays, cuts, measuring, pivots
  model/               domain types and pure helpers: pieces, stock, groups, joints, cut list
  snapping/            pure snap maths
  commands/            every document edit, exported together as `commands`
  state/               zustand stores, undo history, selectors, transient-state types
  persistence/         saving and loading project files, downloads
  tools/               sessions (*Session.ts) and drag maths (*Tool.ts)
  input/               keymap, the action table, pointer, modifier and screen helpers
  scene/               everything inside the <Canvas>
  ui/                  everything outside it
  test/fixtures.ts     shared test pieces and documents
server/                the dev-server plugin that reads and writes projects/*.json
projects/              saved projects (autosaved while `npm run dev` runs)
```

## Layers

Each layer imports only from the layers below it. `scene/` and `ui/` never import each other.

| # | Layer | Contents | Notes |
| --- | --- | --- | --- |
| 1 | **Core** | `geometry/`, `model/`, `snapping/`, `config.ts`, `colors.ts` | Pure. three.js maths (vectors, quaternions, CSG) is fine. No React, no store. These folders may import each other: geometry needs piece sizes from model, model needs vectors. |
| 1 | **Input helpers** | `input/pointer`, `modifiers`, `keymap`, `screen`, `wheelPlacement` | Small browser helpers with no store access. Anything may use them. |
| 2 | **Commands** | `commands/`, `state/document.ts` | Pure document edits. |
| 3 | **State** | `state/`, `persistence/` | The stores, history, selectors and saving. `state/projects.ts` and `persistence/autosave.ts` import each other (see Known debt). |
| 4 | **Tools** | `tools/` | Sessions and drag maths. |
| 5 | **Views and wiring** | `scene/`, `ui/`, `input/actions.ts`, `input/useKeybindings.ts` | `actions.ts` maps every action to what it does, for the keyboard and the buttons alike. |
| 6 | **App** | `App.tsx`, `main.tsx` | |

- **Callback registration.** When a lower layer has to trigger something only a higher one can do, the higher one registers a callback. For example, exporting the views needs the WebGL renderer, so `scene/export/ViewExporter` calls `setViewsRenderer` in `tools/exports.ts` when it mounts.
- **Imports:** always from the `@/` root (`@/geometry/vec`), never `../`.

## `scene/`

`Viewport.tsx` mounts the canvas and lists every scene component. Each feature has its own folder:

| Folder | Holds |
| --- | --- |
| (root) | `Viewport`, `Floor`, `gizmoEvents` (gizmo handles win clicks over pieces) |
| `shared/` | Plumbing for several folders: `ScreenSizeGroup`, `useGizmoPointer` / `toRay`, `useOrbitControls`, `gizmoStyle` |
| `pieces/` | Drawing and picking pieces: `Pieces`, `PieceMesh`, `pieceLook` (colours for each state), `pickEdge`, `usePlaneDrag`, `JoinOverlap` |
| `gizmo/` | The move/rotate gizmo: `Gizmos` (entry), arrows, arcs, pivot handle, rotation guide and readout, drag hooks, `useCameraView` |
| `extrude/` | Face highlight, face arrow, extrude controller and readout |
| `annotations/` | Lines and labels over the model: measurements, live gaps, `DimensionLine`, snap guide |
| `camera/` | `ViewCube` (camera moves) with its `FaceCube`, `AxisTriad` and `CubeHud` (the corner overlay with its own perspective camera), and `ScreenProjection` (shares the camera with the UI through `input/screen`) |
| `export/` | `ViewExporter` (renders the views sheet), `drawDimensions` (its 2D dimension lines) |

- A feature folder imports only from itself and `shared/`. Something two folders both need moves to `shared/`.
- A new feature gets its own folder with one entry component, mounted in `Viewport.tsx`.

## `ui/`

- **Panels and overlays:** one file each (`StockPanel`, `PropertiesPanel`, `ToolStrip`, `CreateWheel`, …), positioned in `App.tsx`.
- **Reusable controls** live in `ui/components/` (`RadialMenu`, `NumberField`, `RenameField`). Panel chrome is `Panel`, and buttons that run actions use `IconButton` with an icon from `icons.tsx`.
- **When a panel outgrows one file** it gets a folder, like `ui/outliner/`: `Outliner` holds the tree logic and `OutlinerRows` the row components.

## Recipes

**Change the document** (a new edit):
1. Add a pure `(args) => Command` to the matching file in `commands/`, and export it from `commands/index.ts`.
2. Test it in `commands/commands.test.ts`.
3. Call it with `applyCommand(commands.x(...))`.

**Add a keyboard shortcut or button:**
1. Add the name to the `Action` type and a binding to `KEYMAP` in `input/keymap.ts`. The first binding is the one shown in tooltips.
2. Say what it does in `ACTIONS` in `input/actions.ts`.
3. For a button, add an icon to `ACTION_ICONS` in `ui/icons.tsx` and an item to `ToolStrip` (model actions) or `ExportBar` (exports).
4. If it's a mouse gesture rather than a key, add a line to `ui/KeyHints.tsx`.

**Add a multi-step interaction** (like the join wheel):
1. Put its state type in `state/<name>.ts`, and add a field and setter to `state/store.ts`.
2. Put the flow in `tools/<name>Session.ts`: `open…`, `cancel…`, key handling, and confirm (which applies a command).
3. Draw it in `ui/` (overlays) or `scene/` (in-view previews).
4. Route its keys in `input/useKeybindings.ts`, and let `escape` in `input/actions.ts` cancel it.
5. Reset it in `show()` in `state/projects.ts`, so it closes when switching projects.

**Add something to the saved file:**
1. Add the field to `DocumentState` and `newDocument()`.
2. Add it to `ProjectFile`, `toProjectFile`, `FILE_COLLECTIONS` (if it's a collection) and `fromProjectFile` in `state/document.ts`. A file missing it will then refuse to load.
3. Add it to `Saved`, `savedParts` and `isDirty` in `persistence/autosave.ts`. Otherwise changes to it won't trigger a save.
4. Add the field to the existing `projects/*.json` by hand rather than making it optional.

**Add a 3D overlay:**
1. Put a component in the right `scene/` folder (or a new one) and mount it in `Viewport.tsx`.
2. If it's decoration that shouldn't appear in exports, mount it inside the `visible={!exporting}` group.

## Conventions

- **Units and axes:** millimetres everywhere. Z is up and the floor is Z = 0. Rotations are stored in degrees (Euler XYZ) and turned into radians only where three.js needs them (`* DEG`, from `geometry/vec`).
- **Types over casts.** No `as unknown as`. If a cast seems needed, tighten the type at its source. For example, `dimensionAlong` returns a dimension name rather than `string`, so `piece[key]` type-checks. The one exception is `useOrbitControls`, which wraps R3F's untyped `controls`.
- **Numbers and colours:**
  - Tunable behaviour goes in `config.ts`.
  - A colour used by more than one file goes in `colors.ts`.
  - Any other constant is a named `CONST_CASE` value at the top of the one file that uses it.
  - Never write a hex colour inline in JSX. UI chrome uses Tailwind classes.
- **Files:**
  - React components are `PascalCase.tsx`, hooks are `useThing.ts`, everything else is `camelCase.ts`.
  - Each file has one main component. Small parts it's built from may share the file (`Panel`, `OutlinerRows`, `PivotHandle` with `PivotTargets`).
- **Size:** aim for under ~250 lines per file and ~8 files per folder. When a file grows past that, split it by responsibility, not by line count.
- **Comments:**
  - A short plain-English doc comment on each export and constant whose name doesn't say it all.
  - Say what it's for from the user's side ("Shift+click adds a face") and why it's done that way, not what the code does.
- **Tests:**
  - Pure code gets Vitest tests beside it (`thing.test.ts`). That covers `geometry`, `model`, `snapping`, `commands`, `*Tool.ts` and selectors.
  - Shared fixtures are in `src/test/fixtures.ts`.
  - Scene and UI components aren't unit tested; check them in the running app.
- **No back-compat code.** The project is young: when saved data changes shape, edit `projects/*.json` rather than adding migrations or fallbacks.
- **Keep changes to the scope asked.** A rename in one part of the UI isn't a codebase-wide rename.

## Before committing

```bash
npm run typecheck && npm test && npm run check
```

`npx biome check --write src` fixes formatting and import order.

## Known debt

Places where the code breaks the rules above. Fix them when next working nearby, and delete the line once done.

- `state/projects.ts` is an imperative flow (open, close and rename projects) rather than state, and it and `persistence/autosave.ts` import each other. It could move to `persistence/`.
- `tools/` mixes sessions with pure drag maths. Split it into two folders if it grows much past its current 10 files.
- Over ~250 lines: `state/projects.ts` (~315) and `ui/outliner/OutlinerRows.tsx` (~310). Both hang together well; split them if they grow.
- No direct tests for `tools/extrudeTool.ts`, `model/dimensions.ts` or `snapping/tolerance.ts`.
