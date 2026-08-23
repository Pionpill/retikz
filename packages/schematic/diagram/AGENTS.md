# @retikz/diagram 工作指南

本文件覆盖 `packages/schematic/diagram/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram` 解决 Graph 关系数据如何按图示布局规则自动排列的问题。它单向消费 `@retikz/graph`，长期拥有 Diagram 布局意图、约束确定化、provider 编排、自动 routing 与以 Graph identity 对齐的几何结果。

本包不拥有 Graph 节点、关系、分组、presentation 或 Theme 契约，也不拥有 Editor 状态、renderer、DOM 或框架生命周期。Graph 当前没有端口契约；后续通用 endpoint / 局部连接点能力必须先由独立设计冻结。移除 Schematic 领域词汇后仍成立且被多个领域复用的算法或几何能力应进入对应 Kernel / Library owner。

## 输入与输出

长期输入是 Graph 的 Canonical 数据与 JSON-safe Diagram 布局意图，长期输出是 renderer-neutral 的 Diagram 布局几何。具体 Source IR、Canonical、Definition、provider、失败语义与 lowering 契约必须由 Diagram roadmap / ADR 确认后建立。

当前包仅完成发布与构建初始化，公共根导出保持为空；不得在设计确认前添加占位 schema、类型、provider、算法或 fallback。

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开能力建立后还必须验证 direct IR、React、Vanilla、Graph identity 对齐、renderer-neutral 结果及双语文档。
