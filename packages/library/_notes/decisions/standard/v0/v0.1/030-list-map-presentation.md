---
description: 为数组与键值记录提供通用 List、Map，支持显式单元格与 JSON data 递归呈现，复用既有布局与绘制契约
keywords: List、Map、JSON、data、数据结构、presentation、cell、anchor、Surface、Layout
---

# ADR-030：List 与 Map 数据结构呈现

- 状态：Accepted
- 决策日期：2026-09-19
- data 扩展状态：Accepted（2026-09-20）
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [ADR-015](./015-presentation-composite-reuse.md) · [ADR-022](./022-arbitrary-child-surface.md) · [Layout ADR-001](../../../layout/v0/v0.1/001-layout-package-family.md) · [Core ADR-028](../../../../../../kernel/_notes/decisions/v0/v0.5/028-qualified-spatial-handles.md)

## 背景与决策

数组、队列、命名表与对象记录需要可复用的槽位、键值配对及单元格引用。Standard 提供独立的 `standard.list`、`standard.map` composite：List 横向或纵向排列一维内容，Map 按行排列两列键值。两者共享单元格契约，不合并为万能容器，不新增 JSON / Record 组件；任意矩阵、合并格及领域数据处理仍归 Table 等领域能力。

Standard 拥有结构、默认呈现和 lowering，直接计算简单行列位置，复用 Core 自然测量与 replay、Layout 的 proposal 尺寸契约及 Surface 盒模型和几何。每格复用测量结果，不嵌套 Grid / OverlayLayout 来完成简单排布，也不建立平行 IR、布局引擎或 renderer。命名、主题、变换、注册与空间结果由 Core 拥有。

## 输入与 authoring

`ListSchema` / `MapSchema` 是 JSON-safe Source 真源，`IRList` / `IRMap` 由 schema 输入派生。factory 与 adapter 保留稀疏 Source；继承合并后应用默认，直接 schema.parse 则得到默认已物化的快照。公开入口提供对应 schema、类型、factory、Definition 和 provider。

| 入口       | List                             | Map                                                              |
| ---------- | -------------------------------- | ---------------------------------------------------------------- |
| 显式结构   | `items: Array<string \| Cell>`   | `entries: Array<{ key: string \| Cell; value: string \| Cell }>` |
| JSON 数据  | `data: ReadonlyArray<JsonValue>` | `data: JsonObject`                                               |
| React 组合 | `ListItem`                       | `MapEntry` 内各一个 `MapKey`、`MapValue`                         |

每个组件的 data、显式结构、React children 互斥，空集合也不例外。React 无输入表示空组合；Vanilla、factory、直接 IR 必须显式选择入口。Map key/value 均必填，展示键可重复且不去重；显式数组决定顺序。

单元格为 `{ content, id?, style?, layout? }`：Source content 是文本或一个 `IRChild`，Vanilla 接受对应 `InputChild`；React 属性配置只接受文本，drawable 通过 marker children 提供。marker 的 text 与恰好一个 drawable child 互斥，数组 / Fragment 透明，React empty node 忽略；多个图元先组合为一个 child。

List.items 字符串等价于 `{ content: text, id: text }`，必须非空白且 id 唯一；对象项不推导 id。Map 字符串仅代表 content。文本原样保存在 Source，由 Standard resolve 转为零 padding / margin、无背景和描边的文本节点，继承字体和文字颜色。

React 经 Vanilla 表达同一契约；adapter 仅归一 authoring、保留嵌套 provider contributions 与 authoring sites，不复制领域解释或扫描 IR 猜定义。第三方 drawable 走相同 child 契约。直接 IR 显式注入组件及内容定义；data adapter 同时装配 List、Map、PathClip，避免 provider 双向依赖，直接 IR 的 data 入口也需注入这三项能力。

## JSON data

复用 Foundation JSON 类型，Source 保留 data，由 Standard resolve 逐层解释，不同时持久化展开后的 items / entries。

| 值                     | 呈现                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| 非空对象 / 数组        | 分别递归为 Map / List                                            |
| 字符串与对象键         | 带引号和必要转义的 JSON 字面量，区分空字符串、`"null"` 与 `null` |
| 有限数字、布尔值、null | JSON 字面量，保留 0、false、null                                 |
| 嵌套空对象 / 数组      | 文本 `{}` / `[]`；空根结构仍为零自然尺寸                         |

对象遵循 ECMAScript 自有可枚举字符串键顺序，整数索引键优先，不排序；数组保持顺序和重复值。所有字段均为普通数据，包括 id、style、content、type、namespace；生成的格和嵌套容器不推导 id，根显式 id 仍有效。

data 只接受 JSON 值树，不接收函数、undefined、Symbol、BigInt、非有限数、稀疏数组、循环引用、Date、Map / Set 或自定义实例；不调用 toJSON、序列化清洗或生成循环占位。沿既有类型化输入与外部 parse 边界校验，不重复反射验证。

style / layout 仅控制当前层生成的格，嵌套结构使用自身默认；字体、textColor、currentColor、theme / defaults 沿 Core 继承，外层 opacity、变换和 clip 作用于子树而不重复施加。父格固定宽高裁切整个嵌套图，不将尺寸、gap、填充或角色覆盖递归复制到后代。

默认完整展开，不提供深度限制、折叠、路径样式、formatter 或编辑功能。局部展示先投影数据；逐格样式、id、drawable 使用显式结构，也可在其中嵌套带 data 的组件。

## 样式、尺寸与默认值

| 配置            | 契约                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `style`         | 复用 Core color、fill / stroke、opacity、font、textColor 原子及 Surface cornerRadius；不提供单格 zIndex |
| `layout`        | width / height 为非负有限数或 auto；padding / overflow 复用 Surface；gap 仅属于整体                     |
| Map 角色覆盖    | `style.key/value`、`layout.key/value`，不保留顶层角色别名                                               |
| 默认外观        | gray 填充、无描边、cornerRadius 0；List / Map value 的 fillOpacity 为 0.14，Map key 为 0.4              |
| 默认布局        | gap 2、padding 8、宽高自适应；最终任一轴固定时 overflow 默认 clip，否则 visible                         |
| List 排列与索引 | direction 默认 row，可为 column，不折行；showIndex 默认 false，indexStart 默认 0 且为非负整数           |
| Map 间距        | gap 接受数字或 `{ row, column }`                                                                        |

覆盖顺序为 **结构默认 → 整体 → Map 角色 → 单格**。只合并显式字段再补默认；font 按字段合并，padding 对象整体替换，width / height 独立继承，auto 解除该轴固定尺寸。0、none 保留，覆盖不改写 content Source。

fill / stroke 只作用于背景和边框，不泄漏到 content；cornerRadius 同时约束背景、边框和裁切。font / textColor 是内容默认，content 显式值优先；color、resetStyle 沿 Core。opacity 对格及其内容只应用一次，fillOpacity 只影响背景。

List / Map 承接除 style 外的 Scope props；根 id、frame、transforms、placement、clip、theme、defaults、zIndex、meta、animations、localNamespace 等沿 Core 语义，整体 style 专用于单元格视觉。

## 布局与绘制

自然需求由 child 测量和 padding 得到，不回读 DOM / SVG / Canvas；单元格 allocation 与内容 allocation / visual bounds 分离，保留非零及负内容原点。

List 自适应轴取各格有效需求最大值；Map 自适应列宽取列最大需求，行高取本行最大需求。固定轴以指定尺寸参与计算，较小格从轨道起点放置而不拉伸。内容在 padding 后区域居中，padding 超出尺寸时居中点限制在格内；固定格保留自然内容并裁切，不缩放或自动折行。

List 索引位于横排上方或竖排左侧，距离为 gap；使用继承字体，参与整体需求，不扩大单格 allocation，不登记身份，隐藏后不保留空间。

整体遵循父 Layout exact / range proposal，从 allocation 起点排布，多余空间留在末端，不拉伸槽位或间隙；无法容纳整组内容时失败。零尺寸合法，空结构无虚构槽位、索引和 gap，强制尺寸、prune 与空对象命名沿 Core。

每格按背景 → content → border 绘制，content zIndex 不穿透包装；根 clip 作用于整体，格内 overflow clip 只作用于该格内容。关闭填充或边框不改变布局和引用区域。

## 引用与空间结果

单元格 id 指向其 allocation 矩形，不含 gap、索引和视觉溢出；中心、方向锚点及连接边界复用 Core，外层变换正常生效。content 自有 id 保留自己的几何语义。

登记顺序、localNamespace、frame 遮蔽、外部碰撞和路径延迟引用沿 Core；不生成拼接式命名路径或私有查找表，不允许引用构造循环尺寸依赖。组件内重复单元格 id 报告具体位置。

Inspection 与命名引用分离：根 handle 为 `container`，有 id 的格以 `cell:<id>` 为 owner-local key，role 为 `list-cell`、`map-key`、`map-value`；无 id 不生成索引身份。后代保留 Core ownerPath，变换与 replay 发布最终空间位置，不复制坐标或以几何 carrier 替代 sidecar。

## 失败语义与兼容性

未知配置、非 JSON Source、错误 data 根类型、入口混用、非法 content、负或非有限尺寸 / gap / padding、非法 indexStart、重复格 id 在 Source 边界失败。缺失 / 冲突定义、测量、proposal 与引用失败保留下层原因和位置，不返回部分结构。

相同 Source、definitions、测量和主题在 React / Vanilla 下得到等价 IR、布局、Scene、空间结果与诊断，SVG / Canvas 无专用分支。本能力不改变 Surface、Legend、Layout、Table 契约，不保留旧 helper 兼容别名；具体文档图配色与业务含义不进入组件模型。
