# @retikz/plot-vanilla

Framework-free bindings and authoring helpers for [`@retikz/plot`](../plot) — the Tier 2 grammar-of-graphics layer of retikz.

`@retikz/plot` remains the source of truth for Plot IR schemas, extension contracts, and `lowerPlots`.
This package provides two framework-free entrypoints:

- `plotBuilder(config).build()` assembles a plain `PlotSpec` from chainable mark, guide, axis,
  legend, facet, and scaffold helpers. Builder-only fields are expanded before `build()` returns
  and do not enter Plot IR.
- `renderPlot(spec, datasets, options?)` lowers a data-free Plot IR plus externally supplied
  datasets to core IR, then renders it to an SVG string via
  [`@retikz/vanilla`](../../kernel/vanilla)'s `renderToSvgString`.

Data never enters the IR — it is injected at compile time via `lowerPlots`.
Passing `lineage: { ... }` to `renderPlot` switches the return value to `{ svg, lineage }`, so SSR
hosts can keep the SVG output and the runtime plot mark lineage artifact together. Omitting lineage,
or passing `lineage: false`, preserves the original SVG string return value.
Both entrypoints avoid DOM globals and are suitable for SSR / build-time generation.

## Install

```bash
pnpm add @retikz/plot-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { plotBuilder } from '@retikz/plot-vanilla';
```

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
