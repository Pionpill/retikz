# @retikz/react

React adapter for [retikz](https://pionpill.github.io/retikz/) — declare TikZ-style diagrams with JSX. Kernel / Sugar components collect Vanilla Input, which Vanilla normalizes and processes before rendering to **SVG or Canvas**.

retikz 的 React 适配层：用 JSX 声明 TikZ 风格图形。Kernel / Sugar 组件收集 Vanilla Input，由 Vanilla 统一归一化和处理；`<Layout renderer="svg"｜"canvas">` 在最终渲染阶段选择输出后端（默认 `svg`，两路共用同一处理结果）。

## Install

```bash
pnpm add @retikz/react @retikz/core @retikz/render
# peer: react >= 18, react-dom >= 18
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

## Usage

```tsx
import { Layout, Node, Draw } from '@retikz/react';

export const Diagram = () => (
  <Layout renderer="svg">
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" />
  </Layout>
);
```

Switch the backend with one prop — same JSX, same IR:

```tsx
<Layout renderer="canvas">{/* ... */}</Layout>
```

`ThemeProvider` supplies an ambient sparse Core Theme and optional `themeStyles` definitions to
descendant Layouts. Omitting `style` selects the package baseline; applications inject named
style names through `defineThemeStyle` and the matching owner-local definitions they consume.

## Exports

- Kernel: `Layout` / `ThemeProvider` / `Node` / `Path` / `Step` / `Text` / `Coordinate` / `Scope`
- Sugar: `Draw` and the shape components (`Circle` / `Rectangle` / …)
- IR interop: `convertIRToReactNode`; the conversion preserves Tier 1 structure and accepts composite definitions to lower Tier 2 IR into equivalent Kernel JSX
- Core grammar vocabulary and extension definitions stay owned by `@retikz/core`; import them from that package when needed

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
