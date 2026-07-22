# @retikz/table-react

React bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table package.

Use `Table` with a complete `IRTableSpec`, `DetailTable` for record-per-row data, or `ManualTable`
for explicit dimensions and Cells. Detail and manual authoring delegate to `@retikz/table`, so all
three entries use the same lowering and layout manifest. The sugar entries retain precise
`IRDetailTableSpec` / `IRManualTableSpec` values; `Table` accepts the aggregate `IRTableSpec` union.

```tsx
import { DetailTable } from '@retikz/table-react';

<DetailTable
  id="scores"
  dataRef="scores"
  data={rows}
  columns={[
    { id: 'name', field: 'name', header: 'Name' },
    { id: 'score', field: 'score', header: 'Score' },
  ]}
/>;
```

All three components work standalone or as Tier 2 children of `@retikz/react` `Layout`. Embedded
usage requires a stable spec id. `onManifest` is standalone-only; datasets, custom definitions, and
extra composites remain runtime inputs outside Table IR.

## Install

```bash
pnpm add @retikz/table-react
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

This adapter does not own table structure, presentation, layout, lowering, or a private Table IR.
