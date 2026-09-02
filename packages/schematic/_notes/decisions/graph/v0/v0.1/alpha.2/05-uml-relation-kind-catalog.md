# ADR-05：UML Relation kind 目录与结构默认

- 状态：Proposed
- 决策日期：2026-09-02
- 关联：[alpha.2 roadmap](./roadmap.md) · [Relation contract](../alpha.1/08-relation-data-geometry.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Relation 已有开放的 `role → kind → predicate` Definition / registry 链路，但内置 kind 仅覆盖部分 UML 关系，还混入了 Provenance 语义。用户需要一组可发现、可序列化的 UML 类图与组件图常用关系，并且只以路径和端点表达它们；不在 Relation 中引入 stereotype、multiplicity、接口球棒、关联类或其它额外 UML 图元

## 决策

`role` 继续是开放的通用关系家族和无 kind 时的结构兜底；`kind` 是在所属 role 内注册的稳定 UML 关系语义。Graph 只提供内置 Definition，不保存 UML 元模型、类型约束或执行语义。自定义 role、kind 与 predicate 仍通过原有统一 registry 注册和解析

内置 UML kind 为：

| kind                 | role             | 路径与端点结构                               |
| -------------------- | ---------------- | -------------------------------------------- |
| `uml.association`    | `association`    | 实线；两端无 marker，direction 固定为 `none` |
| `uml.aggregation`    | `association`    | 实线；source（whole）端空心菱形              |
| `uml.composition`    | `association`    | 实线；source（whole）端实心菱形              |
| `uml.generalization` | `generalization` | 实线；target（supertype）端空心三角          |
| `uml.dependency`     | `dependency`     | 虚线；target 端开放 Straight Barb 箭头       |
| `uml.realization`    | `dependency`     | 虚线；target 端空心三角                      |

内置 kind 只保留相对所属 role 有独立路径或端点结构的 UML 关系。没有 stereotype 文本时，usage、abstraction、binding、permission、manifestation、deployment 与 substitution 都不能提供独立可见结构，因此不作为内置 kind；领域需要保留这些语义时使用 label、meta 或自定义 kind。`uml.realization` 从原先的 `generalization` role 移到 `dependency` role，符合其 UML 依赖关系性质；其空心三角保留为 kind 的结构 delta

已有 role 的默认结构保持不变：`association` 的默认 direction 为 `forward`，target 端使用实心菱形；`dependency` 使用实线与开放 Straight Barb；`generalization` 使用实线与实心 normal 箭头。只有 UML kind 通过所属 role 的 direction recipe 覆盖结构：`uml.association` 使用无 marker 实线，aggregation / composition 使用菱形，`uml.generalization` 使用空心三角，UML dependency kind 使用虚线。`flow` 与 `influence` 仍是 Graph 的通用 role，不作为内置 UML kind

## 基础数据结构与公开契约

不新增 Relation 字段、schema 分支、Role 或 Arrow capability。`RelationKind` 的内置词汇提示替换为上表值，所有 kind 继续通过既有 `RelationKindDefinition` 指向所属 role，并通过 direction recipe 覆盖 role 的完整结构。虚线 recipe 使用既有 Core `dashPattern` 表达，endpoint 继续引用 Standard 已注册的 marker Definition

`provenance.derivation`、`uml.usage`、`uml.abstraction`、`uml.binding`、`uml.permission`、`uml.manifestation`、`uml.deployment` 与 `uml.substitution` 从内置 catalog、常量、文档、demo 与测试中删除；0.x 不保留别名、fallback 或旧 key 的隐式解释。用户仍可用自定义 Relation kind 注册相同领域语义

## 行为、失败语义与兼容性

直接 IR、React 与 Vanilla 必须产生同一 Relation Source，并由同一 registry 解析内置 kind。kind 与 role 不匹配、未注册 kind、或 kind 收窄后不允许的 direction 继续 fail-loud，不回退到 role 默认外观

这是破坏性视觉与内置目录变更：未指定 kind 的 association、dependency 与 generalization 采用新的 UML 默认结构；`uml.realization` 必须使用 `dependency` role；`provenance.derivation` 不再是内置 key。Relation 不自动插入任何文本标签、stereotype 或额外图元
