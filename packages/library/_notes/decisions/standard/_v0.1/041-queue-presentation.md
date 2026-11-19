---
description: Queue 以队首到队尾的顺序呈现静态队列，支持四向排列、两端开放边框和进出箭头
keywords: Queue、队列、FIFO、front、back、collection
---

# ADR-041：Queue 队列结构呈现

- 状态：Accepted
- 决策日期：2026-10-06
- 关联：[roadmap](./roadmap.md) · [030](./030-array-map-presentation.md) · [036](./036-nested-data-expansion.md) · [037](./037-collection-skeleton.md) · [040](./040-stack-presentation.md)

## 定位与边界

Standard 提供 `standard.queue` composite，表达 FIFO 队列的当前快照。第一个单元为队首，最后一个为队尾；新元素由队尾进入，队首元素先离开。Queue 不维护真实 enqueue/dequeue、容量、执行历史、环形索引或双端队列状态。操作箭头、曲线、动画和多个快照由 Core 与 Layout 的公开能力组合。

Queue 拥有队列输入、自然排布和装饰语义，输出 Core contribution，由既有 renderer 输出 SVG / Canvas；React 与 Vanilla 只提供等价 authoring。它不新增关系模型、渲染特判或私有空间查询接口。

## 输入与公开入口

`QueueSchema` 是 JSON-safe Source 真源，`IRQueue` 从其输入派生。namespace 固定 standard，type 固定 queue。以下输入恰好选择一种：

| 入口     | 形式                                               | 含义                         |
| -------- | -------------------------------------------------- | ---------------------------- |
| items    | `Array<string 或 IRCell>`                          | 从队首到队尾的文字或显式单元 |
| data     | `ReadonlyArray<JsonValue>`                         | 从队首到队尾的 JSON 值       |
| skeleton | `{ count: number }` 或 `{ labels: Array<string> }` | 空格或符号格骨架             |

骨架沿一维集合规则：count 为非负安全整数，两个分支互斥且闭合；labels 可重复，空字符串表示空格。items 中的字符串原样显示，显式单元省略 content 表示无内容；data 字符串带引号，嵌套结构沿 Array / Map 规则展开。`dataExpand` 仅用于 data，默认 true，可设 false 或 map/array 列表；嵌套 JSON 数组不自动变成 Queue。

空输入生成空队列。Source 保留作者入口，factory 不预先展开、不补默认；schema.parse 物化静态默认。首尾和位置从单元序列推导，不持久化重复状态。

Standard collection 公开 QueueSchema、QueueLayoutSchema、QueueBorderSchema、QueueSkeletonSchema、对应 IR 类型、createQueue、QueueDefinition、QueueProvider；Vanilla 提供 queue、InputQueue、QueueInputEmbedAdapter；React 提供 Queue、QueueItem 及 props。

React items 接受文字或文本 Cell；图形通过 QueueItem 的唯一 children 提供，text 与 drawable children 互斥。数组与 Fragment 透明展开，忽略 React empty node，不接受其他直属 marker。Queue 的 children 与 items/data/skeleton 互斥；全部省略时生成空队列。Vanilla 与直接 IR 必须明确选择入口。

## 排列与外观

`layout.direction` 表示队首到队尾的物理方向，取 right（默认）、left、up、down。改变方向不改变输入顺序或身份。width/height 始终是单格物理宽高，不因方向交换含义；其余 layout 沿 Cell 的 padding、overflow，并提供非负 gap，默认 8。

主轴采用各格有效尺寸，交叉轴采用最大需求；auto 格填满交叉轴，固定小格保持尺寸并居中。零格或单格不产生额外 gap。style 是单格默认，单格显式字段优先；文字格沿 Cell 的浅灰背景与 padding 8，嵌套集合格默认无额外填充与 padding，显式覆盖有效。固定尺寸与裁切复用 Cell，不自动缩放或换行。

根 padding 默认四边 8，复用通用 BoxSpacing 语义，独立于 layout.padding 和 border。border 默认 true，false 只隐藏边框；对象配置复用 Core Path 非结构属性，排除 type、id、children、kind、kindOptions。默认 stroke=currentColor、strokeWidth=1、fill=none，无自动箭头。水平队列只绘制上下两条边，垂直队列只绘制左右两条边；两条边作为独立子路径，不连接端点，沿自然单元包络及 padding 绘制。外观溢出进入可见范围，不改变 allocation。

空队列默认为 16×16 的两端开放容器；padding=0 时自然尺寸为零，不生成伪单元。骨架格不表示容量。父 exact/range proposal 复用集合约束：自然结构不拉伸，多余空间在右/下，过小约束失败；边框不因额外 allocation 拉长。

根 frame 保留 Core Scope 装饰语义，可与 border 共存；主题、defaults、placement、namespace、变换、clip、meta 与 animations 继续沿 Core 传递。

## 进出箭头与引用

根 label 保留整体文字标签；arrow.input 与 arrow.output 是默认隐藏的进出箭头，true 独立启用，false 隐藏，对象启用并提供 Core Path style 与 ArrowEndDetail 外观。空集合隐藏进出箭头。箭头距开放端 8，直线段长 24；装饰进入可见范围但不改变单格、容器 allocation 或引用边界。队尾进入、队首出去，两根直线沿队列轴绘制。

单元素队列仍在两端分别绘制进出箭头。根 label 仍附着整个容器 allocation，使用 Core 标签配置。

Queue 只登记显式单元 id，沿 `cell:<id>` 身份与 queue-cell inspection role；根 role 为 container。不从下标、文字、data 或骨架推导 id。外部 Core NodeTarget 引用实际单元边界，不包含共享轴空白、边框或标签；格内图形仍保留自身 id 与引用边界。命名空间、延迟引用、transform 与 ownerPath 复用 Core。

## 等价性与失败

React 经 Vanilla 接入同一 Standard Source，三入口产生等价的 Scene、allocation 与引用。adapters 自动收集 Queue、内容与裁切依赖；直接 IR 需显式装配 Queue 及内容 provider，data 展开复用 Array/Map 依赖闭包。

入口混用、未知字段、非法方向、负数/非有限尺寸和间距、非法骨架、非 JSON 数据、非 data 入口的 dataExpand 在相应边界失败。重复 id、引用、测量、proposal 或依赖错误沿已有诊断链路传播，不返回部分队列。无效 JSX marker 在 React authoring 边界失败。

Queue 是新增能力，不改变既有集合的公开行为，不提供兼容别名。双语文档、API/Schema 和示例随能力同步交付。

arrow 的默认值为 false；布尔值统一开启或关闭两侧，对象通过 input、output 独立配置，每侧接受布尔值或含 style、arrowDetail 的外观对象，省略的一侧默认隐藏。
