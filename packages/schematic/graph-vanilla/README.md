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
import {
  graphConnector,
  GraphConnectorInputEmbedAdapter,
  graphNode,
  GraphNodeInputEmbedAdapter,
} from '@retikz/graph-vanilla';

const children = [
  graphNode('start', { role: 'terminal', position: [0, 0], text: 'Start' }),
  graphNode('step', { role: 'stage', position: [160, 0], text: 'Process' }),
  graphConnector('edge', { role: 'flow', way: ['start', DrawWay.Hv, 'step'] }),
];
const adapters = [GraphNodeInputEmbedAdapter, GraphConnectorInputEmbedAdapter];
```

GraphFrame, GraphNode, and GraphConnector helpers and adapters cover the complete
Graph family. GraphNode and GraphConnector reuse the embed id as the canonical
Graph IR id; GraphFrame derives stable nested ids for its outer composite.
GraphConnector accepts either canonical Step `children` or authoring-only `way`.
Direct persisted IR uses selected Definitions from `@retikz/graph` through
Core compile options.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph)
for complete examples.
