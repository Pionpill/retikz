# @retikz/plot-vanilla

Framework-free bindings for [`@retikz/plot`](../plot) — the Tier 2 grammar-of-graphics layer of retikz.

`renderPlot(spec, datasets, options?)` lowers a data-free Plot IR (plus an externally-supplied dataset)
to core IR and renders it to an SVG string via [`@retikz/vanilla`](../../core/vanilla)'s
`renderToSvgString` — zero DOM, suitable for SSR / build-time generation.

Data never enters the IR — it is injected at compile time via `lowerPlots`.

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
