# @retikz/standard 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供可按需导入与注册的官方常用绘图能力，并让宿主无关的通用 Tier 2 封装统一 lowering 为 Core IR
- **拥有的契约**：官方 definition / factory、通用 composite schema / contract / pipeline、按能力子路径与显式 preset
- **不拥有的能力**：Core IR / registry / compile 契约、renderer、React / Vanilla 生命周期、数据 / 图表 / 表格 / 图关系语义、编辑状态
- **输入与输出**：接收 Standard 的 JSON-safe 输入和公开 Core options，输出公开 Core definition 或 Core IR contribution；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用机制缺口进入 Core / Math；React / Vanilla 接线进入对应 adapter；领域模型进入其主责包；renderer 行为进入 Render

## 源码组织

- Standard 按横向能力组织，`composites/<capability>/` 是 schema、types、definition、factory 与 lowering 的默认 owner
- 能力专有内容留在能力目录；两个及以上 composite 确认复用的稳定契约或纯逻辑才进入 `composites/shared/`
- `composites/shared/` 按职责使用 `schemas/`、`types/` 或语义子域；包内共享但不公开的子域可以有自己的 barrel，但不得进入向上公共 barrel
- 新能力仍需在 ADR 中确认 package metadata、release group、schema、definition / registry、lowering 和文档闭环
