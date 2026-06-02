# ADR-02：Tier 2 延后项——`<Composite>` JSX authoring 通道 + expand 上下文 + lowering 缓存

- 状态：Proposed（未排期；从 [ADR-01](./01-tier2-support.md) 收窄时拆出）
- 决策日期：2026-06-02
- 关联：[ADR-01 Tier 2 支撑](./01-tier2-support.md) · [v0.3 roadmap §alpha.2](../roadmap.md) · [core-design.md §4.3 Tier 2](../../../../../architecture/core-design.md)

> [ADR-01](./01-tier2-support.md) 把 Tier 2 支撑**收窄**为「core 基础设施 + fixture 验证 + react/vanilla 透传」。本 ADR 收纳被刻意延后的三项，记录其设计方向与触发条件，避免散落丢失。三项互相独立、可分别排期。

## 背景

ADR-01 落地后，Tier 2 节点的最小闭环是：`compileToScene({ composites })` 据注册表把 IR 里的 composite 节点展开成 Tier 1。本轮 Tier 2 节点经 `<Layout ir={…}>` 直喂 / AI 生成 / 测试 fixture 进入；`expand` 是纯 `(node) => tier1` 函数；展开每次重算。

以下三项是「能用」之上的「好用 / 更快」，ADR-01 决定先不做：

## 延后项 1：React `<Composite>` JSX authoring 通道

### 动机

本轮 React 用户只能 `<Layout ir={…}>` 直喂含 Tier 2 的 IR，不能用 JSX 直接写。plot 接入 React 后需要让用户写 `<Axis …/>` 这类组件。

### 初步方案（上轮讨论结论：显式声明组件优于隐式标记）

- 新增 Kernel 级 `<Composite namespace kind props children>` 组件（`_displayNames` 加 `TIKZ_COMPOSITE`）。
- `builder.ts` 的 `readSceneChildren` 加 `TIKZ_COMPOSITE` 分支 → 产 `IRComposite`（**只声明、不展开**，children 递归走 Tier 1 / 嵌套 composite）。
- domain Tier 2 组件（如 plot `<Axis>`）是薄壳：内部渲染 `<Composite namespace="plot" kind="axis" props={…}>`，经现有「未知函数组件 Sugar fallback」调一次落到通道。
- **硬约束**：Tier 2 组件必须渲染 `<Composite>`、不可直接吐 `<Node>/<Path>`——否则被 Sugar fallback 当场展平、丢高层语义（即 ADR-01「选项 C」否决的情形）；薄壳不能用 hooks（与 Sugar 同约束）。

### 为何延后

`<Composite>` 是 authoring 便利，不是 Tier 2 的本质；plot 的 React API 形态未定，等 plot 接入时一起设计更准。展开始终在 core，本项不改变这一点。

### 触发条件

`@retikz/plot` 开始做 React DSL 时。

## 延后项 2：`expand` 上下文 `CompositeContext`

### 动机

ADR-01 的 `expand` 是纯 `(node) => IRChild | IRChild[]`。某些 domain 展开可能需要：`onWarn`（可诊断警告而非 throw）、递归展开入口（手动展开子树）、只读 compile options。

### 初步方案

`expand: (node, ctx?: CompositeContext) => …`，`CompositeContext` 最小集：`{ onWarn, expand: 递归器, options: 只读 }`，**不给几何 / layout**（expand 保持纯结构变换，定位仍靠 anchor / coordinate 字符串引用）。新增 ctx 参数是 additive，不破坏现有纯函数签名。

### 为何延后

YAGNI——示例 fixture 与早期 plot type 用纯函数足够；过早加 ctx 会固化一个可能不对的边界。

### 触发条件

出现一个 expand 确实需要 onWarn / 递归器 / options 的真实 composite。

## 延后项 3：lowering 缓存 / memo

### 动机

`expand`（plot 的 auto-tick / 布局）可能较重；props 没变时重复展开浪费。React 已对 `compileToScene` 按 `ir` 引用 memo（`Layout.tsx`），但没有 per-composite 粒度的展开缓存。

### 初步方案

`lowerComposites` 对每个 `IRComposite` 按内容 hash / 引用缓存 `expand` 结果。前提（ADR-01 已预留）：`props` 可序列化 / 可哈希、`expand` 纯函数。缓存放 **core 一处**、所有 runtime 共享——不下放各框架（见 ADR-01「选项 C」）。

### 为何延后

先正确、再快；缓存是纯优化，不改契约。且与未来 progressive / 增量渲染（roadmap §AI 增量，v0.4+）同向，宜一起设计 dirty-check 粒度。

### 触发条件

实测展开成为渲染瓶颈，或开始做 progressive 渲染。

## 不在本 ADR 范围

- ADR-01 已交付的 core 基础设施（composite 节点 + `lowerComposites` + 注册表 + 透传）。
- `@retikz/plot` 本体 / 具体 Tier 2 type。
- progressive / layer canvas 渲染协议本身（v0.4+）。

## 实现契约

> 三项均未排期，实现契约待各自开工时按 `_template.md` 补全（Level / Schema 改动 / 文件 scope / 测试象限）。预判：延后项 1 = yellow（动 `packages/core/react/src/kernel/**`）；延后项 2 = red（动 `compile/**` 的 `expand` 签名）；延后项 3 = red（动 `compile/lowerComposites.ts`）。
