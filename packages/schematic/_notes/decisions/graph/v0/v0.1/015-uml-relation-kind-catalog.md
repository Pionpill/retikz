---
description: Relation 保留通用 role 默认结构，kind 与 Entity 一样由用户显式注册，不提供内置领域目录
keywords: 'Relation、kind、role、Definition、registry、用户注册'
---

# ADR-015：Relation 用户注册 kind 与 role 默认结构

- 状态：Accepted
- 决策日期：2026-09-02
- 修订日期：2026-09-26
- 关联：[Graph roadmap](./roadmap.md) · [Relation contract](./008-relation-data-geometry.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Graph 提供通用关系语义和呈现，不拥有 UML 等领域分类目录。Relation 与 Entity 采用一致的能力边界：role 提供内置上位语义和默认结构，kind 表达用户注册的领域子类型。领域用户通过现有 Definition / registry 表达 UML、工作流或其它关系，不需要修改 Graph 的公开词汇

## 决策

Relation 不提供任何内置 kind，不导出内置 kind 常量或对应字面量联合类型。所有 kind 都通过 `defineRelationKind` 定义，并通过 `GraphDefinitionOptions.relationKinds` 显式注册；定义函数本身不执行注册。Graph 不保存 UML 元模型、类型约束或执行语义

五个内置 role 保留原有默认结构：

| role             | 默认 / 允许 direction                            | 默认结构                                                 |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `association`    | `forward` / `none`、`forward`、`reverse`、`both` | 实线；有效方向端为实心 `diamond`，`none` 时两端无 marker |
| `dependency`     | `forward` / `forward`                            | 实线；target 端开放 `straightBarb`                       |
| `generalization` | `forward` / `forward`                            | 实线；target 端实心 `normal`                             |
| `flow`           | `forward` / `forward`、`reverse`、`both`         | 实线；有效方向端为 `stealth`                             |
| `influence`      | `forward` / `forward`、`reverse`、`both`         | 实线；有效方向端为 `circle`                              |

未指定 kind 时采用 role 默认结构。用户 kind 绑定一个 role，通过 direction recipe 稀疏覆盖该 role 的结构，并可收窄允许方向；未覆盖字段继续继承。predicate 与主题、作者实例外观沿用现有解析规则

## 基础数据结构与公开契约

`Relation.kind` 仍为可选的非空字符串，`RelationKindSchema` 不携带内置枚举提示。kind key 在 Relation registry 内全局唯一，注册时必须引用有效 role；这不改变既有 Relation key 身份规则

`RelationKindDefinition`、`defineRelationKind` 与 `GraphDefinitionOptions.relationKinds` 保留同一契约。直接 IR、React 与 Vanilla 通过同一 provider assembly 解析 definitions，definitions 不写入 JSON-safe Source。Diagram 等上层消费者复用同一开放字段和注册通道

## 行为、失败语义与兼容性

指定未注册 kind 必须报错，不回退到 role 默认结构。重复 kind、无效所属 role、方向集合扩张或默认方向不在允许集合内仍明确报错。注册成功后，kind 只能与所属 role 一起使用

删除原有六种 UML kind 的内置定义及 `RelationKind`、`RelationKindValue` 公开词汇，不保留别名、隐式注册或兼容 fallback。旧 UML key 与其它非空字符串同样可由用户显式注册；Graph 不保留这些名称。这是内置能力目录的破坏性变更，未指定 kind 的 role 外观保持不变

本决策取代 ADR-008 的旧内置 kind 目录与 role 默认结构；其余 Relation 契约保持有效
