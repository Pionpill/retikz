# @retikz/table

`@retikz/table` is retikz's renderer-agnostic Tier 2 table package. It owns the JSON-safe Table IR,
table structure and presentation contracts, two-dimensional constraint layout, Border Graph
resolution, and lowering to `@retikz/core`.

`DetailTableSchema`, `ManualTableSchema`, and `CustomTableSchema` define precise public
variants. `TableSchema` and `IRTable` aggregate them under the same `table.table` composite
root. A Table spec keeps actual dataset rows outside the IR, referring to host-supplied data through
`data.reference` instead.

Use `createDetailTableIR()` for record-per-row tables and `createManualTableIR()` for explicit
row-major Cells. Manual `rows` is a non-empty rectangular matrix whose dimensions and Cell addresses
are derived by Table. Scalar entries are value shorthands, `null` leaves a coordinate empty, and
`{ value: null }` stores a real null Cell. Both helpers return plain, JSON-safe precise specs while
sharing structure normalization, presentation, layout, and lowering.

Table first resolves one deterministic Cell plan: the Core host Theme selects a same-named style definition,
shared categorical colors project into the Table data channel, and local `tableThemeTokens` provides
a sparse Table token overlay. Cell-local formatter/presentation/appearance, ordered visual
encodings, and ordered root rules then contribute in increasing priority. Value Cells run the
winning formatter and presentation with that final appearance.
The default baseline provides complete light/dark token maps when `style` is omitted. Named styles use the
same public Core and Table definition registries; `theme.style` / `theme.mode` select the matching
definitions, while `tableThemeTokens` is the local IRTable overlay. Unknown token keys fail
loudly. Content Cells already own renderable children and therefore bypass formatter and
presentation dispatch.

`compileTable(spec, datasets, { theme })` accepts a sparse root Core Theme. `tableThemeTokens` stays
in the JSON-safe IRTable and is resolved by the Table owner. The resolved `TableLayoutManifest`
records effective `style`, `themeMode`, complete tokens, and per-token sources as output metadata.
Custom styles register the same name in Core through `compile.themeStyles` and in Table through
`lower.tableThemeStyles`; a consumed style without its Table definition fails loudly.

Use `lowerTables(datasets, options)` to register the layout-aware Table composite definition with
`@retikz/core`. For a standalone Table, `compileTable(spec, datasets, options)` performs one Core
compile and returns its `scene`, complete `artifacts`, and the exact root `TableLayoutManifest` from
the typed `table.table` composite artifact. The manifest is detached, recursively frozen, and comes
from the same layout transaction as the Scene.

- `@retikz/data` owns shared data models and transforms.
- `@retikz/table-react` provides `Table`, `DetailTable`, and `ManualTable` React entries.
- `@retikz/table-vanilla` provides Input helpers, an InputEmbed adapter, and one-shot SSR.
- Plot content may enter a Cell through Core composition, but this package does not depend on
  `@retikz/plot`.

Adapter authors can use `createTableRuntimeContribution()` to produce a Core
`CoreProviderContribution`. It carries the Table provider, runtime datasets,
formatter/structure/presentation/visual-scale definitions, and nested composite providers through
the same identity-based conflict rules as the built-in React and Vanilla adapters. The contribution
stores detached frozen containers while leaving caller-owned definition objects unchanged. This
extension contract is runtime-only and does not enter Table IR.

Each visual-scale Definition returns one runtime resolution with `of`, `legendForm`, `domain`,
`range`, and optional `edges`. Table validates its JSON/color shape and repeated-input determinism;
custom Definition authors remain responsible for keeping the evaluator and descriptor data
semantically aligned. An opted-in encoding copies descriptor data from that same resolution into the
JSON-safe manifest seed.

Standard already provides public Legend and Flex capabilities, but alpha.3 intentionally stops at
the descriptor seed. The JSON-safe Table-body composition boundary, rendered Standard Legend, and
final occurrence join are planned for Table alpha.6. This package therefore does not expose
`legendLayout`, a Table-local Legend, or a final joined manifest helper in alpha.3.

## Install

```bash
pnpm add @retikz/table
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

See the [table architecture](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-design.md)
and [table capability boundary](https://github.com/Pionpill/retikz/blob/next-table/packages/viz/_notes/architecture/table-visualization-complete.md)
for the model and ownership boundary.
