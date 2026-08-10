# @retikz/notation-react

React authoring bindings for [`@retikz/notation`](../notation). The components
preserve canonical Notation semantic IR and contribute the same Definitions
used by direct IR and Vanilla hosts.

## Install

```bash
pnpm add @retikz/notation-react @retikz/notation @retikz/react react react-dom
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```tsx
import { Layout, Step } from '@retikz/react';
import { Connector, Stage, Terminal } from '@retikz/notation-react';

<Layout>
  <Terminal id="start" position={[0, 0]}>
    Start
  </Terminal>
  <Stage id="step" position={[160, 0]}>
    Process
  </Stage>
  <Connector id="edge">
    <Step kind="move" to="start" />
    <Step to="step" />
  </Connector>
</Layout>;
```

`Connector` accepts either Core `<Step>` children or a Core Draw `way`, never
both. Components contribute Definitions only for the current `Layout`;
importing this package does not create global state.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for complete examples.
