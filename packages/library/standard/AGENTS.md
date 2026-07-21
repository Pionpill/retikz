# @retikz/standard 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供可按需导入与注册的官方常用绘图能力，并让宿主无关的通用 Tier 2 封装统一 lowering 为 Core IR
- **拥有的契约**：官方 definition / factory、通用 composite schema / contract / pipeline、按能力子路径与显式 preset
- **不拥有的能力**：Core IR / registry / compile 契约、renderer、React / Vanilla 生命周期、数据 / 图表 / 表格 / 图关系语义、编辑状态
- **输入与输出**：接收 Standard 的 JSON-safe 输入和公开 Core options，输出公开 Core definition 或 Core IR contribution；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用机制缺口进入 Core / Math；React / Vanilla 接线进入对应 adapter；领域模型进入其主责包；renderer 行为进入 Render

## 当前状态

当前目录只建立包职责边界，尚未初始化 npm package、源码、公开 API 或测试。首个能力 ADR 必须确认 package metadata、release group、schema、definition / registry 路径、lowering 和文档闭环。
