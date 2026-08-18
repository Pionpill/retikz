# ADR-01：`<Layout>` 顶层支持 Scope 级联样式（隐式根 Scope）

- 状态：Accepted（已实现）
- 决策日期：2026-05-31
- 落地日期：2026-06-01
- 关联：[v0 roadmap](../../roadmap.md)（**本 ADR 是对其"beta 不开新功能 ADR"的有意破例**）· `<Scope>`（复用其级联语义）

该 ADR 记录的是已确认的公开增量能力；流程判断不属于长期决策内容

## 背景 / 约束

顶层容器 `<Layout>` 原先只承担渲染容器（`width` / `height` / `viewBox` / `className` / `style`）、编译选项（`shapes` / `arrows` / `patterns` / `pathGenerators` / `nodeDistance`）、数据入口（`ir` / `children`）三类职责，**不带任何级联样式**。要给整张图设默认样式（统一字体 / `stroke` / path 端点 / 边标注字号），唯一办法是在 `<Layout>` 里手写一层 `<Scope>` 包住全部 children。

塑造决策的痛点：

1. **样板重复**：几乎每张要统一样式的图都重复这套两层嵌套（文档站 ohms-law-circuit / karl-circle 等 demo 都被迫多套一层根 `<Scope>`）。
2. **挂载点不直观**：新手和 LLM 会先猜 `<Layout nodeDefault={...}>`，发现不支持后才知道要插一层 `<Scope>`。
3. **与 TikZ 习惯不符**：TikZ 顶层 `tikzpicture` 本身就接 `[every node/.style=..., color=...]` 等全图选项。retikz 的 `<Layout>` ≈ `tikzpicture`，理应同样能接全图样式默认。

## 决策：A（Layout 注入隐式根 Scope）

`LayoutProps` 新增与 `<Scope>` 同名的**级联样式 props 子集**；Layout 内部在至少一个样式 prop 非 `undefined` 时，把 children 包进一个合成的 `<Scope>` 再交给 `buildIR`——编译产物即"用户手写一层根 `<Scope>`"的同一标准 `IRScope` IR。**零 core / IR schema / compile 改动**。

理由：

1. **复用 `IRScope`，不重复 schema**——根样式与 scope 样式本就是同一组通道，否决方案 B 的字段重复违"不重复 schema"惯例。
2. **yellow 而非 red**——改动只落 ，不动 core IR / compile，blast radius 最小。
3. **round-trip 稳定**——编译出的 IR 是标准 `IRScope` 节点，`unbuilder` 已支持反推，无需新增反向逻辑。
4. **AI 友好**——`<Layout nodeDefault={...}>` 与手写 `<Layout><Scope nodeDefault={...}>` 编译出完全一致的 IR；LLM 不需学一套"根专用样式字段"。

设计细节（具体决策）：

- **只暴露级联样式子集**：`color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` + `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`。**不**暴露 `transforms` / `clip` / `zIndex` / `id` / `localNamespace` / `resetStyle`（这些是 scope 作为分组 / 命名空间 / 局部变换的语义，挂根容器上要么无意义、要么语义易混）。
- **与 `ir` prop 并用**：传 `ir`（完整 IR）时同时给样式 props → dev warn + 忽略样式 props（`ir` 已是完整 IR，再叠根 scope 语义不清）。
- **仅按需包 scope**：无任一样式 prop 时保持 `buildIR(children)` 原样、不包空 scope，避免无谓改变 IR 形态与 round-trip。
- **props 类型抽共享**：样式 props 抽成共享类型，`ScopeProps` 与 `LayoutProps` 复用，避免两处漂移。

## 长期边界

- **Layout 暴露 `transforms` / `clip`**（全图变换 / 裁剪）：根容器层语义另议，推后单独评估。
- **重写现有示例去掉根 `<Scope>`**：document 阶段按需做，不在实现 scope 内。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非破坏；其余默认行为、失败语义与公开契约以正文为准。
