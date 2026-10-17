---
description: Plot 支持统一或按 root 与 marks 分组的数据变换执行默认策略，保持声明级覆盖及 Data 原子契约
keywords: Plot、dataExecution、root、marks、transform、执行策略
---

# ADR-015：按作用域配置数据执行策略

- 状态：Accepted
- 决策日期：2026-10-14
- 前置：[Data 执行契约](../../../data/v0/v0.2/002-transform-execution.md)

## 背景

整体数据变换可能适合外部引擎，而图元局部变换适合内置计算。统一默认策略要求作者为每条局部声明重复配置，无法直接表达这两个作用域的默认行为。

## 决策与契约

Plot 拥有作用域选择，Data 继续拥有单个执行策略、操作声明及执行实现。Plot 根级 dataExecution 接受统一策略或必填 root、marks 的分组策略，两种形态互斥。

```ts
type IRPlotDataExecution = IRDataExecution | { root: IRDataExecution; marks: IRDataExecution };
```

统一形式同时作用于整体和所有图元。分组形式中，root 作用于整体变换，marks 作用于所有图元局部变换，包括 facet 中的图元。两个分组彼此独立，不继承另一组的 mode 或 external。

每个作用域仍按单条声明、所选作用域策略、执行器默认策略的顺序逐字段确定配置，最终模式缺省为 builtin。分组内允许空对象，不提前物化默认值。省略整个 dataExecution 继续使用既有默认规则。

React 根属性、Vanilla 作者输入和 Plot Source IR 表达同一契约。Chart 复用 Plot 根字段时透明传递该结构，不引入自己的执行策略解析。

## 执行与失败语义

异步准备在计算前为整体及图元确定各自策略，所有作用域预检成功后才执行。图元消费整体变换结果，分面图元消费对应分区结果，作用域选择不改变原有数据依赖。

同步入口逐声明检查其所在作用域的有效模式；external 或 hybrid 必须使用异步准备。单条 builtin 覆盖仍可使对应步骤同步执行。没有变换声明的作用域不因配置非 builtin 而产生计算要求。

不完整分组、混合统一与分组字段及非法执行配置在 schema 入口失败。既有统一配置作为正式简写继续有效，不增加兼容别名或平行执行机制。
