---
description: Stack 以有序单元格呈现栈底到栈顶的静态结构，支持四向堆叠、开放端容器与栈顶标签，操作和自定义连接由外部绘图组合
keywords: Stack、栈、collection、栈顶、开放端、items、data、skeleton、单元格
---

# ADR-040：Stack 栈结构呈现

- 状态：Accepted
- 决策日期：2026-10-06
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [030](./030-array-map-presentation.md) · [036](./036-nested-data-expansion.md) · [037](./037-collection-skeleton.md)

## 背景与决策

算法教学与调用栈示意需要明确表达栈底、栈顶和开放端。Array 可以排列内容，但没有栈顶语义与开放容器；让每个调用方自行维护方向、外框和栈顶位置容易产生不一致。

Standard 新增 `standard.stack` composite，组合已有 Cell 与 Core Node、Path、Scope 能力。Stack 展示作者提供的当前快照，不拥有 push/pop 操作、容量、溢出状态或执行历史。操作箭头、曲线连接及多快照排版继续通过外部绘图能力组合。

输入顺序始终为栈底到栈顶，最后一项是栈顶。方向只改变几何排列，不反转输入、不改变单元格身份。栈顶从输入推导，不保存独立 topIndex 或节点副本。

## 输入与公开入口

`StackSchema` 是 JSON-safe Source 真源，`IRStack` 是其输入类型。Source 固定 `namespace: 'standard'`、`type: 'stack'`，恰好选择一种内容入口：

| 入口      | 形态                                                       | 语义                                          |
| --------- | ---------------------------------------------------------- | --------------------------------------------- |
| 显式单元  | `items: Array<string \| IRCell>`                           | 文字原样显示，Cell 可配置内容、id、样式和布局 |
| JSON 数据 | `data: ReadonlyArray<JsonValue>`                           | 外层确定栈顺序，内部按既有 JSON 数据规则呈现  |
| 示意骨架  | `skeleton: { count: number } \| { labels: Array<string> }` | 无内容格或格内文字，复用一维骨架规则          |

count 为非负安全整数；骨架两分支互斥、对象闭合。labels 允许重复，空字符串表示无内容格。显式 Cell 的空字符串仍表示文字，省略 content 才表示无内容。空数组或 count 为零表示没有单元格，而不是一个空单元格。

`dataExpand: boolean | Array<'map' | 'array'>` 仅限 data，默认 true。JSON 字符串显示引号，非空数组与对象按展开选择生成 Array／Map；空结构和未展开结构按既有 JSON 文本规则显示。不自动将嵌套数组识别成 Stack。

Source 只保存作者入口，不同时保存展开结果、数量、栈顶或位置。factory 保持稀疏输入，显式 schema.parse 物化静态默认；上下文继承仍按既有集合规则处理。

Standard 通过 collection 入口公开 `StackSchema`、`IRStack`、`createStack`、`StackDefinition`、`StackProvider` 及所需配置类型。Vanilla 提供 `stack()`、`InputStack`、`StackInputEmbedAdapter`；React 提供 `Stack`、`StackItem` 及对应 props。

React items 属性接受文字或文本 Cell；drawable 使用 StackItem 的唯一 children。StackItem 的 text 与 drawable children 互斥，都省略时为空格。数组和 Fragment 透明展开，沿现有规则忽略 React empty node；不接受非 StackItem 的直属绘图子项。children 是 items 的 authoring 形式，与三个属性入口互斥。React 未提供任何入口时为空栈；Vanilla、factory 与直接 IR 必须明确选择入口。

```tsx
<Stack id="calls" layout={{ direction: 'up', width: 96, gap: 2 }} topLabel={{ text: 'top', position: 'right' }}>
  <StackItem text="main" />
  <StackItem id="active-call" text="visit" style={{ fill: 'none', stroke: 'gray', dashPattern: [4, 3] }} />
</Stack>
```

## 排列与单格样式

`layout` 复用 Cell 的 width、height、padding、overflow，并增加 `direction: 'up' | 'down' | 'left' | 'right'`，默认 up，以及非负 `gap`，默认 2。width 与 height 始终表示单格的物理宽高，旋转方向时不交换字段含义。

| 方向  | 栈底到栈顶 | 开放端 |
| ----- | ---------- | ------ |
| up    | 从下往上   | 上     |
| down  | 从上往下   | 下     |
| left  | 从右往左   | 左     |
| right | 从左往右   | 右     |

每格沿堆叠轴采用自身有效尺寸；交叉轴取各格需求最大值作为共享宽度或高度。交叉轴为 auto 的格填满共享尺寸，显式固定尺寸保持原值并居中，不强行拉宽。主轴相邻格之间放置 gap，零格和单格均不产生额外 gap。不给每格增加 Stack 专属 anchor 或连接对象。

整体 `style` 是单格默认，单格显式字段优先，字体按字段继承。文字格默认 gray / 0.14 填充、无描边、无圆角、padding 8。格内内容居中，固定尺寸的裁切与显式 overflow 沿共享 Cell 规则，不缩放、不自动换行。Stack 作为其他集合的格内内容时，与现有嵌套集合一样，外层格默认无填充、padding 0，显式覆盖仍有效；这不取消 Stack 自己的外框。

## 开放容器与空栈

Stack 沿用 Frame／Surface 的命名，`border` 配置开放边框，根 `padding` 配置容器留白。根 `frame` 保持 Core Scope 原有契约：围绕固有内容包络绘制装饰，不参与 allocation；与 Stack 的边框可同时配置。

`border` 接受布尔值或 Core Path 非结构属性对象，默认 true。false 隐藏边框但不移除 padding；true 等价于空配置对象。

padding 复用 Surface 的 padding 契约，默认四边 8，与单格 layout.padding 相互独立。容器包围全部单格的 allocation 包络，四边 padding 都参与容器自然尺寸，包括开放端。路径沿剩余三边连续绘制，不在开放端绘制封口线。沿屏幕坐标，上开口从左上经过左下、右下到右上，其余方向为该路径的对应旋转。

border 对象复用 Core Path 的非结构属性，排除 Stack 拥有的 type、id、children、kind、kindOptions；与 Chain 的路径配置遵循同一边界。默认 stroke 为 currentColor、strokeWidth 为 1、fill 为 none，不添加箭头；作者可以使用 Core 的线型、透明度、标记和路径装饰。显式填充仍按 Core 开放路径的填充规则闭合区域，不增加封口描边。路径外观不改变单元格位置或容器 allocation，其视觉溢出进入 Core 可见范围。

空栈的单元格区域为 0×0，仅保留容器 padding，默认形成 16×16 的开放容器；不生成占位格、伪造格 id 或保留已移除单元格的尺寸。显式设置 padding 为零的空栈自然尺寸为零，border 为 false 时也没有边框输出。需要示意空槽使用 skeleton，不能把空槽解释成容量。

父布局 exact／range proposal 沿现有集合契约处理：自然结构不拉伸、不压缩间距，额外空间留在自然结构的右侧和下方；不足以容纳结构时失败。外框跟随自然单元格区域及 padding，不因额外 allocation 空间而拉长。

## 标签与空间引用

根 `label` 复用既有集合的 Core Node label 单个或数组配置，附着于整个容器 allocation。新增 `topLabel` 使用同一配置契约，仅在非空栈附着于最后一格的实际 allocation；默认省略，不生成内置文字或箭头。标签位置使用 Core 的物理位置语义，不随 direction 改写。空栈不绘制 topLabel，也不为其保留空间；根 label 仍可显示“空栈”。标签影响可见范围，不撑大格子、容器或帧内留白。

Stack 只登记显式单格 id，不提供索引身份模式，不从 data、文字或 skeleton.labels 推导名称。需要从外部引用某格时使用 items／StackItem 配置 id；引用边界是实际单格 allocation，不包含共享交叉轴剩余空间、gap、border 或标签，格内 drawable 的 id 保留自身边界。

根 inspection handle 为 container，具名格沿用 `cell:<id>` 身份和 `stack-cell` 角色，无 id 的格不额外发布 handle。命名空间、延迟引用、外层变换及 descendant ownerPath 复用 Core，不建立 Stack 私有位置查询表。复杂连接直接使用已有 Core NodeTarget，不由 Stack 保存入口、出口或任意边列表。

根组合保持现有 Collection 的 Core Scope 语义，包括身份、主题、defaults、placement、变换、clip、meta 和 animations。直属 Cell style 与根 Scope 外观沿现有集合的字段分工处理；根标签、border 和 topLabel 不传播到嵌套集合。

## 等价性、失败与兼容性

React 经 Vanilla authoring 输入到同一 Standard Source；布局、栈顶选择、开放框及内容展开只由 Standard 解释。React 与 Vanilla 自动收集 Stack、内容和裁切所需 provider；直接 IR 由作者显式装配 Stack 与实际内容依赖，data 展开沿现有 Array／Map provider 闭包，不通过 renderer 特判。

入口混用、未知字段、非法方向、负数或非有限尺寸／间距、非法骨架数量、非字符串骨架标签、非 JSON 数据以及非 data 入口配置 dataExpand，在对应 Source／authoring 边界失败。重复身份、缺失定义、内容测量、proposal 与引用错误沿下层契约保留原因，不输出部分栈。无效 React marker 结构在 React authoring 边界失败。

Stack 为新增能力，不改变 Array、Map、Matrix、Chain 的输入解释和默认布局；没有兼容别名或旧行为迁移。相同输入和环境在直接 IR、Vanilla 与 React 中产生等价 Scene、allocation 和空间引用。公开行为与双语使用文档、API 和可执行示例同步交付。
