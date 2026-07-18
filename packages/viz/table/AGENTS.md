# @retikz/table 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把结构化数据或显式内容组织为具有行、列、Cell 和语义区域的二维表格，并确定性地 lowering 为 Core IR
- **拥有的契约**：Table IR / schema、表格结构与操作、Cell 语义、formatter / presentation / rule / theme definitions、表格约束布局、lowering、manifest / lineage / locator / diagnostics
- **不拥有的能力**：通用数据 transform / statistics、Core IR / Scene 与通用测量、Plot 语义、renderer、React / Vanilla authoring、data grid 交互或电子表格计算
- **输入与输出**：接收 Table IR、external datasets、Table definitions 与 compile options，输出 Core IR contribution 与可追溯附属信息；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用数据能力进入 `@retikz/data`；通用图形、几何和测量进入 core / math；宿主 authoring 与 runtime 进入对应 adapter；编辑、虚拟滚动和 UI 状态留在独立 data-grid 宿主

新增或迁移能力前，先按 [`table-visualization-complete.md`](../_notes/architecture/table-visualization-complete.md) 判断领域归属，并以 [`table-design.md`](../_notes/architecture/table-design.md) 作为总体设计坐标。具体 IR、Definition 和算法必须由后续 ADR 冻结，不能仅凭本文件直接实现。

## 计划分层

```text
shared/       无依赖共享词汇、地址 / selector / track 等纯类型与 helper
schemas/      Zod schema 与 Table IR 类型真源
contract/     model、structure、operation、formatter、presentation、theme 与追溯契约
providers/    内置 definition、registry resolver 与 theme 解析
pipeline/     数据接入、结构规范化、呈现、布局、lowering 与 locator 编排
```

- 依赖方向为 `shared ← schemas ← contract ← providers ← pipeline`
- `SemanticTableModel` 是长期公开扩展边界，但具体形状与写入协议由 ADR 决定
- 内置与自定义能力必须经过同一 Definition / registry，不写内置白名单分支
- Cell 是 Table 的语义与布局槽位，内容统一使用 Core `IRChild`，不建立平行内容 IR
- Table 可以消费 Data 与 Core，但不得依赖 Plot、React、DOM 或 renderer
- 通用 `IRChild` 测量缺口优先补 Core，不在 Table 内建立私有 bbox 系统

改变目录分层、依赖方向或 define-registry 能力前，先按根 AGENTS 读取 `standard-structure` 及对应层级 skill。

## 当前状态

当前目录只建立包职责边界，尚未初始化 npm package、源码、公开 API 或测试。正式实现必须先完成对应 ADR 与 roadmap 范围确认。
