# @retikz/graph-react

React authoring bindings for [`@retikz/graph`](../graph). The components
preserve canonical Graph semantic IR and contribute the same Definitions
used by direct IR and Vanilla hosts.

## Install

```bash
pnpm add @retikz/graph-react @retikz/graph @retikz/react react react-dom
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```tsx
import { Layout, Step } from '@retikz/react';
import { GraphConnector, GraphNode } from '@retikz/graph-react';

<Layout>
  <GraphNode id="start" role="terminal" position={[0, 0]}>
    Start
  </GraphNode>
  <GraphNode id="step" role="stage" position={[160, 0]}>
    Process
  </GraphNode>
  <GraphConnector id="edge" role="flow">
    <Step kind="move" to="start" />
    <Step to="step" />
  </GraphConnector>
</Layout>;
```

`GraphConnector` accepts either Core `<Step>` children or a Core Draw `way`, never
both. Components contribute Definitions only for the current `Layout`;
importing this package does not create global state.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph)
for complete examples.
