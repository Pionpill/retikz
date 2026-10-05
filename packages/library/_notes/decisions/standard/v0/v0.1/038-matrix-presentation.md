---
description: Matrix 以显式二维单元格、JSON 二维数据或示意骨架展示矩形结构，支持独立行列索引与单元格引用，不承担矩阵运算和数据表分析
keywords: Matrix、矩阵、collection、items、data、skeleton、行列索引、单元格、二维布局
---

# ADR-038：Matrix 二维单元格呈现

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md) · [030](./030-array-map-presentation.md) · [033](./033-array-index.md) · [034](./034-array-cell-identities.md) · [036](./036-nested-data-expansion.md) · [037](./037-collection-skeleton.md)

## 背景与决策

矩阵、二维数组、动态规划表和论文中的块结构需要稳定的行列对齐、单元格引用及无数据的示意骨架。嵌套 Array 的各行独立确定宽度，不能保证共享列轨道；绘图网格也不拥有每格的内容、身份与裁切语义。

Standard 新增 `standard.matrix` composite，拥有矩形单元格结构和呈现规则，复用既有 Cell、Core 测量与空间契约。Matrix 只展示输入，不执行矩阵运算、数值类型推断、排序、聚合、合并单元格或表头数据建模。

本决策获接受后，替代 ADR-030 将任意矩阵一概交由 Table 的边界：通用矩形格子属于 Standard；数据表语义、合并格及分析能力继续由 Table 主责。Array、Map 的既有输入和默认行为不变。

## 三种输入形式

`MatrixSchema` 是 JSON-safe Source 真源，`IRMatrix` 为其输入类型。Source 固定 `namespace: 'standard'`、`type: 'matrix'`，以下三种入口恰好选择一种，空值也不能混用。

| 入口      | 形态                                                    | 内容语义                                                            |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| 显式结构  | `items: Array<Array<string \| IRCell>>`                 | 每个内层数组是一行；文字原样显示，Cell 可指定内容、身份、样式与布局 |
| JSON 数据 | `data: ReadonlyArray<ReadonlyArray<JsonValue>>`         | 前两层确定矩阵行列，每格按 JSON 数据语义呈现                        |
| 示意骨架  | `skeleton: { rows, columns }` 或 `skeleton: { labels }` | 空格矩形，或二维格内符号；不要求真实数据                            |

显式字符串等价于 `{ content: text }`。Cell 沿用 `{ content?, id?, style?, layout? }`：省略 content 表示无内容，字符串表示文字，drawable 表示一个可绘制 child；多个图元可先组合为一个 child。`content: ''` 仍为文字，不能等同于无内容。

```ts
// 显式单元格
{
  namespace: 'standard', type: 'matrix',
  items: [['A', { content: 'B', id: 'selected' }], [{}, 'D']],
}

// 二维 JSON 数据
{
  namespace: 'standard', type: 'matrix',
  data: [[1, 2], [3, 4]],
}

// 无真实数据的矩形骨架
{
  namespace: 'standard', type: 'matrix',
  skeleton: { rows: 3, columns: 4 },
  layout: { width: 32, height: 32, gap: 0 },
}
```

Source 只保留所选入口，不额外保存可由 items、data 或 labels 推导的行列数量，也不持久化展开后的结构。factory 保留稀疏输入；显式 schema.parse 物化声明的静态默认，继承和上下文默认沿既有集合规则处理。

### 矩形约束与空结构

items、data 与 skeleton.labels 均要求每行等长，不填充、不截断、不广播，也不把一维数组自动变成一行。坐标按外层行、内层列解释，从上到下、从左到右排列；无转置或方向切换字段。

- `[]` 为 0×0，`[[], []]` 为 2×0；外层空数组不能表示正列数。
- skeleton 数量分支可明确表示 0×N 或 M×0。任一轴为零时没有单元格，整体自然尺寸为零，不显示行列索引、不保留轨道或间距；根标签、强制 allocation 与 prune 仍沿 Core 规则。
- 非空矩形允许无内容格、空字符串及重复值；不接受稀疏行或用 undefined 表示空格。

### JSON 数据

data 不解释单元格配置。即使某个值包含 content、style、id 或 type，也只是普通 JSON 对象。字符串按 JSON 字面量显示，数字、布尔值与 null 保持各自字面量；非 JSON 值沿既有外部输入边界拒绝。

`dataExpand: boolean | Array<'map' | 'array'>` 仅对 data 有效，默认 true。它作用于每格内部的结构，不改变 Matrix 的前两层行列；非空对象／数组展开为 Map／Array，未选中的结构显示紧凑 JSON，空对象／数组显示 `{}`／`[]`。生成的后代继续使用相同展开选择，不自动识别嵌套 Matrix，也不新增 `'matrix'` 选项。

整体样式与布局仅配置当前矩阵格，格内嵌套集合使用自身默认；字体和文字颜色沿既有内容继承规则处理。根标签与身份不传播到数据后代。

### 示意骨架

```ts
type MatrixSkeleton =
  { rows: number; columns: number; labels?: never } | { labels: Array<Array<string>>; rows?: never; columns?: never };
```

rows、columns 均为必填非负安全整数，其乘积也须为安全整数。labels 分支从二维文字推导形状，仍要求矩形；重复文字合法，空字符串表示无内容格，其他文字原样显示，不解析 JSON、模板或公式。

两分支互斥且为闭合对象。skeleton 不接受 dataExpand，也不增加逐格覆盖数组；需要逐格样式、身份或 drawable 时选择 items。默认空格尺寸由共享 padding 决定，不加入骨架专用宽高。

## 单元格布局与外观

Matrix 使用共享 Cell 的 style 与 layout，整体配置为单格的默认，单格同名配置优先；字体按字段继承。默认背景 gray / 0.14、无边框、无圆角，padding 为 8。宽高省略或为 `'auto'` 时自然确定；固定宽高为非负数，表示包含 padding 的单格边框尺寸，并非整个矩阵尺寸。

整体 `layout.gap` 复用非负行列间距契约，接受数字或 `{ row, column }`，默认 2；对象形式必须显式提供两个轴。Matrix 不提供行列配置数组、跨格合并或 Array 专属的 `'content'` 宽度模式。

每列宽度取该列各格有效需求的最大值，每行高度取该行最大值。无内容的自然内容尺寸为零，padding 仍参与需求。auto 格填满所属行列轨道；显式固定尺寸保持原值，可能小于轨道，从轨道左上角放置，不拉伸。列宽可以不同，行高可以不同；需要规整等大方格时显式设置整体 width / height。

内容在格内 padding 区域居中。固定尺寸下保留内容自然尺度并沿既有 Cell 动态默认裁切，显式 overflow 可覆盖；不缩放、不自动换行。相邻格独立绘制背景与边框，gap 为零不代表合并边框。数学括号、复杂标题和操作箭头通过外部绘图组合表达。

整体遵循父 Layout 的 exact / range proposal：不拉伸轨道或间距，多余空间留在末端；尺寸不足以容纳结构时失败。根变换、主题、defaults、命名空间及裁切沿既有集合的 Core Scope 契约；格内 clip 只影响该格内容，根 clip 作用于整体。

## 行列索引与标签

`index` 默认 false，可为布尔值或 `{ row?: boolean | AxisIndex; column?: boolean | AxisIndex }`。true 开启两轴自动编号；对象只开启明确设置为 true 或配置对象的轴，缺失或 false 的轴隐藏，`index: {}` 因而隐藏两轴。

每轴配置沿用集合索引的文字来源和样式语义：

- 自动编号：`start?: number`，非负安全整数，默认 0。
- 显式文字：`labels: Array<string>`，与 start 互斥；行标号数量等于行数，列标号数量等于列数，即使某一轴为零仍校验结构数量。
- `position?: 'before' | 'after'`，默认 before；行索引 before／after 为左／右，列索引 before／after 为上／下。
- `style?` 使用既有索引文字外观契约，继承整体字体和文字颜色，各轴自身覆盖优先，不受单格覆盖影响。

行标号相对行轨道垂直居中，列标号相对列轨道水平居中。索引位于格外，行索引使用 column gap，列索引使用 row gap 与单元格区域分隔；两轴交汇角落留空，不生成一个额外格子。索引带参与整体 allocation，不改变单格尺寸。

空标号不绘制；某轴全部为空时不保留该轴索引带或额外 gap。重复标号合法，不推导身份。skeleton.labels 是格内内容，可与独立的行列 index.labels 同时使用。

```tsx
<Matrix
  skeleton={{
    labels: [
      ['a₁₁', 'a₁₂'],
      ['a₂₁', ''],
    ],
  }}
  index={{ row: { labels: ['r₁', 'r₂'] }, column: { start: 1 } }}
  layout={{ width: 40, height: 32 }}
/>
```

根 `label` 与 Array／Map 一致，接受 Core Node label 的单个配置或数组；附着于含索引带的容器 allocation，参与可见范围但不撑大 allocation。空矩阵也可有标签；复杂 drawable 标题仍使用外部布局。

## 单元格身份与空间引用

`cellIdMode: 'explicit' | 'index'`，默认 explicit。explicit 只登记单格显式 id；index 要求 Matrix 有 id，为三种输入的每个直属格生成 `<matrix-id>-<row>-<column>`，坐标均从零开始，与显示索引的起点和文字无关。Matrix 不提供 string 模式。

公开 `getMatrixCellId(matrixId, row, column)` 返回该名称，校验非空白 matrixId 与两个非负安全整数，不检查格子是否存在。插入、删除或重排后坐标身份对应当前位置；需要跟随内容的身份使用显式 id。

显式格 id 可作为坐标身份的别名，两者共享同一条空间记录；同格重名去重，跨格身份或别名冲突失败。单元格引用边界是实际格子 allocation，不包含轨道中的剩余空白、gap、索引或内容溢出；content 自身 id 仍有独立几何语义。

根 inspection handle 沿用 container，具名格使用既有 `cell:<id>` owner-local 身份和 `matrix-cell` 角色；无身份格不生成额外 handle。命名空间、外层变换、连接锚点、延迟引用和后代 ownerPath 均复用 Core 语义，不建立私有坐标查找协议。

## React、Vanilla 与注册

公开入口沿用 collection：Standard 提供 `MatrixSchema`、`IRMatrix`、`createMatrix`、`MatrixDefinition`、`MatrixProvider` 与坐标身份 helper；Vanilla 提供 `matrix()`、`InputMatrix`、`MatrixInputEmbedAdapter`；React 提供 Matrix 及配套 props。

React 的 Matrix 支持三种同名属性入口；items 的 drawable 用法与已有集合一致，属性接受文字或文本 Cell，图形使用 `MatrixRow`／`MatrixCell` children。children 只是 items 的 authoring 形式，不是第四种 Source 入口。

```tsx
<Matrix id="m" cellIdMode="index">
  <MatrixRow>
    <MatrixCell text="A" />
    <MatrixCell>
      <Map skeleton={{ keys: ['k'] }} />
    </MatrixCell>
  </MatrixRow>
  <MatrixRow>
    <MatrixCell />
    <MatrixCell text="D" />
  </MatrixRow>
</Matrix>
```

MatrixRow 只表达行分组，不拥有 id、style 或 layout。行列 markers 必须出现在对应直属父级，沿现有集合规则透明展开数组和 Fragment、处理 React empty node；MatrixCell 的 text 与唯一 drawable children 互斥，均省略时为空格。缺失的格子不会自动补齐；空行可表示零列，但所有行仍须等长。

Matrix 未提供任何内容入口时表示空组合；Vanilla、factory 和直接 IR 必须显式选择入口。所有属性入口与 children 互斥，第三方 drawable 走同一公开接入方式。

React 与 Vanilla 自动收集 Matrix、裁切及显式内容的所需 provider；data 入口同时装配 Array／Map 的递归呈现能力。直接 IR 由作者显式注入 Matrix 与实际内容所需定义，启用 Cell 裁切时注入 PathClip；data 入口需注入 Array、Map、PathClip。不依赖 renderer 特判、不反向依赖 Table 或 Graph。

## 失败语义与兼容性

入口混用、非二维或不等长行、未知字段、非法骨架数量、非字符串符号、非法索引数量或起点、skeleton／items 搭配 dataExpand、无根 id 的 index 身份模式及重复身份，在对应 Source／authoring 边界失败，诊断保留字段与行列位置。非有限或负尺寸、gap、padding 沿共享 schema 拒绝。

无效 marker 结构在 React authoring 边界失败。缺失定义、第三方内容、测量、proposal、引用与裁切错误保留下层原因，不返回部分矩阵。相同输入及环境在 React、Vanilla、直接 IR 下产生等价布局、Scene 与空间结果。

Matrix 是新增独立能力，不让嵌套 Array 隐式变为 Matrix，不改变 Map 或 Array 的尺寸与数据解释。方案接受后同步公开 API、双语文档与可执行示例；Accepted 表示设计获批，不表示实现或发布完成。
