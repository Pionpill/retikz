# @retikz/chart 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把封闭的 Chart 类型配方确定性解析为完整 PlotSpec，并把可选 presentation 映射为 Standard Flex 输入，同时提供可诊断的 resolution inspection
- **拥有的契约**：Chart shared / presentation schema fragments、封闭 recipe 协议、Chart 到 Plot 的 merge / validation、presentation 到 Standard 输入的映射、inspection 和逐类型 composite definition
- **不拥有的能力**：Data 算法、Plot schema / lowering / registry、Standard layout、Core compile、renderer、框架 authoring、跨 adapter definition 聚合
- **输入与输出**：接收 JSON-safe Chart variant 输入，输出完整 PlotSpec、裸 Plot 或 Standard Flex content、Chart identity node 与 inspection；不直接输出 Core primitives、Scene、DOM、SVG 或 Canvas
- **缺口流向**：数据能力下沉 `@retikz/data`；可视化 operation 与 lowering 进入 `@retikz/plot`；通用布局进入 `@retikz/standard`；composite / adapter 聚合与 identity 进入 Kernel owner；React / Vanilla authoring 进入对应 adapter

## 分层

```text
schemas/    Chart IR fragments 与 inspection schema
providers/  静态内建 recipe 及其 invariant
pipeline/   recipe dispatch、merge、validation、inspection 与 composite 编排
```

- `schemas` 不依赖 providers / pipeline
- `providers` 只依赖 schemas 与下层公开数据类型，不依赖 pipeline
- `pipeline` 只消费 providers 结果，不复制 recipe 或 Plot lowering
- 包根只导出明确允许公开的 shared / presentation / inspection data symbols，私有 fixture、recipe 与 pipeline 不得泄漏
