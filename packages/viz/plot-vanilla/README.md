# @retikz/plot-vanilla

Framework-neutral Plot authoring, unified Vanilla input wiring, and DOM-free SVG rendering for [`@retikz/plot`](../plot).

`@retikz/plot` owns the persisted `IRPlot*` schema and lowering. This package owns TypeScript-only `InputPlot*`, `PlotSource`, and `normalizePlot(input)`, which expand authoring shorthand into an `IRPlotSpec`. Typed authoring input is not schema-parsed again; use the Plot schema or parser only for unknown external data.

## Install

```bash
pnpm add @retikz/plot-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.

## Plain authoring and SVG

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
  marks: [{ type: 'interval', id: 'bars', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
});

const svg = renderPlot(spec, { sales }, { width: 360, height: 200 });
```

An embed accepts one explicit source shape: `{ input: InputPlot }` for Vanilla
authoring or `{ spec: IRPlotSpec }` for an already formed Plot IR. `plotSpecOf`
normalizes the former and preserves the latter.

## Compose in a Vanilla scene

```ts
import { PlotInputEmbedAdapter, embedPlot } from '@retikz/plot-vanilla';
import { renderToSvgString, scene } from '@retikz/vanilla';

const input = scene([embedPlot('sales-panel', { spec }, { sales })]);
const svg = renderToSvgString(input, {
  adapters: [PlotInputEmbedAdapter],
  output: { width: 360, height: 200 },
});
```

Datasets and runtime callbacks stay outside `IRPlotSpec`. `PlotInputEmbedAdapter`
receives the typed `InputPlotEmbed` during the single Vanilla scene-normalization
traversal, then delegates Plot IR lowering to `@retikz/plot`.

See the [retikz docs site](https://pionpill.github.io/retikz/) for usage.
