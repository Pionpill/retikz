---
description: 区分组件自身外观和子元素默认配置，统一 Standard 集合与领域默认入口的命名和跨入口语义
keywords: style、defaultCell、defaultNode、defaultConnection、defaultGraph、defaultTable
---

# ADR-043：实例外观与子元素默认配置

- 状态：Accepted
- 决策日期：2026-10-13
- 关联：[roadmap](./roadmap.md) · [集合结构](./039-chain-presentation.md) · [Tree](./042-tree-presentation.md) · [Theme 来源协议](../../../../../../kernel/_notes/decisions/v0/v0.5/037-theme-source-fragments.md)

## 背景与目标

集合的顶层 style 实际配置每个 Cell，Tree 的顶层 node 与 connection 实际为各节点和连线提供默认值。这些入口容易与实例自身外观或单个结构对象混淆。默认配置应从名称说明其目标，自身外观和继承默认应可独立辨认。

## 决策

style 只表示所属实例自身的外观。没有整体自身外观的组件不提供顶层 style；背景、边框及具体图元的已有直接配置继续由它们的 owner 负责。

领域默认入口采用 defaultXxx，Xxx 表示配置目标。默认值继续由原 owner 的 schema、解析和 lowering 消费，不引入通用默认值 registry。Core Scope 的 defaults 通道及 defaults.style 保持已有契约。

## 公开契约

- Array、Matrix、Stack、Queue、Chain、Map 通过 defaultCell 的 style / layout 提供共享单格样式与尺寸、内边距、溢出默认值。根 layout 只配置集合排列。Map 的 defaultCell.key/value 各自包含 style / layout 角色覆盖；单格 style / layout 具有更高优先级。
- Tree 通过 defaultNode 和 defaultConnection 提供节点与连接默认值，逐项 node / connection 表达单个节点及入边的覆盖。默认连接 false 隐藏未显式覆盖的连接。
- Chain 根及并行块通过 defaultConnection 为内部自动连接提供默认值，嵌套并行块覆盖外层对应字段。
- Graph、Diagram、Flow、Plot、Table、Chart 的领域入口分别使用 defaultGraph、defaultDiagram、defaultFlow、defaultPlot、defaultTable、defaultChart。
- Table 原有 Cell layout、appearance 和 visual 默认入口分别命名 defaultCellLayout、defaultAppearance、defaultVisual。它们与 defaultTable 保持不同来源层，不合并作者层与主题层。

例如 Array 使用 `defaultCell: { style: { fill: 'blue' }, layout: { width: 80 } }`，其中一个单格仍可用 `style: { fill: 'red' }` 覆盖。Tree 使用 `defaultNode: { style: { fill: 'blue' } }`，节点仍使用 `node: { style: { fill: 'red' } }`。

## 行为、失败语义与兼容性

省略默认配置保持既有默认外观。字段覆盖、复合叶子的替换粒度、显式 0 / false / null、主题来源、作用域和 reset 行为不因入口重命名而改变。默认配置不会创建未声明的内容、节点或编码。

Table 保持 baseline → style definition → defaultTable → 显式 Source 默认入口与 layout → Cell / rule / encoding 的既有顺序；manifest 与诊断使用新 Source 路径。

本决策替代关联 ADR 中被重命名的作者入口，其他契约继续成立。旧入口从严格 Source schema 移除，不保留别名、双读或 fallback。React 与 Vanilla 通过同一 owner 契约表达与直接 IR 等价的配置；宿主 DOM 的 CSS style 不属于绘图默认配置。
