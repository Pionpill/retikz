# @retikz/plot-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让无 UI 框架、SSR 与 build-time 用户用 plain API 构造并运行 Plot，同时复用同一 Data / Plot / Core 管线
- **拥有的契约**：plain `plot()` authoring、`embedPlot()` / `PlotInputEmbedAdapter` Tier 2 接线、`renderPlot()` 编排、dataset / lineage options
- **不拥有的能力**：Data schema / transform、Plot IR 语义与 lowering 算法、Core 编译、SVG renderer、DOM runtime 或框架组件
- **输入与输出**：接收 plain authoring input 或 PlotSpec、datasets 与 options，产出规范 PlotSpec、Vanilla embed、SVG string 或 `{ svg, lineage }`；不建立平行 IR 或 lowering
- **缺口流向**：数据问题进入 `@retikz/data`；可视化表达和 lowering 进入 `@retikz/plot`；通用无框架挂载 / SSR 能力进入 `@retikz/vanilla`；只有 Plot-specific plain authoring 与编排进入本包

## 约束

- 渲染入口复用 `@retikz/plot` 的 composite lowering 和 `@retikz/vanilla` / `@retikz/core` 能力。
- 不复制 data、scale、coordinate、mark、guide 或 lowering 算法；按问题归属先补 `@retikz/data` 或 `@retikz/plot`。
- 保持 SSR 友好，不依赖 DOM 全局。
- 公开 API 以简单函数和 plain data 为主。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/plot-vanilla exec eslint . --fix
pnpm --filter @retikz/plot-vanilla exec tsc --noEmit
```
