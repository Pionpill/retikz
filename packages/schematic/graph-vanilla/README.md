# @retikz/graph-vanilla

Framework-neutral Input bindings for [`@retikz/graph`](../graph). Every
helper returns an `InputEmbed`, and explicit InputEmbed adapters lower those
embeds for SSR and mount workflows.

## Install

```bash
pnpm add @retikz/graph-vanilla @retikz/graph @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import { relation, RelationInputEmbedAdapter, entity, EntityInputEmbedAdapter } from '@retikz/graph-vanilla';

const children = [
  entity('start', { role: 'terminal', position: [0, 0], text: 'Start' }),
  entity('step', { role: 'stage', position: [160, 0], text: 'Process' }),
  relation('edge', { role: 'flow', way: ['start', DrawWay.Hv, 'step'] }),
];
const adapters = [EntityInputEmbedAdapter, RelationInputEmbedAdapter];
```

Container, Entity, and Relation helpers and adapters cover the complete
Graph family. Entity and Relation reuse the embed id as the canonical
Graph IR id; Container derives stable nested ids for its outer composite.
Relation accepts either canonical Step `children` or authoring-only `way`.
Direct persisted IR uses selected Definitions from `@retikz/graph` through
Core compile options.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph)
for complete examples.
