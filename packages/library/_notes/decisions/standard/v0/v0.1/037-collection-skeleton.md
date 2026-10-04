---
description: List 与 Map 通过 skeleton 描述无真实数据的示意骨架，支持空单元格、格内符号与格外索引标号，复用既有布局和身份契约
keywords: skeleton、List、Map、示意骨架、空单元格、count、keys、index、labels
---

# ADR-037：List 与 Map 示意骨架

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [ADR-030](./030-list-map-presentation.md) · [ADR-033](./033-list-index.md) · [ADR-034](./034-list-cell-identities.md) · [ADR-036](./036-nested-data-expansion.md)

## 背景与目标

论文、算法和系统示意图需要展示向量格子、空槽位或只有符号键的映射，不一定存在真实业务数据。作者应能声明结构而不编造 JSON 值或重复书写空文字，同时继续使用单元格样式、索引和连接引用。

数量足以描述全空的一维 List，格内符号则需要有序文字；Map 还需要描述键。统一入口应表达“示意骨架”的用途，由具体集合决定必要的结构字段，而不是让所有集合接受同一份数量配置。

## 决策

List 与 Map 增加 JSON-safe 的 `skeleton` 入口，与真实 `data`、显式 `items` / `entries` 互斥。React children 是显式入口的 authoring 形式，同样不能与 skeleton 混用。骨架是最终绘图内容，不代表加载状态，也不会等待真实数据填充。

Standard 拥有骨架到集合单元格的语义。空格子与普通格子共用布局、样式、命名和空间结果契约；Core 与 Layout 继续负责已有测量、组合和空间能力。React、Vanilla、factory、直接 IR 表达相同语义，不建立 adapter 独有的骨架渲染模式。

本决策仅定义 List、Map。未来集合可采用相同属性名，但应按各自结构定义配置；不提前建立 Stack、LinkedList 或通用拓扑描述协议。

## 骨架输入

```ts
// List 的 skeleton
type ListSkeleton = { count: number; labels?: never } | { labels: Array<string>; count?: never };

// Map 的 skeleton
{
  keys: Array<string>;
}
```

- List 的 `count` 与 `labels` 必须二选一。count 接受非负安全整数，生成对应数量的无内容单元格，不接受顶层 count 简写。
- List 的 `skeleton.labels` 是格内符号文字，长度决定格数，保持顺序并允许重复。空字符串表示无内容单元格，不生成空文字图元；其他字符串按原始纯文本显示，不添加 JSON 引号、不解析模板或公式。
- Map 的 `keys` 必填，每个字符串生成一个键值行：键按原始文字显示，值单元格无内容。保持顺序，允许空字符串和重复标签，不额外添加 JSON 引号。
- Map 行数由 keys 长度决定，不接受重复的 count 字段。keys 是显示标签，不是身份，也不解释为对象或配置。
- List 的两个骨架分支与 Map 骨架配置均为闭合对象。Source 只保留作者选择的入口，不同时保存生成的 items / entries。
- `count: 0`、`labels: []` 与 `keys: []` 表示空集合，沿用零自然尺寸、无直属格、无索引和无间距的现有规则。
- `dataExpand` 仍仅用于 data，不可与 skeleton 或显式结构组合。骨架不做 JSON 展开，也不传播到手写嵌套组件。
- React 未提供任何入口时仍表示空组合；Vanilla、factory、直接 IR 仍须显式选择一种入口。

```tsx
<List skeleton={{ count: 6 }} layout={{ width: 24, height: 40, gap: 2 }} />
<List skeleton={{ labels: ['x₁', 'x₂', 'xₙ'] }} index={{ start: 1 }} />
<Map skeleton={{ keys: ['k₁', 'k₂', 'kₙ'] }} layout={{ width: 48, height: 32 }} />
```

## 空内容与显式结构

共享单元格的 content 改为可省略，表示没有文字或 drawable。文本与单个 drawable 的既有语义保持不变；JSON null 仍是 data 中应显示的字面量，不能代替空内容。

显式 List 可使用 `{ id?, style?, layout? }` 描述空格。Map entry 的 key、value 仍均必填，但任一角色可使用空单元格对象 `{}`。需要逐格身份、不同样式或复杂键内容时使用显式结构，不在 skeleton 中再加入覆盖数组。

React 的 ListItem、MapKey、MapValue 可同时省略 text 与 drawable children；同时提供两者或提供多个 drawable 仍失败。MapEntry 继续要求各一个 MapKey 与 MapValue，空角色不等于缺失角色。Vanilla 的显式 Cell 同样允许省略 content。

无内容单元格仍有背景、边框与 allocation，但没有内容图元，其内容自然尺寸为零；自动尺寸按既有 padding 与行列分配规则计算，不引入骨架专用宽高。默认 padding 仍可产生非零格子；作者要得到明确的示意图比例，应显式配置 layout.width / height。显式 content 的空字符串与无内容在语义上不同，不承诺文字测量结果相同；skeleton.labels 中的空字符串是无内容的简写，不改变显式 content 的语义。

## 标号与身份

List 的 index 在保留现有布尔值、position、style 的基础上，支持两种互斥的文字来源：

- 自动编号：`start?: number`，默认 0，沿用现有非负整数规则。
- 显式标号：`labels: Array<string>`，不能同时提供 start；数量必须等于直属格数，包括零长度集合。顺序对应格子，空字符串表示该位置不显示标号，重复标号合法。

index.labels 是格外索引条的纯文本，不解析模板、公式或格式化函数。`x₁` 可作为 Unicode 文字显示；公式能力继续由已有显式 drawable 组合表达。省略 index 或 false 仍隐藏索引；true 与空对象仍自动编号。所有内容入口均可使用显式索引标号。

skeleton.labels 与 index.labels 分别控制格内内容和格外标号，可同时使用，也可将格内符号与自动编号组合。格内文字沿用单元格内容样式与布局，格外标号沿用 index 的样式与位置；不增加 index.position 的 inside 取值。两种 labels 均不推导单元格身份，skeleton.labels 同样不允许搭配 string 身份模式。需要逐格样式、身份或 drawable 时使用显式 items。

```tsx
<List
  id="vector"
  skeleton={{ count: 3 }}
  cellIdMode="index"
  index={{ labels: ['x₁', 'x₂', 'xₙ'], position: 'before' }}
  layout={{ width: 24, height: 40 }}
/>
```

非空标号沿用索引条的测量、居中、间距和整体 allocation 规则，不扩大单格引用区域；空字符串不生成标号图元，全部标号为空时不占索引条空间或额外 gap。

标号、Map keys 与单元格 id 相互独立。List skeleton 支持默认 explicit 模式（不自动生成单格身份）和 index 模式（要求 List id，按既有零基命名规则生成直属格身份）；不接受 string 模式。显式空格仍可带 id，index 模式下沿用别名契约。Map skeleton 不从 keys 推导身份；需要连接某个键格或值格时使用显式 entries 配置 id。

## 布局、失败与兼容性

骨架与等价显式单元格（无内容或文字内容）应产生相同的单元格 allocation、排列、样式、裁切及空间结果。样式优先级、键角色默认、根标签、继承边界、嵌套背景和阴影效果均不因 skeleton 改变。不内置省略号槽位、隐藏元素数量或业务连接规则。

入口混用（即使输入为空）、非法 count、非字符串 keys / labels、未知骨架字段、List 骨架 count 与 labels 同时提供或均未提供、index.labels 数量与格数不匹配、index.labels 与 start 共存、skeleton 搭配 dataExpand 或 string 身份模式，都在对应 Source / authoring 边界失败。诊断指向实际字段或成员；既有重复 id、定义缺失、测量和 proposal 失败继续沿用下层错误，不返回部分图形。

本决策扩展 ADR-030 的输入入口及空单元格契约，扩展 ADR-033 的索引文字来源，并将 ADR-034 的下标身份应用于 List skeleton；其他既有规则继续生效。原有合法输入及默认展示不变，不提供旧名别名或转换兼容层。

公开 schema、类型、React / Vanilla 输入及中英文文档必须表达同一契约。骨架能力的设计确认不表示实现或发布完成。
