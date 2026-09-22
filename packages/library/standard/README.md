# @retikz/standard

`@retikz/standard` provides retikz's official, framework-agnostic drawing
composites. Its JSON-serializable Tier 2 inputs lower through
`@retikz/core`'s public composite registry to ordinary Core IR.

The first release includes:

- `Grid` for rule-based reference grids
- `Axes` for static mathematical coordinate axes
- `Frame` for bordered semantic groups with Node-like titles and descriptions
- `Legend` for discrete items and continuous ramps with shared layout artifacts
- `Surface` for wrapping any Core child with box appearance and layout semantics
- per-composite `Definition` exports for explicit Core compilation
- a `shape` subpath for persistent shape composites

## Install

```bash
pnpm add @retikz/standard @retikz/core
```

This package is ESM-only and requires Node.js 22.12 or newer.
本包仅发布 ES modules，要求 Node.js 22.12 或更高版本。

```ts
import { createGrid, GridDefinition } from '@retikz/standard';
```

Imports do not mutate a global registry. Pass only the definitions selected for
the current figure directly through Core compile options such as `composites`.

Optional node shapes, arrows, clips, ribbons, and animation effect presets are provided by `@retikz/extension`.

See the [Standard documentation](https://pionpill.github.io/retikz/library/standard)
for components, persisted IR, and direct-definition loading examples.
