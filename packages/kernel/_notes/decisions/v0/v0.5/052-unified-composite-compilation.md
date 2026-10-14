---
description: 统一 Composite compile 回调，移除独立展开入口，保留纯 Kernel IR 的 React 反向转换。
keywords: Composite、compile、context、spatialHandles、Kernel IR
---

# ADR-052：统一 Composite 编译契约

- 状态：Accepted
- 决策日期：2026-10-13
- 关联：[roadmap](./roadmap.md) · [ADR-007](./007-layout-aware-composite.md) · [ADR-039](../v0.4/039-tier2-unbuilder-lowering.md) · [绘图完备性](../../../architecture/core-drawing-complete.md)

## 背景与目标

复合组件都根据经过 schema 解析的声明生成子项。部分组件需要先测量子图，另一些组件只组合声明；这一区别可以通过按需使用上下文能力表达。将其拆为 expand 与 compile，使定义、宿主代理和输出处理维护两套分支，同时独立展开无法覆盖需要布局或空间结算的组件。

统一组件定义和执行环境，让简单组合与复杂布局共享一个可扩展契约。

## 决策：所有复合组件统一使用 compile

Definition 仅提供 compile 回调，接收已解析声明与完整 CompositeCompileContext。上下文保留主题、运行时输入绑定、尺寸提案、子布局试算、路径目标查询、结果重放、Scope 和诊断能力。组件可直接返回普通子声明，不要求执行试算。

所有子项经同一 Core 遍历器编译；试算仍隔离执行，只有最终输出中的有效重放提交资源、引用、诊断与产物。内置与第三方组件使用相同定义、注册和消费机制。

## 基础数据结构与公开契约

```ts
type CompositeDefinition<
  TNode,
  TNamespace extends string,
  TType extends string,
  TArtifact extends JsonValue = never,
> = {
  namespace: TNamespace;
  type: TType;
  schema: ZodType<TNode>;
  compile: (node: TNode, context: CompositeCompileContext) => CompositeCompileResult<TArtifact>;
} & ([TArtifact] extends [never] ? { artifactSchema?: never } : { artifactSchema: ZodType<TArtifact> });
```

CompositeCompileResult 必须包含 children，可返回普通 IR 子项、绑定子项和编译期输出句柄。allocationBounds、alignmentGuides 与 artifact 延续原有语义；spatialHandles 声明附着于当前组件局部坐标的空间区域，由 Core 在最终放置时结算。通过 scope 声明的空间区域继续附着于该 Scope，丢弃的试算不发布任何区域。

删除 expand 及对应上下文、返回值和分支类型；不保留旧名别名或双分支适配。统一的定义类型为 CompositeDefinition 与异构容器 AnyCompositeDefinition。

移除 lowerIRToKernel 及独立展开选项。完整编译输出 Scene，不承诺从任意复合组件恢复可持久化 Kernel IR。convertIRToReactNode 仅接受递归不含 composite 的 IRKernelScene，去除 definitions 和展开选项；IRKernelChild 与 IRKernelScope 表达同一受限结构。它继续生成 Kernel React children，根级属性由调用方传给 Layout。包含复合组件的场景通过完整编译宿主接入。

## 行为、失败语义与兼容性

- schema 解析、主题继承、绘制顺序、命名空间、资源、诊断、空间变换、绑定所有权及产物校验维持同一契约。
- 普通生成子项的 occurrence 统一采用 output，移除 expand 路径分类；locator 仍仅在同一次编译内有效。
- 未注册定义沿现有完整编译规则告警并跳过；非法输出、越权句柄、重复放置和非法空间声明明确失败，不返回部分成功结果。
- 本次为公开 breaking 变更；组件作者使用 compile，原先无需上下文的回调仍可只声明第一个参数。
- React 与 Vanilla 共享同一 Core Definition 和输入绑定规则；框架层不再维护分支适配。Renderer 继续只消费 Scene，不感知回调类别。
- 本决策替代 ADR-007 的双回调契约与 ADR-039 的 Tier 2 独立展开设计；其余布局、重放和纯 Kernel JSX 转换语义继续有效。
