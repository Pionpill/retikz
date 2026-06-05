# ADR-02：`@retikz/canvas` Canvas 2D renderer + `@retikz/react` 的 `renderer="canvas"` 渲染模式

- 状态：Accepted（已实现；**超出首版 MVP**：首版列为「降级 + 警告」的 gradient / pattern / image / clip / marker 已全部转为真实 Canvas 实现，另含 currentColor 解析 + 主题响应 + 文本基线统一 + 弧扫描方向 + 尺寸对齐 SVG）
- 决策日期：2026-05-29
- 关联：[v0.3 roadmap §Canvas 包首版范围 / §React API 方向](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)（并列 renderer + react 接 svg）· [core-design.md §5 / §6](../../../../../architecture/core-design.md)

> **打包变更（[ADR-05](./05-renderer-repackage.md)）**：`@retikz/canvas` 已并入 `@retikz/render`、以子路径 **`@retikz/render/canvas`** 发布；下文 `@retikz/canvas` ≡ `@retikz/render/canvas`、`packages/canvas/` ≡ `render/src/canvas/`，**渲染设计与决策不变**。
>
> **范围**：覆盖 **Canvas renderer 端到端 + `@retikz/react` 经 `<Layout renderer="canvas">` 渲染 Canvas**。与 ADR-01（react 接 svg）对称：每条 renderer ADR 各自包含对 react 渲染层的接入。

## 背景

ADR-01 把「Scene → SVG」抽成 `@retikz/svg`（走 `SvgNode` descriptor）。Canvas 是**第二条 renderer 路径**，价值在验证「同一份 Scene 能否同时服务声明式（SVG 产树）与命令式（Canvas 发命令）两种范式」。

roadmap 定的硬基调：**Canvas 不走 SVG 中转；SVG 与 Canvas 并列、共享上游 Scene，而非父子**；**默认 `<Layout>` 仍渲染 SVG**（降迁移成本），新增 `renderer="canvas"` 用同一套 Kernel / Sugar JSX 构 IR、只在最终 Scene 渲染阶段切换输出目标。

关键差异决定 canvas 包形态与 svg 完全不同：SVG 声明式（产 descriptor → DOM / 字符串，可比对 / 序列化 / 水合）；Canvas 2D 命令式（对 `CanvasRenderingContext2D` 顺序调 `fill` / `stroke` / `save` / `restore`）。所以 **Canvas 不产 `SvgNode` descriptor、无中间树**——遍历 Scene 直接发绘制命令。

## 决策：无状态 `(ctx, scene)` 绘制 + react `renderer` prop 切换

- `@retikz/canvas` **不持画布、不 compile、不持状态**，消费**已编译 Scene**（与 svg 对称，`compile` 留 core / runtime）：`drawScene(ctx, scene, options?)` 命令式画到 2D context；`renderToCanvas(canvas, scene, options?)` 便利封装（取 ctx + DPR / viewBox transform + clear，再 drawScene）。
- react canvas 路与 svg 路**共用同一 `compileToScene` + 同一 `browserMeasurer`** → 产**同一份 Scene** → 两 renderer 天然等价（多 renderer 验证的核心）；react 只在「拿到 Scene 之后」分叉：svg 走 `buildSvgDocument`，canvas 走 `renderToCanvas`。
- react 用 `renderer` prop（非新增 `<SvgLayout>` / `<CanvasLayout>` 并列组件），现有用户零改动、canvas 是 opt-in additive。

理由：① 与 ADR-01 对称——renderer 消费已编译 Scene、纯函数无状态，react 两条路共用 compile + measurer，同 Scene 才有真等价；② 贴合 Canvas 2D 命令式本质，与 svg descriptor 刻意对照；③ 默认 svg、`renderer` 切换最小侵入、API 面更小。

### 被否决的选项

- **B：canvas 包接收 IR、自己 compile + 绘制** —— `compileToScene` + measurer 进 canvas 包，与 svg 不对称、复制 compile 责任，且 react 与 canvas 两处 compile 难保 Scene 一致。
- **C：有状态 `CanvasRenderer` 对象** —— 为后续 dirty-rect / layer 预留载体，但首版即引入状态，违背「renderer 无状态」边界（ADR-01 同立）。增量 / 对象式留 v0.4+。

### 首版绘制范围与降级原则

首版 `drawScene` 必须真实绘制核心集（`rect` / `ellipse` / `path` / `text` / `group` + group transform / opacity / 纯色 stroke·fill / dashPattern / line cap·join / fill-rule）。高级能力（gradient / pattern / image paint、clip、marker / arrow）首版走**「明确可诊断降级」**：未实现则降级为退纯色 / 不绘制 + **dev 警告**（不静默）——**不允许「调用成功但静默不画」**。（落地时这些已全部转为真实实现，见状态行。）

## 不在本 ADR 范围

- Node canvas / `@napi-rs/canvas` 服务端 Canvas 导出 → beta.1 / 单独入口。
- 新增 `<SvgLayout>` / `<CanvasLayout>` 显式组件 → 暂只用 `renderer` prop；如需另议。
- `@retikz/vanilla` 的 `mountCanvas`、跨包依赖图、canvas 是否 optional peer → **[ADR-03](./03-vanilla-runtime-and-dependency-graph.md)**（依赖方向在此收口）。
- layer canvas / dirty rect / 增量渲染 → v0.4+；Canvas 事件 / 水合（canvas 无 DOM 图元，走 hit-test）→ alpha.3（hydration ADR）。

---

> **实现指针**：level `red`（新建包公开 API 表面；同时动 react kernel + `Layout` 公开 prop）、非 breaking（canvas 包纯新增；react `renderer` 默认 svg、additive）。`@retikz/canvas` 不动 core、**明确不依赖 `@retikz/svg`**（Canvas 并列、不走 SVG 中转），运行时依赖仅 `@retikz/core`。真源以代码为准——`drawScene` / `renderToCanvas` / `DrawOptions` / `RenderOptions`（`render/src/canvas/{drawScene,renderToCanvas,types}.ts`）、react `Layout` 的 `renderer?: 'svg' | 'canvas'` + canvas 分支（`react/src/kernel/Layout.tsx`）+ `<canvas>` 宿主（`react/src/render/canvasHost.tsx`，effect 调 `renderToCanvas`，复用 `browser-measurer` 保两 renderer Scene 一致）。canvas 包 tsconfig 开 `lib: ESNext+DOM`。测试在 `render/tests/`（draw / render / degrade）+ react `tests/`（canvas 模式挂载 + 默认 svg 不回归 + 双路同 Scene + 架构守卫不依赖 svg）。完整施工契约（文件 scope / 测试象限 9 case / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `05ed13c2`；压缩前完整施工蓝图 = `git show 05ed13c2^:notes/decisions/core/v0/v0.3/v0.3-alpha.1/02-canvas-renderer-and-react-canvas-mode.md`。
