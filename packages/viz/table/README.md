# @retikz/table

`@retikz/table` is retikz's renderer-agnostic Tier 2 table package. It will own the JSON-safe Table
IR, table structure and presentation contracts, constraint-grid layout, and lowering to
`@retikz/core`.

The npm package scaffold is initialized for `0.1.0-alpha.1`. Its public Table API will be added by
the alpha.1 ADR sequence; this scaffold intentionally does not expose provisional schema or runtime
APIs.

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
for the planned model and ownership boundary.
