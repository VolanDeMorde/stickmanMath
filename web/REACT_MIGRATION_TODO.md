# React Migration Todo

## Completed
- [x] Define migration architecture for incremental rollout.
- [x] Scaffold React + TypeScript app with Vite in `web/`.
- [x] Copy legacy playable game into `web/public/legacy/` bridge.
- [x] Replace starter page with migration dashboard and embedded legacy preview.
- [x] Verify production build works (`npm run build`).

## In Progress
- [ ] Split current UI shell into React components (header, side panel, HUD, footer, touch controls).

## Next
- [ ] Introduce a `GameCanvas` React wrapper to manage engine init/update/cleanup.
- [ ] Replace DOM id updates with React state/store (recommended: Zustand).
- [ ] Move responsive drawer state from global DOM toggles to React state.
- [ ] Add orientation-aware camera settings UI and expose tuning values.
- [ ] Add PWA config for installable mobile testing.
- [ ] Add GitHub Pages workflow to build/deploy `web/dist`.
- [ ] Run regression tests for desktop keyboard/mouse, desktop touch TV, tablet, and phone.
