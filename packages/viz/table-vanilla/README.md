# @retikz/table-vanilla

Framework-neutral bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table package.

`detailTable()` and `manualTable()` create the persisted `IRDetailTableSpec` and `IRManualTableSpec`; `embedTable()` contributes one typed Table embed to a Vanilla scene. `TableInputEmbedAdapter` performs the domain lowering during Vanilla's single scene-normalization traversal. Browser mounting remains in `@retikz/vanilla/dom`.

```ts
import { TableInputEmbedAdapter, detailTable, embedTable, renderTable } from '@retikz/table-vanilla';
import { renderToSvgString, scene } from '@retikz/vanilla';

const spec = detailTable({
  id: 'scores',
  dataRef: 'scores',
  columns: [{ id: 'score', field: 'score', header: 'Score' }],
});

const input = scene([embedTable('scores-panel', spec, { data: { scores: rows } })]);
const svg = renderToSvgString(input, { adapters: [TableInputEmbedAdapter] });

const result = renderTable(spec, { data: { scores: rows }, artifacts: true });
result.svg;
result.manifest;
```

`manualTable()` accepts the same non-empty rectangular `rows` matrix as `createManualTableSpec()`. `null` leaves a coordinate empty, while `{ value: null }` creates a real null-valued cell.

Custom formatter, structure, presentation, visual-scale, and Table Theme style definitions enter through `lowerOptions`. The adapter does not own table structure, presentation, layout, a renderer, or a private Table IR.

## Install

```bash
pnpm add @retikz/table-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
