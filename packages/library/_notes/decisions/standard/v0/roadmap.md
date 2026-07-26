# Standard v0 Roadmap

> 更新于 2026-07-26。本文件记录 `@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 的 v0 总体路线。具体 milestone 见对应 `v0.*/roadmap.md`，长期边界见 [`standard-library-design.md`](../../../architecture/standard-library-design.md)。

## 定位

Standard 家族是官方维护、可选安装的跨领域绘图能力库：通过 Core 公开的 definition / registry / composite 契约提供常用绘图实现、通用布局积木与 JSON-safe 语义组件，并统一 lowering 为 Core IR。

- `@retikz/standard` 拥有宿主无关的 schema、definition / factory、composite、capability module 与 lowering
- `@retikz/standard-react` / `@retikz/standard-vanilla` 只负责等价 authoring 与宿主接入
- Standard 拥有的 Tier 2 schema 以 Core composite IR 持久化，是需要供工具链或 LLM 理解与编辑的语义真源；lowering 后的 Kernel IR / Scene 是派生产物，不要求反向推断原始 Standard 语义
- Standard 不拥有 Core IR / Scene、renderer、领域数据模型、完整逻辑关系图、算法布局、自动路由或编辑器状态
- 内置能力与第三方能力复用 Core 的同一公开扩展链路，不建立 Standard 私有 renderer 或全局注册机制

## 路线总览

### v0.1：标准绘图积木与语义逻辑组件

v0.1 建立 Standard 三包的首个完整闭环，覆盖：

- Grid、Axes、Frame 等首批宿主无关 Tier 2 composite
- capability module、不可变 bundle、按需与全量 preset
- Stack、Align / Distribute 等不理解领域模型的通用布局 composite
- `Stage`、`Decision`、`Terminal`、`Junction` 等逻辑节点语义
- `Connector`、`Callout` 等结构化关系与注释语义
- React / Vanilla 等价 authoring、JSON-safe 语义输入、Core lowering、诊断、测试与双语文档

具体阶段见 [`v0.1 roadmap`](./v0.1/roadmap.md)。

### v0.2：扩展布局与绘图目录

v0.2 根据 v0.1 的真实消费场景评估 `GridLayout`、`Wrap`、`RadialLayout`、Dimension / BraceLabel 等扩展。只有去除 Plot、Table、Graph、Flow、Workspace 等领域词汇后仍成立、至少存在两个独立消费场景且能通过公开 Core 契约闭环的能力才进入。

v0.2 仍不接管完整 GraphModel、拓扑校验、算法布局、自动路由、selection / history / viewport 或 renderer 执行语义。

## 发布组

`@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 使用独立 `standard` release group 并 lockstep 发布。每个 milestone 必须声明所需 Core 能力是否就绪，Standard 不反向改变 Kernel 的发布边界。

## 参考

- [Standard Drawing Library 设计](../../../architecture/standard-library-design.md)
- [能力完备性与模块边界](../../../../../../notes/architecture/capability-design.md)
- [Core 绘图完备设计](../../../../../kernel/_notes/architecture/core-drawing-complete.md)
- [逻辑制图能力域设计](../../../../../../notes/architecture/logical-diagram-design.md)

## ADR 约定

ADR 放在 `packages/library/_notes/decisions/standard/`，按 `v0/v0.1/alpha.N/NN-slug.md` 组织。每个 milestone 独立编号；roadmap 可更新，Accepted ADR 只按仓库流程增补状态或 supersede 信息。
