# @retikz/table-vanilla

Framework-free bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table
package.

The npm package scaffold is initialized for `0.1.0-alpha.1`. The future `tableBuilder()` and
`renderTable()` APIs will construct and consume the same JSON-safe TableSpec as the React adapter,
while delegating compilation and SSR output to `@retikz/vanilla`.

This adapter will remain SSR-safe and will not own table structure, presentation, layout, lowering,
or a private Table IR.

## Install

```bash
pnpm add @retikz/table-vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

The public Vanilla API will be added as the alpha.1 Table contracts land.
