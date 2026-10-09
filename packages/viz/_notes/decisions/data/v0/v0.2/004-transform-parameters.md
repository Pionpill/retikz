---
description: 统一数据变换的 kind/params 声明和参数 schema 组装，保持内置及自定义操作的精确关联
keywords: Data、transform、params、schema、defineTransform
---

# ADR-004：统一变换声明与参数契约

- 状态：Accepted（2026-10-09 用户确认实施计划）
- 决策日期：2026-10-09
- 关联：[roadmap](./roadmap.md) · [001](./001-shared-transforms.md) · [002](./002-transform-execution.md)
- 替代范围：001、002 中关于操作保持扁平配置及 Definition 手写完整操作 schema 的决策；其余语义、所有权和执行边界不变

## 问题与目标

每种变换独立定义完整对象，会重复公共判别结构，并使运行时定义和具体算法参数混在一起。需要共同的可序列化外壳，同时保留每种变换的精确字段、约束及扩展能力。

ECharts 的 [Data Transform](https://echarts.apache.org/handbook/en/concepts/data-transform/) 使用类型与配置分组；Vega 的 [扩展定义](https://vega.github.io/vega/docs/api/extensibility/) 单独描述参数，而作者配置仍可扁平。分组不是通用强制标准；本项目采用参数外壳以统一 Definition 构建并隔离公共字段。

## 决策

Data 拥有统一操作外壳 `{ kind, params }`，kind 仍表示内部变体，不改为 type。params 必填且为 JSON 对象，即使没有参数也写空对象。内置 kind 与对应参数类型保持判别关联，不退化为互不关联的 string 与宽参数联合。

```ts
{ kind: 'sort', params: { field: 'total', order: 'descending' } }
```

每种变换公开命名 ParamsSchema。统一 createTransformSchema(kind, paramsSchema) 组合严格的外壳，保留具体参数的约束、默认值与跨字段检查。内置完整 schema 与自定义 Definition 使用同一组装规则。schema 层不依赖 Definition、registry 或 provider。

运行时 defineTransform 接收 kind、paramsSchema 和原有语义 callbacks，生成含完整 schema 的 Definition。callbacks 与独立 Implementation 继续接收完整操作，从 params 读取算法配置。参数只在解析边界验证，模型不变量、依赖声明、调度与实际计算仍遵循原职责。

开放自定义操作仅开放 params 内的 JSON 配置，外壳不接收任意额外字段；已注册 kind 由其精确 paramsSchema 解析。保留名称冲突和未知 kind 的诊断。外部计算与宿主消费相同操作，不提供独立格式。

## 行为与边界

宿主的 `{ operation, dataExecution }` 声明及覆盖优先级不变。十二种内置变换的算法、缺省行为、行顺序、模型推导、来源传播、全链预检和同步/异步执行选择均不变。参数错误路径位于 params 下。

Reducer、selector、regression 子算子保持现有格式；本次统一的是 transform 外壳，不把所有子协议套入相同对象。Plot、Chart、Table 及适配器复用 Data 契约，不复制 schema。

这是公开 Source IR 与 Definition 作者接口的 breaking 调整。移除扁平操作与手写完整 schema 的 defineTransform 输入，不提供兼容层、别名或自动迁移。
