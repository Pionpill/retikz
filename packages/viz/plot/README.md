# @retikz/plot

`@retikz/plot` is retikz's Tier 2 visualization package. It defines a
JSON-serializable, grammar-of-graphics **Plot IR** and lowers that IR to
`@retikz/core` primitives through the core composite pipeline.

- **Data stays outside the IR.** A plot stores a named data reference
  (`data.reference`) and an optional data model; dataset values are supplied to
  `lowerPlots(datasets)` at compile time.
- `@retikz/data` owns the shared JSON data models, field resolution, and transform
  pipeline used by visualization packages.
- `@retikz/plot` owns the persisted `IRPlot*` schema / types, Plot definitions and
  registries, resolver layer, and lowering. It does not own framework-neutral
  `InputPlot*` authoring types.
- `@retikz/plot-vanilla` owns TypeScript-only `InputPlot*`, `PlotSource`,
  `normalizePlot()`, Vanilla `InputEmbed` wiring, and `renderPlot()` orchestration.
- `@retikz/plot-react` provides the `<Plot>` component and JSX `XxxProps`; it
  collects React declarations and delegates the resulting input to Plot Vanilla.

## Install

```bash
pnpm add @retikz/plot
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { lowerPlots } from '@retikz/plot';
```

Only `IRPlot*` values are persisted and schema-validated. `InputPlot*`,
`PlotSource`, and adapter inputs are TypeScript contracts owned by
`@retikz/plot-vanilla`.

See the [plot architecture](https://github.com/Pionpill/retikz/blob/next-viz/packages/viz/_notes/architecture/plot-design.md)
and [plot design decisions](https://github.com/Pionpill/retikz/tree/next-viz/packages/viz/_notes/decisions/plot)
for the underlying model and design rationale.
