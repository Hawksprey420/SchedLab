# P2 hybrid workload units copy fix

## Change

`ProcessEditor` now accepts an optional `workUnits` prop (default `false`). `App` enables it for every non-single-core profile. The workload help therefore describes burst as work units in hybrid mode and preserves the original ticks sentence in single-core mode. The hybrid e2e case asserts both strings.

## Verification

- `cd web && npm run typecheck` — passed.
- `cd web && npm run build` — passed. Vite reported its existing `node:module` externalization warning from `src/wasm/schedlab.mjs`.
- `cd web && npx playwright test --config .extension-config.ts --grep 'hybrid topology' --timeout 10000` — 4 passed (375px/1280px, light/dark), using preview port 4175.
- The initial red run used the same supported command and failed at the expected missing work-units help sentence. Assertions now cover both hybrid profiles and the restored single-core sentence.
