/** Graph 复合元素的命名空间 */
export const GRAPH_NAMESPACE = 'graph' as const;

/** Graph 正式元素的稳定判别值 */
export const GraphType = {
  /** 承载 Graph 展示默认与领域主题的可选根作用域 */
  Graph: 'graph',
  /** 表示可嵌套且具有可见边界的通用内容分组 */
  Group: 'group',
  /** 表示具有可见边界与纵向开放内容布局的图节点容器 */
  Block: 'block',
  /** 表示图块中常用的图标、标题与尾随内容横向结构 */
  BlockHeader: 'blockHeader',
  /** 表示图块中常用的可见纵向内容分区 */
  BlockSection: 'blockSection',
  /** 表示图块中常用的横向 Flex item 内容行 */
  BlockRow: 'blockRow',
  /** 表示图中具有关系语义的实体 */
  Entity: 'entity',
  /** 表示图式元素间关系的路径 */
  Relation: 'relation',
} as const;

/** Entity 的内置上位语义角色 */
export const EntityRole = {
  /** 主动参与、负责或提供能力的主体 */
  Participant: 'participant',
  /** 发生的工作、动作或转换过程 */
  Activity: 'activity',
  /** 发生点、边界或生命周期事件 */
  Event: 'event',
  /** 对象或系统持续存在的条件 */
  State: 'state',
  /** 具有语义的控制分叉、汇合或同步 */
  Gateway: 'gateway',
  /** 被使用、产生或存储的对象 */
  Resource: 'resource',
  /** 抽象知识对象 */
  Concept: 'concept',
} as const;

/** Relation 的内置语义角色 */
export const RelationRole = {
  /** 一般关联关系 */
  Association: 'association',
  /** 依赖关系 */
  Dependency: 'dependency',
  /** 泛化关系 */
  Generalization: 'generalization',
  /** 流动关系 */
  Flow: 'flow',
  /** 影响关系 */
  Influence: 'influence',
} as const;

/** Relation 的内置稳定 kind */
export const RelationKind = {
  /** UML 一般关联关系 */
  UmlAssociation: 'uml.association',
  /** UML 聚合关系 */
  UmlAggregation: 'uml.aggregation',
  /** UML 组合关系 */
  UmlComposition: 'uml.composition',
  /** UML 泛化关系 */
  UmlGeneralization: 'uml.generalization',
  /** UML 依赖关系 */
  UmlDependency: 'uml.dependency',
  /** UML 实现关系 */
  UmlRealization: 'uml.realization',
} as const;

/** Graph Entity 与 Relation 共享的图式语义状态 */
export const GraphStatus = {
  /** 已失败、错误或无法继续 */
  Error: 'error',
  /** 已成功、已通过或健康 */
  Success: 'success',
  /** 需要关注、降级或存在风险 */
  Warning: 'warning',
  /** 被显式禁用、不可用或不参与 */
  Disabled: 'disabled',
} as const;
