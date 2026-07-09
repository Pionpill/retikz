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

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
