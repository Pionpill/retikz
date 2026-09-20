---
description: 为数组与键值记录提供可引用的通用 List、Map 呈现组件，直接计算简单排布并复用 Surface 单元格外观，不引入表格数据语义
keywords: List、Map、数据结构、presentation、cell、anchor、Surface、Layout
---

# ADR-030：List 与 Map 数据结构呈现

- 状态：Accepted
- 决策日期：2026-09-19
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [ADR-015](./015-presentation-composite-reuse.md) · [ADR-022](./022-arbitrary-child-surface.md) · [Layout ADR-001](../../../layout/v0/v0.1/001-layout-package-family.md) · [Core ADR-028](../../../../../../kernel/_notes/decisions/v0/v0.5/028-qualified-spatial-handles.md)

## 背景与目标

数组、队列、命名表与对象记录的原理图反复需要同一种呈现：对齐的内容槽位、键值配对、不同深浅的背景，以及连接具体单元格的箭头。当前作者通过 Node、Scope 与手写坐标重复完成这些工作；直接使用通用 Layout 仍需自行组合单元格外观和引用身份。

目标是在 Standard 提供宿主无关的 List 与 Map，供程序数据结构图、算法状态图和属性记录展示复用。输入是已经确定展示内容与顺序的绘图数据，不读取运行时对象、不执行映射查询或排序。Map 的两列表示键值角色；任意二维数据表、合并单元格、数据源绑定与表格操作仍由 Table 负责。

## 决策：两个呈现 composite，共享单元格契约

List 表达一维有序内容，可以横向或纵向排列。Map 表达有序键值条目，每条固定由 key 与 value 两个单元格组成，条目从上到下排列。对象字段记录直接使用 Map，不新增 Record 组件。

Standard 拥有结构、单元格角色、默认呈现与 lowering，并直接计算一维顺序位置、两列宽度与逐行高度；子内容自然测量与 replay 消费 Core 的公开能力，父级 proposal 尺寸解析复用 Layout 的纯计算工具。每格复用自然测量结果，不为简单排布嵌套 Grid 或 OverlayLayout composite。单元格背景、padding、border、corner radius 与 overflow 复用 Surface 契约和共享几何，不要求构造 Surface composite，不另建 box renderer。Core 继续拥有子图元、命名空间、锚点、主题、变换与 composite 注册机制。

List 与 Map 各有独立 schema 与 CompositeDefinition，分别使用 `standard.list`、`standard.map`。它们共享单元格输入与外观契约，但不公开一个以 mode 切换 List / Map / Table 的万能容器。

## 基础数据结构与公开契约

`ListSchema`、`MapSchema` 是 JSON-safe IR 真源，`IRList`、`IRMap` 由 `z.input` 派生并保持稀疏，解析快照由 schema output 派生。类型化 factory 保留输入；继承合并后再应用 schema 默认。以下为 Source 的最小形态：

```ts
// 单元格 content 支持文本字符串或合法的 Core IRChild，包括第三方 composite
{
  namespace: 'standard',
  type: 'list',
  layout: { direction: 'row', gap: 4, padding: 8 },
  style: { fill: 'gray', fillOpacity: 0.14, stroke: 'none' },
  items: [
    { id: 'slot-a', content: 'a' },
    { id: 'slot-b', content: 'b', style: { fill: 'dodgerblue' } },
  ],
}

{
  namespace: 'standard',
  type: 'map',
  layout: { gap: { row: 2, column: 4 } },
  style: { fill: 'gray', stroke: 'none', key: { fillOpacity: 0.4 }, value: { fillOpacity: 0.14 } },
  entries: [
    {
      key: { id: 'entry-a-key', content: 'a' },
      value: { id: 'entry-a-value', content: 'layout', style: { fill: 'dodgerblue' } },
    },
  ],
}
```

### 整体与单元格的 style / layout

整体与具体单元格均支持 `style` 和 `layout`，两者按语义分工：`style` 是直接视觉覆盖，`layout` 是尺寸、间距和排列。Source 不保留 `appearance`、`keyAppearance`、`valueAppearance` 别名。

| 位置                            | `style`                             | `layout`                                                       |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| List / Map 整体                 | 所有单元格共同的绘制样式            | 整体排列、gap、统一尺寸，以及单元格共同 padding / overflow     |
| Map `style.key` / `style.value` | key / value 两类单元格的视觉覆盖    | `layout.key` / `layout.value` 设置角色尺寸、padding / overflow |
| 单元格                          | 当前格的视觉覆盖，例如 `style.fill` | 当前格的 `width`、`height`、`padding`、`overflow`，覆盖继承值  |

整体间隙只通过 `layout.gap` 设置，单元格不拥有相邻格之间的 gap，避免双方重复定义同一间隙。方向与 gap 由整体 layout 决定；width / height 是可被角色与单元格覆盖的默认边框尺寸。

### 单元格

| 字段      | 契约                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `content` | 必填的字符串或一个 `IRChild`；复杂内容通过已有 Scope 或 Layout 组合，不引入平行内容模型                   |
| `id`      | 可选 Core 命名引用 id，指向单元格 allocation 矩形；独立于 content 自己的 id                               |
| `style`   | 可选稀疏视觉覆盖，与整体 style 使用同一 schema                                                            |
| `layout`  | 可选 `{ width?, height?, padding?, overflow? }`；尺寸为非负有限数或 auto，padding / overflow 复用 Surface |

style 的公开字段为 `color`、`fill`、`fillOpacity`、`stroke`、`strokeWidth`、`strokeOpacity`、`dashPattern`、`lineCap`、`lineJoin`、`dashOffset`、`opacity`、`font`、`textColor`、`cornerRadius`；实际字段名、类型与约束复用 Core graphic / stroke / font 原子和 Surface cornerRadius，不引入 CSS 字符串样式或另造颜色、字体契约。不提供单元格 zIndex：绘制层序由包装固定，整体 zIndex 仍是根 Scope 字段。

填充字段作用于单元格背景，stroke 系列作用于单元格边框，cornerRadius 同时控制背景、边框和 overflow clip 的边界；这些字段不作为 content 图形的隐式 fill / stroke。font 与 textColor 作为该格内容的继承默认，content 的显式样式优先，resetStyle 遵循 Core。opacity 对整个单元格输出只应用一次，不同时复制到外层包装与内部背景 / 边框以免相乘，fillOpacity 只影响背景，不降低文字透明度。color 沿 Core currentColor 解析规则消费。

视觉字段优先级从低到高为：**结构默认 → 整体 style → Map 的 style.key / style.value → 单元格 style**。键深值浅是最低优先级默认，不能覆盖作者显式提供的整体 fillOpacity。只合并 Source 中明确提供的字段，再应用尚未得到值的默认；font 等已有复合字段沿 Core 的对应合并规则，不能因只覆盖 font.size 而丢失继承的字体 family。显式 `0` 和 `'none'` 保留，清除背景用 `style.fill: 'none'`，清除边框用 `style.stroke: 'none'`。

布局字段按结构默认 → 整体 layout → Map layout.key / layout.value → 单元格 layout 合并，width / height 独立继承。省略表示继承，显式 auto 解除该轴继承的固定尺寸。padding 的对象值作为一个完整字段按 Surface 原有规则解析，不引入逐边隐式深合并。视觉与布局覆盖不修改 content 的原始 Source。

整体及单元格 layout 中的 padding 默认继承 8；未显式设置 overflow 时，最终任一轴为固定数值则使用 clip，否则使用 visible；其 Source 均保持稀疏，继承前不物化单元格默认。

### List

| 字段                    | 默认与行为                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| `items`                 | 必填有序单元格数组，允许为空                                               |
| `layout.direction`      | `row`；可为 `column`，不自动折行                                           |
| `layout.gap`            | `2`，相邻槽位间的非负有限距离                                              |
| `layout.width / height` | 非负有限数表示固定边框尺寸（含 padding），省略或 auto 为自适应；单格可覆盖 |
| `showIndex`             | `false`；启用时横排索引在槽位上方、竖排索引在左侧                          |
| `indexStart`            | `0`，非负整数；按当前显示顺序连续编号，不充当单元格 identity               |
| `style`                 | 所有槽位共用的单元格视觉样式                                               |

List 的字符串项同时提供 content 与 id，等价于 `{ content: text, id: text }`；schema 要求字符串非空白，重复 id 校验覆盖字符串与对象混用。React、Vanilla、factory 与 JSON IR 均保留该字符串形态，由 Standard resolve 解释。对象项未提供 id 时不从 content 推导；重复文字、空白文字或自定义样式使用对象项。

索引使用 Core 文本测量和继承字体，与槽位的距离为 gap；其自身参与整个 List 的布局与可见范围，但不扩大单元格 allocation。索引不独立登记 id。隐藏索引不保留索引空间。List 自适应轴取各格有效需求最大值，固定轴按指定值参与需求且允许单格不同尺寸。槽位内容在 padding 后的可用区域居中；padding 超出尺寸时居中点限制在该格边界内，固定轴不能通过缩放 content 达成。

### Map

| 字段         | 默认与行为                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `entries`    | 必填有序 `{ key, value }` 数组，两者均必填且分别接受字符串或单元格对象，允许空数组；不是 JavaScript Map，也不接受对象属性枚举作为隐式顺序 |
| `layout.gap` | `2`，或 `{ row, column }`；分别控制条目之间、键值之间的非负有限距离                                                                       |
| `style`      | 所有槽位共用的单元格视觉样式                                                                                                              |

Map 的 layout.width / height 设置共用单格尺寸，layout.key / layout.value 可分别覆盖。自适应列宽取各格有效需求的最大值，行高取本行最大需求；固定轴按指定值参与需求计算，不让其超出内容撑大轨道。单格固定覆盖保持实际宽高，在行列起点对齐，较小单格不拉伸，因此同列边框宽度或同行边框高度可能不同。内容在 padding 后的区域居中。相同展示 key 可以重复，因为 key 是绘图内容，不是运行时字典键；组件不去重、不覆盖、不推断 key 的相等性。

List 与 Map 承接除 style 外的 Core Scope props，根 id、transforms、placement、clip、theme、defaults、resetStyle、zIndex、meta、animations 与 localNamespace 沿 Core 规则生效；style 是本文定义的单元格视觉 surface，不作为根 Scope.style 向所有后代无差别透传。结构数组分别为 items / entries，不占用 Scope children 的公开语义。

## 布局与绘制行为

自然尺寸从下层 child 的测量结果和 Surface padding 得到，不从 SVG、Canvas 或 DOM 反推。单元格 allocation 与 content 的 allocation / visual bounds 分离，保留非零及负内容原点的 placement 语义。

组件向父 Layout 报告整个结构的自然需求；父级 exact / range proposal 按 Layout 的既有约束处理。内容结构在最终 allocation 中从起点放置，多余空间留在末端，不隐式拉伸槽位或增加间隙。父级可用尺寸无法容纳整组槽位、间隙或索引时 fail-loud。单格固定尺寸小于自然内容或 padding 时仍保留指定尺寸，内容按自然大小居中并默认裁切，不缩放、不为适配槽位自动折行。其空间引用与 inspection 使用实际单格矩形，而非整条轨道。零尺寸合法。

空数组的自然尺寸为零，不生成虚构槽位、索引或间隙；父级强制的容器尺寸仍沿 Layout 契约处理。无可见内容与普通 Core 空 Scope 一样参与 prune，显式命名和空间结果遵循 Core 空对象语义。

默认使用无描边填色：List 槽位、Map value 为 `gray` 且 `fillOpacity: 0.14`；Map key 为同色且 `fillOpacity: 0.4`。layout.padding 默认 `8`，style.cornerRadius 为 `0`，自适应 layout.overflow 为 `visible`，固定任一轴后默认 `clip`，默认 style.stroke 为 none，不生成边框。gap 表达槽位间留白，不另绘制网格线。只降低背景透明度，content 的文字保持继承颜色与不透明度。

这些是可覆盖的结构默认，不建立 named style registry。强调条目通过显式单元格 style 完成；键值同色深浅配对属于推荐用法，不由 Map 猜测业务状态。明暗主题沿 Core paint / theme 路径消费。显式 style.stroke 可用于其它呈现需求，不修改普通 Node 的默认外观。

单元格沿 Surface 的背景 → content → border 顺序绘制；content 的 zIndex 不穿透包装层。外层 authored Scope clip 作用于整体，单元格 overflow clip 只作用于该格内容。更改填充、去掉 border 或令背景不可见都不改变单元格布局与引用区域。

## 引用、空间结果与组合

单元格显式 id 对应不含 gap、索引和视觉溢出的 allocation 矩形，使用 Core 已有中心、标准方向锚点与矩形边界连接语义；外层变换作用于整个引用区域。content 的自有 id 保持自身几何语义，不被单元格 id 替换。

单元格 id 在当前 Core 命名空间登记，不通过字符串拼接生成 `list.item.key` 等隐式寻址格式。外层 `localNamespace`、登记时序、跨 frame 遮蔽与重复 id 诊断完全复用 Core；不增加 Standard 私有名称查找表。组件内重复显式单元格 id 属于输入错误，必须报告条目位置；与外部 authored id 的碰撞交 Core 处理。依赖单元格最终布局的外部路径沿 Core 延迟引用机制消费，不能用内部同级交叉引用构造循环尺寸依赖。

用于 inspection 的空间信息沿 Core qualified spatial handle 发布，与 authored id 命名引用分离：根 `container` handle 对应组件 allocation；有显式单元格 id 时，以 `cell:` 加该 id 作为 owner-local handle key，role 分别为 `list-cell`、`map-key`、`map-value`。无 id 的槽位不生成貌似稳定的索引 identity。后代 handles 保留 Core ownerPath，不复制内容坐标或建立平行空间 registry。

若 Core 命名引用需要几何 carrier，它只承担既有 authored reference 语义，不能代替 spatial sidecar；最终空间位置只由 Core 的变换与 replay 结果发布。任何所需下层能力缺失应先补所属 owner，不能用 renderer 回读或 adapter 特判补洞。

## Definition 与 authoring

- Standard 根入口导出 `ListSchema`、`MapSchema`、`IRList`、`IRMap`、对应 Source 类型、`createList`、`createMap`、`ListDefinition`、`MapDefinition` 及按需 provider，沿 Core 同一 CompositeDefinition registry 与 provider graph 接入。
- React 提供互斥的数据与组合入口。`List.items` 接受 `Array<string | { content: string; id?; style?; layout? }>`，`Map.entries` 的 key / value 分别接受字符串或 `{ content: string; id?; style?; layout? }`，普通文本无需包装对象；数据字段不嵌 JSX。组合入口为 `List > ListItem`、`Map > MapEntry > MapKey / MapValue`；ListItem、MapKey、MapValue 支持互斥的 `text` 或恰好一个 drawable child，并承接单格 id / style / layout。每条 MapEntry 必须有一个键和一个值；数组及 Fragment 透明展开，React empty node 被忽略。marker 只表达 authoring 结构，不进入 IR、registry 或 Scene。
- 数据与组合入口均交给 Vanilla 归一，保留字符串或单元格对象的输入形态，并得到等价的编译结果。React 类型和 marker 收集不复制 Standard schema、文本转换或布局逻辑。
- Vanilla 提供等价的 List / Map authoring helper；Map 的 key / value 也接受直接字符串，等价于 `{ content: string }`。单元格 content 接受字符串或现有 `InputChild`；字符串（包括空字符串）在 schema、factory 与持久化 IR 中原样保留，仅由 Standard resolve 展开为 position `[0, 0]`、零 padding / margin、fill / stroke 为 none 的文本 Node，并继承字体与文字颜色。嵌套 drawable 由根级 `context.normalizeChildren` 统一归一化并保留 provider dependencies 与 authoring sites，归一后字符串与 IRChild 均可进入 IR。React 与 Vanilla 都保留嵌套 providers 的公开装配协议，不扫描 IR 猜 definitions。
- 手写 JSON 必须注入 List / Map 与嵌套 content 所需的 definitions。缺失、重复和冲突沿 Core 诊断，不隐式全量注册。
- 第三方内容只要满足 Core child 测量与编译契约，就可以进入相同单元格路径；不按 Node、Plot 或特定 namespace 建立白名单。

## 失败语义与兼容性

未知字段、非 JSON Source、非法 content、负或非有限尺寸 / gap / padding、非整数 indexStart、组件内重复单元格 id 在 Source 边界失败。子内容缺失 definition、测量失败、无法满足 proposal 与 Core 命名引用失败沿下层错误保留原因和发生位置，不返回部分可用结构。

相同 Source、definitions、字体测量和主题环境在 React / Vanilla 下得到等价 IR、布局、Scene、空间结果与诊断。SVG / Canvas 不新增专用渲染分支。

这是新增 capability，不改变现有 Surface、Legend、Layout 或 Table 契约，不提供旧 helper 兼容别名。文档站消费正式组件后删除被替代的私有单元格实现；文档中的研究图配色与文字不进入 Standard 的领域模型。
