# @retikz/plot-vanilla

Framework-free plain authoring, Kernel Vanilla Tier 2 embedding, and SSR runtime for [`@retikz/plot`](../plot).

`@retikz/plot` remains the source of truth for Plot IR, shared authoring normalization, extension contracts, and `lowerPlots`. This package adds three host-facing paths without copying Plot semantics:

- `plot(input)` creates a schema-valid, method-free PlotSpec. Axis, facet, and scaffold binding sugar is removed before the function returns.
- `embedPlot(id, spec)` and `createPlotAdapter(datasets, options?)` compose Plot inside Kernel Vanilla `figure()` / `layer()` specs.
- `renderPlot(spec, datasets, options?)` remains the direct DOM-free SSR entry. It returns an SVG string, or `{ svg, lineage }` when `lineage` is an object.

Datasets and functions stay outside PlotSpec. The Tier 2 adapter keeps them in its runtime closure, while `renderPlot` receives them as arguments. The current runtime still rerenders the complete figure on update; incremental lowering, cache invalidation, and renderer diffing are not part of this API.

## Install

```bash
pnpm add @retikz/plot-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { plot, renderPlot } from '@retikz/plot-vanilla';

const sales = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
];

const spec = plot({
  id: 'sales',
  data: { reference: 'sales' },
  scales: [
    { type: 'band', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'interval',
      id: 'bars',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
  ],
});

const svg = renderPlot(spec, { sales }, { width: 360, height: 200 });
```

Compose the same spec with other Kernel Vanilla content:

```ts
import { createPlotAdapter, embedPlot } from '@retikz/plot-vanilla';
import { figure, layer, renderToSvgString } from '@retikz/vanilla';

const drawing = figure({ layers: [layer('charts', [embedPlot('sales-panel', spec)])] });

const svg = renderToSvgString(drawing, {
  adapters: [createPlotAdapter({ sales }, { width: 360, height: 200 })],
  output: { width: 360, height: 200 },
});
```

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
