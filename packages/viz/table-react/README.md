# @retikz/table-react

React bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table package.

Use `Table` with a complete `IRTableSpec`, `DetailTable` for record-per-row data, or `ManualTable`
for explicit row-major Cells. Detail and manual authoring delegate to `@retikz/table`, so all
three entries use the same lowering and layout manifest. The sugar entries retain precise
`IRDetailTableSpec` / `IRManualTableSpec` values; `Table` accepts the aggregate `IRTableSpec` union.

```tsx
import { DetailTable } from '@retikz/table-react';

<DetailTable
  id="scores"
  dataRef="scores"
  data={rows}
  style="neutral"
  columns={[
    { id: 'name', field: 'name', header: 'Name', bodyLayout: { padding: 6, wrap: true } },
    {
      id: 'score',
      field: 'score',
      header: 'Score',
      formatter: { name: 'number', options: { specifier: '.0f' } },
      bodyLayout: { horizontalAlign: 'end' },
    },
  ]}
  layout={{ columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } }}
  containerStyle={{ maxWidth: '100%', height: 'auto' }}
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

`ManualTable` accepts the same rectangular `rows` persisted by `@retikz/table`, or nested `Row` and
`Cell` markers. Marker mode infers the maximum occupied width and pads unoccupied coordinates with
`null`; spans reserve occupied slots across later rows:

```tsx
import { Cell, ManualTable, Row } from '@retikz/table-react';

<ManualTable>
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

For persisted or props-based authoring, scalar entries are value shorthands, `null` means no Cell,
and `{ value: null }` means a real null-valued Cell. Rich value/content objects carry span, layout,
formatter/presentation references, semantic fields, or direct Core/Tier 2 content. Formatter and
presentation references only apply to scalar value Cells; content Cells reject both because they
already carry renderable children.

Detail and manual roots forward the JSON-safe `rules`, `encodings`, `style`, `themeMode`, and
`styleTokens` fields to the same TableSpec contract as plain authoring. `style` selects the Table
preset. Standalone host CSS uses `containerStyle`; the former CSS-object `style` prop is removed,
and embedded Tables reject `containerStyle` together with the other standalone-only host props.

All three root components work standalone or as Tier 2 children of `@retikz/react` `Layout`.
Standalone roots reuse the supported `Layout` host surface and observe `onManifest` from the same
compile artifact. Embedded usage requires a stable spec id and rejects standalone host props or local
`onManifest`; move them to the outer `Layout`. Datasets, custom definitions, and extra composites
remain runtime inputs outside Table IR.

Formatter, structure, presentation, and visual-scale definitions use the same `LowerTablesOptions`
and lowering contract in standalone and embedded modes. Embedded roots additionally package those
runtime inputs through `createTableRuntimeContribution()` for the outer Layout. A visual-scale
resolution exposes `of`, `legendForm`, `domain`, `range`, and optional `edges`; opted-in encodings
copy the descriptor fields into the Table manifest. Alpha.3 intentionally ends at that seed;
rendered Standard Legend composition and a final joined manifest are planned for Table alpha.6, so
this adapter exposes neither `legendLayout` nor a private Legend child in alpha.3.

## Install

```bash
pnpm add @retikz/table-react
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

This adapter does not own table structure, presentation, layout, lowering, or a private Table IR.
