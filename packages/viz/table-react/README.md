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
    { id: 'name', field: 'name', header: 'Name', bodyLayout: { padding: 6, wrap: true } },
    { id: 'score', field: 'score', header: 'Score', bodyLayout: { horizontalAlign: 'end' } },
  ]}
  layout={{ columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } }}
/>;
```

`DetailTable` also supports JSX column markers. Choose either the complete `columns` prop or
`DetailColumn` children for one table:

```tsx
import { DetailColumn, DetailTable } from '@retikz/table-react';

<DetailTable id="scores" dataRef="scores" data={rows}>
  <DetailColumn id="name" field="name" header="Name" />
  <DetailColumn id="score" field="score" header="Score" />
</DetailTable>;
```

`ManualTable` likewise accepts the complete `cells` / `rowKinds` props or nested `Row` and `Cell`
markers. Dimensions always remain explicit on the root component, while spans reserve occupied slots
across later rows:

```tsx
import { Cell, ManualTable, Row } from '@retikz/table-react';

<ManualTable rows={2} columns={3}>
  <Row kind="columnHeader">
    <Cell span={{ columns: 2 }}>Identity</Cell>
    <Cell>Score</Cell>
  </Row>
  <Row>
    <Cell>Alice</Cell>
    <Cell>Engineering</Cell>
    <Cell value={95} />
  </Row>
</ManualTable>;
```

`DetailColumn`, `Row`, and `Cell` are React authoring markers: they compile to the same TableSpec
forms as their respective plain props. `<Table>` remains the entry for callers that already hold a
complete TableSpec.

All three root components work standalone or as Tier 2 children of `@retikz/react` `Layout`.
Standalone roots reuse the supported `Layout` host surface and observe `onManifest` from the same
compile artifact. Embedded usage requires a stable spec id and rejects standalone host props or local
`onManifest`; move them to the outer `Layout`. Datasets, custom definitions, and extra composites
remain runtime inputs outside Table IR.

## Install

```bash
pnpm add @retikz/table-react
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

This adapter does not own table structure, presentation, layout, lowering, or a private Table IR.
