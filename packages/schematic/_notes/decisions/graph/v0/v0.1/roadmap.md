# graph v0.1 Roadmap

## 版本目标

建立可组合的关系语义、开放内容节点与代码实体。

## 重点功能

| 重点能力       | 目标                                                                  | 相关 ADR                                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 关系语义       | 支持独立 Entity / Relation、Group 与可选 Graph 上下文                 | [006](./006-graph-entity-registry-theme.md)、[007](./007-entity-data-geometry.md)、[008](./008-relation-data-geometry.md)、[009](./009-composable-graph-context.md)、[010](./010-group-composition.md) |
| 开放内容节点   | 以 Block、Header、Section、Row 表达有宽度约束的内容                   | [011](./011-block-composition.md)、[012](./012-block-sizing.md)、[013](./013-block-open-content.md)                                                                                                    |
| 主题与关系外观 | 统一容器继承、UML 关系、status、Defaults / Rules 与颜色分组           | [014](./014-container-theme-inheritance.md)、[015](./015-uml-relation-kind-catalog.md)、[016](./016-graph-status.md)、[017](./017-theme-source-fragments.md)、[018](./018-relation-color-groups.md)    |
| 代码实体       | 建立共享内容、Interface / Function，并向 Object / Class / Module 扩展 | [019](./019-code-block-contract.md)、[020](./020-interface-block.md)、[021](./021-function-block.md)                                                                                                   |
| 跨宿主入口     | 直接 IR、React 与 Vanilla 复用同一 Source 和扩展契约                  | [001](./001-graph-package-family.md)、[003](./003-semantic-ir-lightweight-lowering.md)                                                                                                                 |

## 功能规划

### 关系语义

主要场景：

- 节点和连线需要表达可复用的关系语义。
- 内容需要可见分组，或共享一层可选图上下文。

规划内容：

- 提供独立 Entity、Relation、Group 与 Graph 上下文。
- 节点和关系消费 Core 的公开绘图与寻址能力。

预期效果：

关系元素可以独立或组合使用，不要求建立另一套完整图文档。

### 开放内容节点

主要场景：

- 工程结构图需要包含多个内容区段的节点。
- 节点内容需要显式局部寻址及可控制宽度。

规划内容：

- 发展开放 Block、可选 Header、Section、Row 与宽度约束。
- 内容组织复用 Layout / Surface，不把业务字段写成平行图形模型。

预期效果：

复杂节点可以按内容组织和寻址，而不受固定字段模板限制。

### 主题与关系外观

主要场景：

- 同一组节点和关系需要一致的默认外观。
- UML 关系或语义状态需要明确的可选呈现。

规划内容：

- 统一容器主题继承、UML relation kinds、status 与颜色分组。
- 通过 Defaults / Rules 表达默认和规则，不改变关系数据所有权。

预期效果：

图内的共同外观和局部差异有统一表达，不依赖宿主重复渲染逻辑。

### 代码实体

主要场景：

- 接口和函数需要作为独立可连接的图节点。
- 更复杂代码结构希望复用成员内容与 Block。

规划内容：

- 先建立共享内容和 Interface / Function，再面向 Object / Class / Module 扩展。
- 维持真实能力依赖，不要求所有代码实体在同一发布批次交付。

预期效果：

代码实体沿共享内容逐步发展，尚未交付的实体不会被提前声明完成。

### 跨宿主入口

主要场景：

- 直接作者与 React / Vanilla 使用同一组关系元素。
- 扩展作者希望增加领域内容而不绕过 Graph 语义。

规划内容：

- 提供三入口一致的 Source、Definition 与 authoring。
- 保持公开扩展、输入解释与绘图结果的共同边界。

预期效果：

不同宿主和扩展消费者能够共享关系语义与绘图结果。

## 边界与依赖

复用 Core、Layout 与 Standard Surface；代码实体依赖共享内容与 Block。Graph 不拥有 Diagram 自动布局、Editor、执行或成员数据库。
