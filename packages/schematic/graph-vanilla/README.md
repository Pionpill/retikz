# @retikz/graph-vanilla

Framework-neutral authoring bindings for [`@retikz/graph`](../graph). Graph, Entity and Relation each have an independent builder and `InputEmbed` adapter. Every adapter produces the same compact Source IR as direct JSON authoring; embed identity and runtime Definition options never enter that IR.

## Install

```bash
pnpm add @retikz/graph-vanilla @retikz/graph @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { createGraphVanillaAdapters, entity, graph, relation } from '@retikz/graph-vanilla';

const children = [
  graph('workflow-embed', {
    transforms: [{ kind: 'translate', x: 20, y: 10 }],
    children: [
      { type: 'entity', id: 'start', role: 'event', text: 'Start', position: [80, 80] },
      { type: 'entity', id: 'task', role: 'activity', text: 'Process', position: [320, 80] },
      {
        type: 'relation',
        role: 'flow',
        source: { id: 'start' },
        target: { id: 'task' },
        way: ['start', 'task'],
      },
    ],
  }),
  entity('legend-embed', {
    type: 'entity',
    role: 'concept',
    text: 'Legend',
    position: [80, 200],
  }),
  relation('legend-link-embed', {
    type: 'relation',
    role: 'association',
    source: { id: 'start' },
    target: { id: 'task' },
  }),
];

const adapters = createGraphVanillaAdapters();
```

`graph()` accepts the complete Core Scope authoring surface directly. Use `theme` for Core Theme overrides and `graphTheme` for Graph-local Entity and Relation rules. It does not create a panel Scope or a Scene host.

`entity()` and `relation()` can be used anywhere a Vanilla `InputChild` is accepted. Their authored `id` is optional; the first builder argument is only embed traversal identity and is never copied into Source or Core identity. Relation endpoints use Core `NodeTarget`, so `{ id, anchor, offset, boundary }` remains available without a Graph parent.

Pass custom Entity, Relation and Graph Theme Definition arrays to the matching builder. The adapter contributes them through provider datasets and strips all Definition options from Source IR.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph) for complete examples.
