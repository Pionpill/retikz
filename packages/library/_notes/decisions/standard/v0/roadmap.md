# Standard v0 Roadmap

> 图式语义后继：[Graph v0 roadmap](../../../../../schematic/_notes/decisions/graph/v0/roadmap.md) 独立演进；排版布局后继：[Layout v0 roadmap](../../layout/v0/roadmap.md) 独立演进；Standard 只保留跨领域绘图拓展能力

> 更新于 2026-08-11。本文件记录 `@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 的 v0 总体路线。具体 milestone 见对应 `v0.*/roadmap.md`，长期边界见 [`standard-library-design.md`](../../../architecture/standard-library-design.md)。

## 定位

Standard 家族是官方维护、相对 Core 可选安装的跨领域绘图拓展库：通过 Core 公开的 definition / registry / composite 契约，为直接作者和 Plot、Table 等官方 Tier 2 包提供常用绘图实现、简单组合与 JSON-safe 语义组件，并统一 lowering 为 Core IR。

- `@retikz/standard` 拥有宿主无关的 schema、definition / factory、composite 与 lowering
- `@retikz/standard-react` / `@retikz/standard-vanilla` 只负责等价 authoring 与宿主接入
- Standard 拥有的 Tier 2 schema 以 Core composite IR 持久化，是需要供工具链或 LLM 理解与编辑的语义真源；lowering 后的 Kernel IR / Scene 是派生产物，不要求反向推断原始 Standard 语义
- Standard 不拥有 Core IR / Scene、renderer、领域数据模型、图式语义、排版布局、算法布局、自动路由或编辑器状态
- 内置能力与第三方能力复用 Core 的同一公开扩展链路，不建立 Standard 私有 renderer 或全局注册机制

## 路线总览

### v0.1：绘图拓展、Legend 与 Surface

v0.1 建立 Standard 三包的首个完整闭环，覆盖：

- Grid、Axes、Frame 等首批宿主无关 Tier 2 composite
- 按项 Definition 接入、Core compile options 与直接/adapter authoring parity
- alpha.2 曾验证 Flex、GridLayout、Overlay 等排版能力；合并发布前已将其迁入独立 [Layout v0.1](../../layout/v0/v0.1/roadmap.md) owner
- 由 Plot、Table 与直接作者共同消费的通用 Legend 呈现
- 当前 alpha.4 在完成 Layout owner 迁移后，为 Chart canvas、Table panel 与一般面板提供单一任意 child 的 renderer-neutral Surface；完整 Scope、布局和空间透明继续复用 Core / Layout
- React / Vanilla 等价 authoring、JSON-safe 语义输入、Core lowering、诊断、测试与双语文档
- alpha.3 曾验证逻辑图外壳、语义节点、连接与 Callout；这些图式元素现由 [Graph v0](../../../../../schematic/_notes/decisions/graph/v0/roadmap.md) 独立拥有，当前入口统一为 `GraphFrame`、`GraphNode` 与 `GraphConnector`

具体阶段见 [`v0.1 roadmap`](./v0.1/roadmap.md)。

### v0.2：扩展绘图目录

v0.2 根据 v0.1 的真实消费场景评估 Dimension、BraceLabel、Arrow、Shape、Boundary、Pattern、PathGenerator 等绘图拓展。只有去除 Plot、Table、Graph、Flow、Workspace 等领域词汇后仍成立、至少存在两个独立消费场景且能通过公开 Core 契约闭环的能力才进入。Wrap、subgrid、masonry 等排版能力由 Layout 评估；Radial、Tree、Layered、Force 等算法布局由关系图与算法布局 owner 评估。

v0.2 仍不接管完整 GraphModel、拓扑校验、算法布局、自动路由、selection / history / viewport 或 renderer 执行语义。

## 发布组

`@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 使用独立 `standard` release group 并 lockstep 发布。每个 milestone 必须声明所需 Core 能力是否就绪，Standard 不反向改变 Kernel 的发布边界。

Plot、Table 等领域 release group 可以使用兼容版本单向依赖 Standard，不与 Standard lockstep；领域包必须声明可消费版本并显式组合所需 capability，Standard 不反向依赖领域包。

## 参考

- [Standard Drawing Library 设计](../../../architecture/standard-library-design.md)
- [能力完备性与模块边界](../../../../../../notes/architecture/capability-design.md)
- [Core 绘图完备设计](../../../../../kernel/_notes/architecture/core-drawing-complete.md)
- [Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md)

## ADR 约定

ADR 放在 `packages/library/_notes/decisions/standard/`，按 `v0/v0.1/alpha.N/NN-slug.md` 组织。每个 milestone 独立编号；roadmap 可更新，Accepted ADR 只按仓库流程增补状态或 supersede 信息。
