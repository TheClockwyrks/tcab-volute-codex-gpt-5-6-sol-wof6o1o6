# Volute

Volute is a browser arcade-puzzle game set in a deep geothermal pump hall. Mineral cores ride a brass-and-steel channel toward the intake; rotate the central injector, fire matching charges into the train, and extract runs of three or more before the hall consumes its three cells.

The game includes five levels, pressure-driven speed, chain scoring, four collectible machinery effects, a keyboard/touch interface, a diagnostic overlay, original pixel-art sprites and animation, live particle systems, procedural sound effects, and two looping music beds. It is self-contained and makes no network requests while playing.

## Run locally

```sh
npm ci
npm run dev
```

Vite prints the development URL. To create and serve the production build:

```sh
npm run build
npm run preview
```

The deployable static site is written to `dist/` and works from either a domain root or a sub-path.

## Controls

- `Left` / `Right` or `A` / `D`: rotate the injector
- `Space` or pointer/touch: fire (and begin/dismiss screens)
- `X`: swap the loaded and queued cores
- `Escape` or `P`: pause/resume
- `M`: mute/unmute
- Backtick: toggle the diagnostic overlay

Match three or more adjacent cores of the same charge. Marked cores grant choke, backflow, bore, or sightline machinery when extracted. Clear each level's quota to proceed; letting the train reach the intake spends a cell and restarts the level.

## Quality checks

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

The files under `public/assets/` are the shipping assets. `tools/generate-assets.sh` records their one-time authoring process and is not invoked by installation or build.
