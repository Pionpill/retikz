# @retikz/table-vanilla

Framework-free bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table
package.

`detailTable()` and `manualTable()` construct precise plain JSON-safe `IRDetailTableSpec` and
`IRManualTableSpec` values. `embedTable()` plus
`createTableAdapter()` plugs them into the standard `@retikz/vanilla` Figure / mount lifecycle;
`renderTable()` is a one-shot SSR convenience and can return a layout manifest artifact.

```ts
import { createTableAdapter, detailTable, embedTable, renderTable } from '@retikz/table-vanilla';
import { figure, mount } from '@retikz/vanilla';

const spec = detailTable({
  id: 'scores',
  dataRef: 'scores',
  columns: [{ id: 'score', field: 'score', header: 'Score' }],
});

const adapter = createTableAdapter();
const view = mount(container, figure([embedTable('scores-panel', spec, { data: { scores: rows } })]), {
  adapters: [adapter],
});
const svg = renderTable(spec, { data: { scores: rows } });
```

The API is based on plain functions and data, not a fluent builder. The adapter is SSR-safe and does
not own table structure, presentation, layout, lowering, a renderer, or a private Table IR.

## Install

```bash
pnpm add @retikz/table-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

Use Kernel `mount()` / `mountSvg()` / `mountCanvas()` for browser updates; this package does not add
a Table-specific mount handle.
