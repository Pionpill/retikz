---
description: Chart Vanilla 统一使用可组合的 InputEmbed 编写节点与逐图类 adapter
keywords: 'Chart、Vanilla、InputEmbed、React、SSR'
---

# ADR-016：Chart Vanilla 标准 InputEmbed 编写契约

- 状态：Accepted（2026-09-27 用户批准统一 Vanilla API）
- 关联：[009](./009-family-recipe-chart-schema.md)、[012](./012-chart-react-declaration-authoring.md)

## 背景与目标

Chart 曾以 createXxxChart 返回 Source、runtime input 和 contribution 的封装结果。Standard、Graph 与 Diagram 的 Vanilla 编写入口则返回标准 InputEmbed，可直接组合进 Scene。Chart 不需要独立的编写结果协议；迁移沿用已有 Vanilla traversal、provider aggregation 和 renderer。

## 编写与规范化

Point family 从 `/point` 导出 scatterChart、bubbleChart、connectedScatterChart、rangedDotChart、regressionChart、stripChart。每个入口接收精确 XxxChartInputEmbedProps，返回 InputEmbed；props 保留原始 typed input，显式 id 同时作为 embed 身份。不在 builder 阶段解析 recipe、安装 provider 或执行 compile。

各图类拥有对应 XxxChartInputEmbedAdapter。kind 区分具体图类，例如 chart.scatter；它是运行时编写协议，不改变持久化 Source 的 namespace、type 或 recipe.chartType。adapter 调用精确 normalizer，拆分 runtime datasets 与 JSON Source，并组装当前图类及 Plot provider contribution。包根不导入所有 family、不提供全局 chartType 路由。已有 Core provider 合并契约负责一个 Scene 中多个图类的组合。

normalizeXxxChart 继续接收精确 JSON Source 编写输入并返回对应 IRXxxChart。运行时 rows、Definitions、函数与 provider 不进入 Source。React 根配置和声明 children 仍映射到同一 Vanilla input，再复用对应 adapter；IR shape、recipe、Plot extension、主题解析和 padding 语义不变。

## 场景组合与渲染

InputEmbed 可直接放入 Vanilla scene.children，处理调用显式提供所用图类的 adapters。缺失 adapter 由通用 Vanilla 边界诊断。组合场景的 viewport、Core theme 和 Core themeStyles 由宿主 Scene 与处理选项控制。

renderChart 保留为独立图表便捷入口，接收标准 InputEmbed 和显式 adapters，复用 scene、toSceneResult 和 renderToSvgString。返回 svg 与同一次编译的 compileResult，不建立第二条执行链。独立编写输入的 host theme/styles 仍由该便捷入口传递；组合时由宿主显式配置。

## Breaking 与失败语义

移除 createXxxChart、CreateXxxChartInput、ChartAuthoringResult 和根级通用 ChartInputEmbedAdapter，不提供兼容别名。builder 名称与其他 Vanilla 组件一致。Source IR 保持不变，输入语义与错误归属保持在现有 owner；规范化与领域检查在处理阶段发生。React 缺数据、缺映射和重复声明的结构错误仍在 React 边界报告。
