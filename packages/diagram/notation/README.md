# @retikz/notation

`@retikz/notation` provides retikz's framework-agnostic Diagram Notation
composites. Its JSON-serializable Tier 2 inputs lower through
`@retikz/core`'s public composite registry to ordinary Core IR.

The first release includes:

- `LogicFrame` for authored headers and sections
- `Terminal`, `Stage`, `Decision`, and `Junction` Core Node sugars
- `Connector` and `Callout` local relationship composites
- per-composite `Definition` exports for explicit Core compilation

## Install

```bash
pnpm add @retikz/notation @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { createLogicFrame, LogicFrameDefinition } from '@retikz/notation';
```

Imports do not mutate a global registry. Pass only the definitions selected for
the current figure directly through Core compile options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for components, persisted IR, and direct-definition loading examples.
