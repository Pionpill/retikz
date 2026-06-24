# @retikz/react

React adapter for [retikz](https://pionpill.github.io/retikz/) — declare TikZ-style diagrams with JSX. Build IR with Kernel / Sugar components, then render to **SVG or Canvas** from the same tree.

retikz 的 React 适配层：用 JSX 声明 TikZ 风格图形。Kernel / Sugar 组件构建 IR，`<Layout renderer="svg"｜"canvas">` 在最终渲染阶段选择输出后端（默认 `svg`，两路共用同一 `compileToScene`、同 Scene 等价）。

## Install

```bash
pnpm add @retikz/react @retikz/core @retikz/render
# peer: react >= 18, react-dom >= 18
```

## Usage

```tsx
import { Layout, Node, Draw } from '@retikz/react';

export const Diagram = () => (
  <Layout renderer="svg">
    <Node id="a" position={[0, 0]}>A</Node>
    <Node id="b" position={[120, 0]}>B</Node>
    <Draw way={['a', 'b']} arrow="->" />
  </Layout>
);
```

Switch the backend with one prop — same JSX, same IR:

```tsx
<Layout renderer="canvas">{/* ... */}</Layout>
```

## Exports

- Kernel: `Layout` / `Node` / `Path` / `Step` / `Text` / `Coordinate` / `Scope`
- Sugar: `Draw` and the shape components (`Circle` / `Rectangle` / `Grid` / …)
- IR interop: `convertReactNodeToIR` / `convertIRToReactNode`
- Re-exported from core: `definePathGenerator`, `DrawWay`, target/anchor types

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
