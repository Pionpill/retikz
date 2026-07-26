# @retikz/standard-react

React authoring bindings for [`@retikz/standard`](../standard). The package
provides `Grid`, `Axes`, and `Frame` JSX components that contribute the
same Standard composite definitions used by persisted IR and Vanilla hosts.

## Install

```bash
pnpm add @retikz/standard-react @retikz/react react react-dom
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```tsx
import { Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

<Layout>
  <Frame id="contract/frame">
    <FrameTitle>Definition contract</FrameTitle>
    <FrameDescription>Builtins and extensions share one registry</FrameDescription>
    <Node position={[0, 0]}>defineXxx()</Node>
  </Frame>
</Layout>;
```

Components register definitions only for the current `Layout`; importing this
package does not create global state.

See the [Standard documentation](https://pionpill.github.io/retikz/standard/introduction)
for complete examples.
