# @retikz/table-vanilla

Framework-free bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table
package.

`detailTable()` and `manualTable()` construct precise plain JSON-safe `IRDetailTableSpec` and
`IRManualTableSpec` values. `embedTable()` plus
`createTableAdapter()` plugs them into the standard `@retikz/vanilla` Figure / mount lifecycle;
`renderTable()` is a one-shot SSR convenience and can return a layout manifest artifact.

`manualTable()` accepts the same non-empty rectangular `rows` matrix as `createManualTableSpec()`.
Table derives dimensions and addresses from that matrix; `null` leaves a coordinate empty, while
`{ value: null }` creates a real null-valued Cell.

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
const result = renderTable(spec, {
  data: { scores: rows },
  compile: { composites: [] },
  animation: { enabled: false },
  artifacts: true,
});

result.svg;
result.manifest;
```

`renderTable()` calls `compileTable()` once and derives SVG plus the optional manifest from that same
compile result. Core options live under `compile`, including extra composite definitions; the removed
top-level `composites` option is not retained as an alias.

Custom formatter, structure, presentation, and visual-scale definitions enter through
`lowerOptions`. A visual-scale resolution uses `of`, `legendForm`, `domain`, `range`, and optional
`edges`; opted-in encodings can add a JSON-safe Legend descriptor seed to the returned manifest.
Alpha.3 intentionally ends at that seed. Table-to-Standard Legend composition and the final
occurrence join are planned for Table alpha.6 rather than exposed by this adapter today.

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
