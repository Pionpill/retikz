# @retikz/table 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把结构化数据或显式内容组织为具有行、列、Cell 和语义区域的二维表格，并确定性地 lowering 为 Core IR
- **拥有的契约**：Table IR / schema、表格结构与操作、Cell 语义、framework-neutral authoring normalization、adapter-shared runtime contribution、formatter / presentation / visual encoding definitions、rule、闭合 style token vocabulary 与 preset、Legend descriptor 与领域解析、表格约束布局与内容 fit / overflow、后续大表 window / viewport 计算、lowering、manifest / lineage / locator / diagnostics
- **不拥有的能力**：通用数据 transform / statistics、跨领域 Legend 视觉结构 / 内部布局 / lowering、Table body 与 Legend / title / description / caption / source 等外围内容之间的通用 Box Layout、Core IR / Scene 与通用测量、Plot 语义及跨 Plot Cell 的 scale / axis / guide 协调、renderer、React / Vanilla authoring、单元格编辑或电子表格计算
- **输入与输出**：接收 Table IR、external datasets、Table definitions 与 compile options，输出 Core IR contribution 与可追溯附属信息；当前 visual scale 可额外产生 Legend descriptor seed，后续经 JSON-safe body composition boundary 向 Standard 交接通用绘图输入，不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用数据能力进入 `@retikz/data`；通用机制、几何和测量进入 core / math；被多个领域复用的绘图 composite 进入 `@retikz/standard`；宿主 authoring、滚动容器与 viewport 生命周期进入对应 adapter；服务端分页 / 异步缓存状态留在宿主；编辑和电子表格计算不进入 Table 家族

新增或迁移能力前，先按 [`table-visualization-complete.md`](../_notes/architecture/table-visualization-complete.md) 判断领域归属，并以 [`table-design.md`](../_notes/architecture/table-design.md) 作为总体设计坐标。具体 IR、Definition 和算法必须由后续 ADR 冻结，不能仅凭本文件直接实现。

## 计划分层

```text
shared/       无依赖共享词汇、地址 / selector / track 等纯类型与 helper
schemas/      Zod schema 与 Table IR 类型真源
contract/     model、structure、operation、formatter、presentation 与追溯契约
providers/    内置 definition、registry resolver、style preset 与 token 解析
pipeline/     数据接入、结构规范化、呈现、布局、lowering 与 locator 编排
```

- 依赖方向为 `shared ← schemas ← contract ← providers ← pipeline`
- `SemanticTableModel` 是长期公开扩展边界，但具体形状与写入协议由 ADR 决定
- 具有算法 dispatch 的内置与自定义能力必须经过同一 Definition / registry，不写内置白名单分支
- 闭合 style token 不建立 Definition / registry；内置 preset 与用户 overlay 必须经过同一 strict schema、leaf resolver 与消费链路，未知 token fail-loud
- Cell 是 Table 的语义与布局槽位，内容统一使用 Core `IRChild`，不建立平行内容 IR
- 显式 Plot 等 Tier 2 Cell 走通用 `IRChild` 测量、放置和 composite lowering；不得在 Table 中按 namespace 特判
- Table 可以消费 Data、Standard 与 Core，但不得依赖 Plot、React、DOM 或 renderer；当前 visual encoding 只产生 Legend descriptor 与 manifest seed，领域 placement intent 与 lineage 仍由 Table 解析；Standard Legend / Flex 公共能力已存在，但 Table body composition 与 occurrence-safe artifact join 尚未接入，禁止建立 Table 私有停靠、文字布局或 bounds-union solver
- 通用 `IRChild` 测量缺口优先补 Core，不在 Table 内建立私有 bbox 系统
- 虚拟滚动等大表展示能力必须复用 Table layout / manifest；核心只拥有 window 计算，瞬时滚动状态和 DOM 生命周期留在 adapter

改变目录分层、依赖方向或 define-registry 能力前，先按根 AGENTS 读取 `standard-structure` 及对应层级 skill。

## 当前状态

`0.1.0-alpha.3` 当前在 alpha.2 二维约束布局基线上实现 formatter / presentation、selector / rule、条件视觉 encoding、四种 style preset、闭合 style tokens 与同次 resolution 的 Legend descriptor / manifest seed。Standard Legend / Flex 本体已可从公共入口消费；Table body 的 JSON-safe composition boundary、外围 composition、occurrence-safe artifact join 及最终 adapter / SSR / docs 闭环仍未完成。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/table exec eslint . --fix
pnpm --filter @retikz/table exec tsc --noEmit
pnpm --filter @retikz/table test:changed
```
