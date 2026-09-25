# Woodworking Modeller

A small 3D modeller for furniture and woodworking, built with sheets and framing. All dimensions are in millimetres.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm test           # unit tests (Vitest): geometry, snapping, commands, tools
npm run check      # biome lint + format
```

## Projects

While `npm run dev` is running, every change autosaves to `projects/<name>.json` (a small dev-server API in `server/projectsPlugin.ts` writes the files). Open projects appear as tabs at the top: click to switch, double-click to rename, `+` for a new one, `▾` to reopen or delete a saved one. Shortcuts: ⌥N new, ⌥[ / ⌥] previous/next, ⌥W close.
