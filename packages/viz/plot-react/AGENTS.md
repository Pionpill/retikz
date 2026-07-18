# @retikz/plot-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户通过 spec wrapper 或 composition JSX 使用 Plot 能力，并把 runtime data 与 lineage 接入 React 生命周期
- **拥有的契约**：`<Plot>` 与相关 React 组件 / props、children → PlotSpec 的纯 builder、dataset 注入、embedded runtime 和 React 侧 lineage 回调
- **不拥有的能力**：Data schema / transform、Plot IR 语义与 lowering 算法、Core 编译、SVG / Canvas renderer、通用 chart preset
- **输入与输出**：接收 React props / children、PlotSpec、datasets 与 runtime options，构造规范 PlotSpec 并交给 `@retikz/plot` / `@retikz/react`，输出 ReactElement 与 adapter runtime 结果
- **缺口流向**：数据问题进入 `@retikz/data`；可视化表达和 lowering 进入 `@retikz/plot`；图形语义进入 core；只有 React authoring convenience、props 映射和生命周期接线进入本包

## 约束

- React 组件只负责把 props / children 组装成 `@retikz/plot` spec，并交给底层 lowering。
- 不复制 data、scale、coordinate、mark、guide 或 lowering 算法；按问题归属先补 `@retikz/data` 或 `@retikz/plot`。
- `react` / `react-dom` 保持 peerDependencies；构建 spec 不依赖浏览器全局。
- Props 类型尽量从 `@retikz/plot` 的公开类型派生，不手写平行 schema。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/plot-react exec eslint . --fix
pnpm --filter @retikz/plot-react exec tsc --noEmit
```
