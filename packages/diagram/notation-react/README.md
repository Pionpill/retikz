# @retikz/notation-react

React authoring bindings for [`@retikz/notation`](../notation). The package
provides Notation JSX components that contribute the same composite
definitions used by persisted IR and Vanilla hosts.

## Install

```bash
pnpm add @retikz/notation-react @retikz/notation @retikz/react react react-dom
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```tsx
import { Layout, Node } from '@retikz/react';
import { LogicFrame, LogicFrameSection } from '@retikz/notation-react';

<Layout>
  <LogicFrame id="contract/frame">
    <LogicFrameSection sectionKey="body">
      <Node position={[0, 0]}>Notation</Node>
    </LogicFrameSection>
  </LogicFrame>
</Layout>;
```

Components register definitions only for the current `Layout`; importing this
package does not create global state.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for complete examples.
