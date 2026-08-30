# @retikz/diagram 工作指南

本文件覆盖 `packages/schematic/diagram/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram` 解决完整图示如何装配，以及 Graph 关系数据如何按图示布局规则自动排列的问题。它单向消费 `@retikz/graph`，长期拥有 Diagram Presentation / Frame / Drawing Core 的区域装配语义、Diagram 专属 Theme 与 appearance、布局意图、约束确定化、provider 编排、自动 routing 及以 Graph identity 对齐的几何结果。

本包不拥有 Graph 的 Group / Block / Entity / Relation、Graph Theme 或 identity，也不复制 Core Text / Theme、Layout、Standard Surface / Legend、Scene 或 renderer 契约。它也不拥有 Editor 状态、DOM 或框架生命周期。Graph 当前没有端口契约；后续通用 endpoint / 局部连接点能力必须先由独立设计冻结。移除 Schematic 领域词汇后仍成立且被多个领域复用的算法或几何能力应进入对应 Kernel / Library owner。

## 输入与输出

长期输入是 JSON-safe Diagram Presentation / Frame / Drawing Core Source、Graph 的 Canonical 数据与 Diagram 布局意图，长期输出是完整 renderer-neutral Scene 所需的区域装配与 Diagram 布局几何。具体 Source IR、Canonical、Definition、provider、失败语义与 lowering 契约必须由 Diagram roadmap / ADR 确认后建立。

当前 alpha.1 已在包内建立 Presentation / Frame / Diagram Theme 与固定区域装配 Foundation，后续继续完成 FlowDiagram MVP；具体 Flow root 建立前公共根导出保持为空。Drawing Core、可实例化 Diagram root、adapter 与正式文档必须在各自设计确认后再建立，不得添加占位 schema、类型、provider、算法或 fallback。

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开能力建立后还必须验证 direct IR、React、Vanilla、Graph identity 对齐、renderer-neutral 结果及双语文档。
