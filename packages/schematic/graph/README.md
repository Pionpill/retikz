# @retikz/graph

`@retikz/graph` provides framework-agnostic Schematic Graph elements. Its
JSON-serializable semantic IR retains the `graph` namespace, then lowers
through explicit Definitions to canonical Core IR.

The first release includes:

- `Graph` as an optional presentation root for inherited Entity variants and Theme tokens
- `Container` for authored headers and sections
- `Entity` as one semantic IR entry with open role and variant keys
- `Relation` as one semantic IR entry whose `role` distinguishes `flow`, `branch`, `dependency`, and `feedback`
- Definition registries for custom Entity roles, variants, and Graph Theme styles
- eight Graph-owned Entity Theme tokens with role / variant selectors
- `GraphType` for the `graph`, `entity`, `relation`, and `container` IR discriminators

## Install

```bash
pnpm add @retikz/graph @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import { createEntity, createGraph, createGraphDefinitions, createRelation, defineEntityRole } from '@retikz/graph';

const serviceRole = defineEntityRole({
  role: 'service',
  shape: { type: 'rectangle', params: { cornerRadius: 8 } },
  padding: { x: 12, y: 8 },
});

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
const graph = createGraph({ id: 'workflow', entityVariant: 'mixed', children: [step, edge] });
const composites = createGraphDefinitions({ entityRoles: [serviceRole] });
```

Omitted node `textColor`, `stroke`, and `fill` values are resolved during
lowering from the registered `variant`. Graph ships `default`, `fill`,
and `mixed`; applications can add more through
`defineEntityVariant()`. `Graph.entityVariant` and `Container.entityVariant`
provide inherited defaults for descendants. Each Entity's `color` is its
primary color; omitting it or setting it to `currentColor` uses black in Light
mode or white in Dark mode.
The fixed 15% tint is precomposed against white in Light mode or black in Dark
mode and remains opaque. Explicit leaf paint and opacity fields
pass through independently.

`defineGraphThemeStyle()` pairs a Graph Theme resolver with a same-name Core
Theme style. Its token rules select by effective role, variant, or both.
`createGraphDefinitions(options)` and `createGraphProviders(options)` keep
built-in and custom Definitions on the same assembly-local registry path;
imports never mutate global state.

Relation's `way` form is authoring-only and is normalized through Core
`parseWay()` into canonical Step `children`. Persisted JSON contains only
`children`. Imports do not mutate a global registry; pass only the Definitions
selected for the current figure through Core compile options.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph)
for components, persisted IR, and direct-definition loading examples.
