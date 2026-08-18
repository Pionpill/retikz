# ADR-05：将 SVG 与 Canvas 合并为 `@retikz/render` 子路径

- 状态：Accepted（已实现）
- 决策日期：2026-06-01
- 关联：[ADR-01 SVG descriptor](./01-svg-descriptor-contract.md) · [ADR-02 Canvas renderer](./02-canvas-renderer-and-react-canvas-mode.md) · [ADR-03 依赖图](./03-vanilla-runtime-and-dependency-graph.md)

## 背景

SVG 和 Canvas 是并列后端，React 与 Vanilla 都需要它们；未来还会增加 WebGL 等后端。若每个后端占一个顶级包，包名和依赖会随后端数量增长。

## 决策

以单包命名空间承载各后端：

```ts
import { buildSvgDocument, renderToSvgString } from '@retikz/render/svg';
import { drawScene, renderToCanvas } from '@retikz/render/canvas';
```

- `@retikz/render` 不提供根入口，后端必须从子路径导入，避免聚合所有后端并保留 tree-shaking
- 包直接依赖 `@retikz/core`，`csstype` 仅为类型依赖；`svg` 与 `canvas` 在命名空间内互不依赖，Canvas 不经 SVG
- ADR-01 的 `SvgNode`/字符串渲染与 ADR-02 的 Scene→Canvas 命令语义完全不变；改变的只有包形态和导入路径
- 合包后原本由物理包边界保证的互不依赖，改由包内边界守卫保证；任何后端不得引用另一个后端的实现或输出模型

## 兼容性与实现结果

`@retikz/svg` 与 `@retikz/canvas` 尚未发布，因此合并不破坏已发布消费者。`@retikz/render/svg`、`@retikz/render/canvas` 已成为稳定子路径，React 和 Vanilla 均改用统一的 `@retikz/render` 依赖。

## 遗留风险

后续后端应继续使用同一命名空间和子路径边界；新增后端的实现、能力声明和边界守卫另行决策。
