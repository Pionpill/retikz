---
description: '通用数据层从 Plot 独立出来，使 Table 等宿主能复用字段解析、格式、统计与行来源，而不必引入坐标、图元或渲染依赖'
keywords: 'plot、TransformOperation'
---

# ADR-001：从 plot 迁出通用数据层

- 状态：Partially Superseded
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md)、[plot beta.1 适配 ADR](../../../plot/v0/v0.1/101-data-package-adapter.md)
- 后续决策：[data v0.2/001](../v0.2/001-shared-transforms.md)、[data v0.2/002](../v0.2/002-transform-execution.md)

## 保留的决策

通用数据层从 Plot 独立出来，使 Table 等宿主能复用字段解析、格式、统计与行来源，而不必引入坐标、图元或渲染依赖。数据引用与变换声明可序列化；实际数据和执行实现由宿主在运行时提供。Plot 只组合这些结果，不重新导出 Data 的公共 API。

## 修订边界

最初按 Plot 用例区分的 transform 集合不再决定所有权。通用操作定义归 Data，执行实现与操作声明分离。
