# ADR-06：Graph Entity 与 Relation 的语义状态

- 状态：Proposed
- 决策日期：2026-09-02
- 关联：[alpha.2 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

流程图和关系图常需表达对象或连线当前异常、成功、警告或被禁用。只写颜色、透明度等 Core appearance 虽能绘制，却不能让配置阅读者或 LLM 稳定判断状态语义；领域 predicate 的 `params.status` 又必须先知道特定 Definition 才能解释。Graph 需要一组无需领域注册、可直接持久化与读取的通用状态，同时保持 Graph 不拥有运行时执行或 Editor 交互

## 决策

Entity 与 Relation 共享可选的闭合 `status` 词汇。省略表示正常、未特别标记的对象或关系；不引入 `normal` 值

| status     | 图式语义                         | 默认颜色家族 |
| ---------- | -------------------------------- | ------------ |
| `error`    | 已失败、错误或无法继续的状态     | 红色         |
| `success`  | 已成功、已通过或健康的状态       | 绿色         |
| `warning`  | 需要关注、降级或存在风险的状态   | 黄色         |
| `disabled` | 被显式禁用、不可用或不参与的状态 | 灰色         |

`status` 是图所表达的语义状态，不是 React 组件的真实 `disabled` 行为、工作流执行状态机或 Editor 交互状态。它不改变 Entity role、Relation role/kind/direction、endpoint、路径结构或布局；它也不自动生成标签、图标、marker 或动画

默认 Graph Theme 为四个 status 提供上表颜色家族的 appearance 覆盖。命名 Graph Theme 可以为同一 status 选择符合自身调色板的具体颜色；status 的语义和值不随 Theme 改变。实例显式 Core-compatible appearance 字段仍有最终优先级，因此可以在保留 authored status 的同时满足局部展示需要

领域专属的可用性、审批、部署或业务生命周期继续使用 predicate 与其 params。第一版不开放自定义 status Definition 或 registry；这四个固定值是 Graph 共享、可枚举的基础状态，而不是可扩展领域分类。需要额外稳定状态时，先由拥有业务语义的领域 Definition 表达，不把值加入 Graph 内置集合

## 基础数据结构与公开契约

Graph 新增闭合 `GraphStatus` 词汇及派生 status 类型。`EntitySchema` 与 `RelationSchema` 都增加可选 `status` 字段；Direct IR、Vanilla Input 与 React props 使用同一值和省略语义

Graph Entity 与 Relation Theme selector 都增加可选 `status` 条件，可选择一个或多个 status 值，并与既有 role、kind、predicate、direction 条件共同匹配。Graph resolve 继续在同一 Theme 规则链中确定 status appearance；不新建平行 Theme、Variant、颜色通道或 renderer 分支

## 行为、失败语义与兼容性

未指定 status 的既有 Entity 与 Relation 保持当前结构和 appearance。Source IR 出现空字符串、未知值或数组等非闭合 status 形态时，在 schema 边界失败；不会把它解释为 `normal`、忽略字段或回退为 predicate params

status 只提供 Theme appearance 默认。显式 Entity / Relation appearance、Relation marker appearance 和单个 label 的显式 appearance 按既有优先级覆盖相应视觉字段；覆盖不删除或改写 Source 中的 status。Direct IR、React 与 Vanilla 必须产生同一 status Source，并使用同一 Graph resolver 与 Theme 规则

这是向后兼容的可选字段新增。现有 `predicate.params.status` 不迁移、不别名也不自动映射：它保留为注册 predicate 所拥有的领域数据，与 Graph `status` 可以同时存在
