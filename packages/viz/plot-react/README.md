# @retikz/plot-react

React bindings for [`@retikz/plot`](../plot) — the Tier 2 grammar-of-graphics layer of retikz.

`<Plot>` lowers a data-free Plot IR (plus an externally-supplied dataset) to core IR and renders it
through [`@retikz/react`](../../kernel/react)'s `<Layout>`. Two authoring surfaces share one component:

- **spec wrapper** — `<Plot spec={plotSpec} data={datasets} />` for a hand-written / generated `PlotSpec`.
- **composition DSL** — `<Plot data={rows}><PathMark x y /><PointMark x y /></Plot>`; mark children are
  assembled into a normalized `PlotSpec` (linear scales + cartesian2D inferred) by a pure builder.

Data never enters the IR — it is injected at compile time via `lowerPlots`.
Runtime plot mark lineage can be collected through `<Plot lineage={...} onLineage={...} />` or the
`resolvePlotLineage(props)` helper. Lineage is returned to the host only; it is not written into
PlotSpec or Scene metadata.

`PlotThemeProvider` injects Plot-owned style definitions into a standalone React subtree. Pair it
with `@retikz/react` `ThemeProvider` for same-named Core definitions. The published packages only
guarantee `neutral`; additional visual personalities remain host-owned definitions.

## Install

```bash
pnpm add @retikz/plot-react
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```tsx
import { Plot } from '@retikz/plot-react';
```

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
