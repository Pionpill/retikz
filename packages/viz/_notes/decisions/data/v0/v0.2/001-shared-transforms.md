---
description: Data 统一拥有十二种行数据变换的声明、定义、计算与结果模型，Plot 和 Chart 消费同一根入口契约
keywords: Data、transform、stack、bin、normalize、relate、density、smooth、registry
---

# ADR-001：统一数据变换所有权

- 状态：Accepted（2026-10-01 用户批准按计划执行并指定 Data 根入口导出）
- 决策日期：2026-10-01
- 关联：[data v0 roadmap](../roadmap.md) · [Data 设计](../../../../architecture/data-design.md) · [Data 能力边界](../../../../architecture/data-capability-complete.md)
- 替代：[Data v0.1 ADR-002](../v0.1/002-shared-provider-boundary.md) 中的 transform 归属决策及 [Plot v0.1 ADR-102](../../../plot/v0/v0.1/102-plot-transform-registration.md)

> 操作外壳与 Definition 作者接口由 [ADR-004](./004-transform-parameters.md) 替代：统一使用 `{ kind, params }` 和 `kind/paramsSchema` 定义。下文关于保留既有操作配置形态的决策不再适用，其余数据语义和执行职责保持。

## 背景与目标

数据变换的声明与接口契约已由 Data 提供，但部分计算仍由 Plot 定义与注册。调用方因此必须选择宿主 registry，才能处理同一组行数据。字段、统计与结果模型语义应由 Data 统一拥有，绘图用途不决定纯数据算法的归属。

## 决策：Data 拥有全部内置行数据变换

`@retikz/data` 拥有 `sort`、`summarize`、`select`、`annotate`、`stack`、`bin`、`normalize`、`derive-interval`、`relate`、`jitter`、`density`、`smooth` 的 operation schema、类型、Definition、registry、计算和输出模型。公开能力直接从包根导出，不新增 transform 子路径。

内置与自定义变换复用同一 Definition、注册与执行路径。Data 不依赖 Plot、Chart 或 Table。Plot 保留 root/mark-local 数据作用域及数据到视觉图元的映射；Chart 保留 recipe 与 encoding 配置展开；Table 保留表结构和单元格生成。

数据 `jitter` 在数据单位中扰动数值字段。投影后依赖 role scale、位置与 containment 的 position adjustment 属于 Plot。Core 的几何变换也不进入 Data。

## 基础数据结构与公开契约

JSON operation 继续用 `kind` 判别，并保留当前字段配置。运行时 Definition 描述输入字段、输出字段与字段类型变化，以及适用时的 schedule；执行结果仍为行数据及可选 provenance/lineage。

```ts
import { applyTransforms, BuiltinDataTransform, type IRDataTransform } from '@retikz/data';

const operations: Array<IRDataTransform> = [
  {
    kind: BuiltinDataTransform.Summarize,
    groupBy: ['region', 'product'],
    metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
  },
  { kind: BuiltinDataTransform.Stack, x: 'region', y: 'total', groupBy: 'product' },
];
const rows = applyTransforms(sourceRows, operations).rows;
```

`IRDataTransform` 包含全部内置 operation 和经 runtime Definition 验证的扩展配置。各具体类型由 Data schema 派生，使用 `IRDataXxxTransform` 命名。Plot 属性与 adapter 直接引用 Data 类型，不转发旧 Plot 数据变换公共面。

## 行为、失败语义与兼容性

- Data 默认 registry 可直接执行十二种内置 operation；重复注册和未注册的扩展 kind 失败。
- operation 字段、默认输出名、结果顺序、统计方法与缺失值规则保持现状。`stack.groupBy` 仍为系列字段；其他使用数组分组的 operation 保持各自契约。`relate` 的每端 selector 取首个结果，并可生成差值与文本字段。
- apply 按作者声明顺序执行。Chart 可按既有 phase 与 recipe slot 约束展开配置，但不能将此政策施加给任意 Data plan。没有 schedule 的 operation 不因迁移自动获得 Chart derived mapping 能力。
- schema 保持各 operation 现有未知字段与 refinement 行为；内置 kind 不经 external passthrough 绕过其 schema。
- 数据计算错误由 `RetikzDataError` 表达，外部异常保留为 cause；视觉消费错误仍由宿主负责。
- provenance 保持原行与组级来源语义，不将派生结果行号当作源行号。
- 这是公开导出与所有权的 breaking 调整：移除 Plot 的具体 transform 类型、schema、常量和 registry 导出，不提供兼容别名或双轨定义。
- JSON、React 与 Vanilla 消费同一 Data operation。Plot 作者组件和 shortcut 的名称、展开顺序与数据作用域保持现状；不新增 Data framework 包或 Table 作者 API。
- 本决策统一现有计算归属；协议化与第三方执行机制单独设计。
