# @retikz/notation

`@retikz/notation` provides framework-agnostic Diagram Notation elements. Its
JSON-serializable semantic IR retains the `notation` namespace, then lowers
through explicit Definitions to canonical Core IR.

The first release includes:

- `LogicFrame` for authored headers and sections
- `Terminal`, `Stage`, `Decision`, and `Junction` as semantic IR that lowers one-to-one to same-id Core Nodes
- `Connector` as semantic IR that reuses Core Path steps or Draw ways and lowers one-to-one to a same-id stroke Path
- `Callout` for target-relative explanations
- one explicit `Definition` for each element

## Install

```bash
pnpm add @retikz/notation @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import { ConnectorDefinition, createConnector, createStage, StageDefinition } from '@retikz/notation';

const step = createStage({ id: 'step', position: [160, 0], text: 'Process' });
const edge = createConnector({ id: 'edge', way: [[0, 0], DrawWay.Hv, 'step'] });
const composites = [StageDefinition, ConnectorDefinition];
```

Connector's `way` form is authoring-only and is normalized through Core
`parseWay()` into canonical Step `children`. Persisted JSON contains only
`children`. Imports do not mutate a global registry; pass only the Definitions
selected for the current figure through Core compile options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for components, persisted IR, and direct-definition loading examples.
