# @retikz/standard

`@retikz/standard` provides retikz's official, framework-agnostic drawing
composites. Its JSON-serializable Tier 2 inputs lower through
`@retikz/core`'s public composite registry to ordinary Core IR.

The first release includes:

- `Grid` for rule-based reference grids
- `Axes` for static mathematical coordinate axes
- `Frame` for bordered semantic groups with Node-like titles and descriptions
- capability modules, partial bundles, and `StandardAllPreset` for explicit loading

## Install

```bash
pnpm add @retikz/standard @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { createGrid, GridModule, StandardAllPreset } from '@retikz/standard';
```

Imports do not mutate a global registry. Pass selected definitions through a
bundle's `compile` contribution or directly through Core compile options.

See the [Standard documentation](https://pionpill.github.io/retikz/standard/introduction)
for components, persisted IR, and capability-loading examples.
