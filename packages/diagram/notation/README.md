# @retikz/notation

`@retikz/notation` provides framework-agnostic Diagram Notation elements. Its
JSON-serializable semantic IR retains the `notation` namespace, then lowers
through explicit Definitions to canonical Core IR.

The first release includes:

- `LogicFrame` for authored headers and sections
- `Terminal`, `Stage`, `Decision`, and `Junction` as semantic IR that lowers one-to-one to same-id Core Nodes
- `Connector` as semantic IR that reuses Core Path steps or Draw ways and lowers one-to-one to a same-id stroke Path
- one explicit `Definition` for each element
- five Notation-owned `LogicUnitVariant` values for logic-unit visual hierarchy

## Install

```bash
pnpm add @retikz/notation @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import { createConnector, createNotationDefinitions, createStage } from '@retikz/notation';

const step = createStage({ id: 'step', position: [160, 0], text: 'Process' });
const edge = createConnector({ id: 'edge', way: [[0, 0], DrawWay.Hv, 'step'] });
const composites = createNotationDefinitions();
```

Omitted logic-unit `textColor`, `stroke`, and `fill` values are resolved during
lowering from `variant`. `default`, `primary`, `secondary`, `outline`, and
`vibrant` are closed Notation-owned values; `LogicFrame.logicUnitVariant`
provides an inherited default for descendants. Each unit's `color` is its
primary color; omitting it uses black in Light mode or white in Dark mode.
Fixed 10%, 15%, and 60% tints are precomposed against white in Light mode or
black in Dark mode and remain opaque. Explicit leaf paint and opacity fields
pass through independently. Variant resolution does not read Core categorical
colors or require a custom ThemeStyle registry.

Connector's `way` form is authoring-only and is normalized through Core
`parseWay()` into canonical Step `children`. Persisted JSON contains only
`children`. Imports do not mutate a global registry; pass only the Definitions
selected for the current figure through Core compile options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for components, persisted IR, and direct-definition loading examples.
