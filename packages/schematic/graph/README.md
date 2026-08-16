# @retikz/graph

`@retikz/graph` provides framework-agnostic Schematic Graph elements. Its
JSON-serializable semantic IR retains the `graph` namespace, then lowers
through explicit Definitions to canonical Core IR.

The first release includes:

- `Container` for authored headers and sections
- `Entity` as one semantic IR entry whose `role` distinguishes `terminal`, `stage`, `decision`, and `junction`
- `Relation` as one semantic IR entry whose `role` distinguishes `flow`, `branch`, `dependency`, and `feedback`
- one explicit `Definition` for each Graph element
- five Graph-owned `EntityVariant` values for node visual hierarchy
- `GraphType` for the `entity`, `relation`, and `container` IR discriminators

## Install

```bash
pnpm add @retikz/graph @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import { createRelation, createGraphDefinitions, createEntity } from '@retikz/graph';

const step = createEntity({
  id: 'step',
  role: 'stage',
  position: [160, 0],
  text: 'Process',
});
const edge = createRelation({
  id: 'edge',
  role: 'flow',
  way: [[0, 0], DrawWay.Hv, 'step'],
});
const composites = createGraphDefinitions();
```

Omitted node `textColor`, `stroke`, and `fill` values are resolved during
lowering from `variant`. `default`, `primary`, `secondary`, `outline`, and
`vibrant` are closed Graph-owned values; `Container.entityVariant`
provides an inherited default for descendants. Each unit's `color` is its
primary color; omitting it or setting it to `currentColor` uses black in Light
mode or white in Dark mode.
Fixed 10%, 15%, and 60% tints are precomposed against white in Light mode or
black in Dark mode and remain opaque. Explicit leaf paint and opacity fields
pass through independently. Variant resolution does not read Core categorical
colors or require a custom ThemeStyle registry.

Relation's `way` form is authoring-only and is normalized through Core
`parseWay()` into canonical Step `children`. Persisted JSON contains only
`children`. Imports do not mutate a global registry; pass only the Definitions
selected for the current figure through Core compile options.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph)
for components, persisted IR, and direct-definition loading examples.
