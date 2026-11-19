---
description: '字段、变换与格式化不只服务 Plot。'
keywords: 'IRDataModel、IRDataTransformDeclaration、数据模型与公开声明、model、plot、TransformOperation、data、provider、sort、summarize、select、annotate'
---

# 数据模型与公开声明

## 设计目的

字段、变换与格式化不只服务 Plot。这里按输入和输出划分 Data 的职责，使 Table 等宿主能复用数据运算，而不必引入坐标、图例或图元依赖。

## 决策

`IRDataModel` 描述数据模型；`IRDataTransformDeclaration` 描述要执行的变换，不持有执行函数。

通用数据层从 Plot 独立出来，使 Table 等宿主能复用字段解析、格式、统计与行来源，而不必引入坐标、图元或渲染依赖。数据引用与变换声明可序列化；实际数据和执行实现由宿主在运行时提供。Plot 只组合这些结果，不重新导出 Data 的公共 API。

Data 的边界按操作的输入和输出来定：如果只读写数据行、字段模型及来源，就不因首个调用方是 Plot 而变成绘图能力。坐标投影、图元选型和图例不属于 Data。

Data 持有的可序列化声明使用 IRData 前缀并从 schema 派生；外部数据行、运行时数据集、Definition 和执行上下文不是持久化 IR，不跟随该命名。Plot 只为自己拥有的声明命名。

## 历史记录

- Data v0.1：抽离通用数据能力，区分持久化声明与执行协议（ADR-001、ADR-002、ADR-003）。
