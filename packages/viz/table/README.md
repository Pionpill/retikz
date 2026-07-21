# @retikz/table

`@retikz/table` is retikz's renderer-agnostic Tier 2 table package. It owns the JSON-safe Table IR,
table structure and presentation contracts, constraint-grid layout, and lowering to `@retikz/core`.

`TableSpecSchema` and `IRTableSpec` define the public Table composite root. A Table spec keeps actual
dataset rows outside the IR, referring to host-supplied data through `data.reference` instead.

Use `createDetailTableSpec()` for record-per-row tables and `createManualTableSpec()` for explicit
dimensions and Cells. Both return plain, JSON-safe `IRTableSpec` values and share the same schema,
structure normalization, presentation, layout, and lowering pipeline.

Use `lowerTables(datasets, options)` to register Table composite lowering with `@retikz/core`.
`lowerTableWithArtifacts(spec, datasets, options)` runs the same deterministic pipeline and also
returns the detached, recursively frozen `TableLayoutManifest` sidecar.

- `@retikz/data` owns shared data models and transforms.
- `@retikz/table-react` provides `Table`, `DetailTable`, and `ManualTable` React entries.
- `@retikz/table-vanilla` provides plain spec helpers, a Tier 2 embed adapter, and one-shot SSR.
- Plot content may enter a Cell through Core composition, but this package does not depend on
  `@retikz/plot`.

Adapter authors can use `createTableRuntimeContribution()` and `makeTableRuntimeComposites()` to
merge runtime datasets and definitions with the same conflict rules as the built-in React and
Vanilla adapters. This extension contract is runtime-only and does not enter Table IR.

## Install

```bash
pnpm add @retikz/table
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

See the [table architecture](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-design.md)
and [table capability boundary](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-visualization-complete.md)
for the model and ownership boundary.
