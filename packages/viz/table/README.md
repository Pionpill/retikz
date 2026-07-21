# @retikz/table

`@retikz/table` is retikz's renderer-agnostic Tier 2 table package. It owns the JSON-safe Table IR,
table structure and presentation contracts, constraint-grid layout, and lowering to `@retikz/core`.

`TableSpecSchema` and `IRTableSpec` define the public Table composite root. A Table spec keeps actual
dataset rows outside the IR, referring to host-supplied data through `data.reference` instead.

- `@retikz/data` owns shared data models and transforms.
- `@retikz/table-react` will provide React authoring and runtime integration.
- `@retikz/table-vanilla` will provide framework-free authoring and SSR integration.
- Plot content may enter a Cell through Core composition, but this package does not depend on
  `@retikz/plot`.

## Install

```bash
pnpm add @retikz/table
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

See the [table architecture](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-design.md)
and [table capability boundary](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-visualization-complete.md)
for the model and ownership boundary.
