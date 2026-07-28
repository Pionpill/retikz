# @retikz/render 工作指南

本文件只写 `@retikz/render` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把同一份 Core Scene 一致地执行为 SVG、Canvas 或 Node Canvas，并提供 adapter 可复用的 hydration 与 animation 执行底座
- **拥有的契约**：Scene 到后端产物的 emitter、Scene Patch 校验与 retained materialization、后端资源与 id 映射、Canvas hit-test、SVG descriptor / serialization、hydration controller 和跨后端 animation runtime
- **不拥有的能力**：Core IR / schema、IR → Scene 编译、layout / anchor / bbox 语义、Plot / Data 领域规则、React / Vanilla 组件 API、业务 selection / tooltip 状态
- **输入与输出**：接收已编译 Scene 与 render / runtime options，输出 SVG descriptor / string、Canvas 绘制结果、image bytes 或 hydration / animation controller；不反向改写 IR
- **缺口流向**：后端中立语义缺口先补 `@retikz/core`；通用纯几何下沉 `@retikz/math`；宿主生命周期与 UI 状态上移 React / Vanilla adapter；单后端优化可留本包，但不得改变 Scene 含义

## 子路径边界

- `./svg` 只负责 Scene → SvgNode / string，不访问 React。
- `./canvas` 与 `./canvas-node` 只负责 Scene 的 Canvas 执行和必要命中能力，不建立平行 scene graph。
- `./hydration` 负责定位、事件绑定和 context/controller 机制，不定义产品级交互状态机。
- `./animation` 负责时间求值、easing、property registry 与执行控制，不拥有动画 authoring DSL 或 Core animation schema。
- `./runtime` 负责 Scene Patch 校验、retained renderer Definition 与 Runtime commit participant，不拥有 Core 编译或 adapter 宿主生命周期。
- 各后端对同一 Scene 能力要么等价实现，要么明确诊断或记录支持边界，不能静默改写语义。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/render exec eslint . --fix
pnpm --filter @retikz/render exec tsc --noEmit
pnpm --filter @retikz/render test:changed
```
