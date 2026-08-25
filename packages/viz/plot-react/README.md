# @retikz/plot-react

React bindings for [`@retikz/plot`](../plot) — the Tier 2 grammar-of-graphics layer of retikz.

`<Plot>` accepts a data-free Plot IR (plus an externally-supplied dataset), or
collects React `XxxProps` / children into the Plot Vanilla input path before
lowering to Core IR through [`@retikz/react`](../../kernel/react)'s `<Layout>`.
Two authoring surfaces share one component:

- **spec wrapper** — `<Plot spec={irPlotIR} data={datasets} />` for a hand-written / generated `IRPlot`.
- **composition DSL** — `<Plot data={rows}><PathMark x y /><PointMark x y /></Plot>`; mark children are
  assembled into a normalized `IRPlot` (linear scales + cartesian2D inferred) by Plot Vanilla.

React does not own a parallel `InputPlot` type or normalizer. The collected
declarations are delegated to `@retikz/plot-vanilla`, which owns the
TypeScript-only `InputPlot*` contracts and the unified `InputEmbed` adapter.
Data never enters the IR — it is injected at compile time via `lowerPlots`.
Runtime plot mark lineage can be collected through `<Plot lineage={...} onLineage={...} />` or the
`resolvePlotLineage(props)` helper. Lineage is returned to the host only; it is not written into
`IRPlot` or Scene metadata.

`<Plot>` is a complete standalone host by default: it creates one `Layout` and one renderer output
without author boilerplate. Inside an outer `Layout`, the same component contributes only its Plot
Scope/composite. Plot dimensions and panel fields remain valid embedded inputs, while standalone-only
`className`, `style`, `renderer`, and Core `themeStyles` belong on the outer `Layout`; embedded usage
rejects those own props, including explicit `undefined`, instead of silently ignoring them. Runtime
`lineage`, `hostLineageMetadata`, and `onLineage` are also standalone-only and must be omitted when
embedded. The outer Layout's effective Theme is inherited by the embedded Plot.

`PlotThemeProvider` injects Plot-owned style definitions into a standalone React subtree. Pair it
with `@retikz/react` `ThemeProvider` for same-named Core definitions. When `style` is omitted,
the published packages use their default baseline; additional visual personalities remain host-owned definitions.

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
