# @retikz/table-react

React bindings for [`@retikz/table`](../table), retikz's renderer-agnostic Tier 2 table package.

The npm package scaffold is initialized for `0.1.0-alpha.1`. The future `<Table>` component and
authoring helpers will construct the same JSON-safe TableSpec consumed by the core Table package and
will delegate host rendering to `@retikz/react`.

This adapter will not own table structure, presentation, layout, lowering, or a private Table IR.

## Install

```bash
pnpm add @retikz/table-react
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

The public React API will be added as the alpha.1 Table contracts land.
