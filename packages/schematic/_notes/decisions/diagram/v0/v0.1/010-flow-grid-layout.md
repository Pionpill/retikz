---
description: Flow 网格布局，覆盖行列对齐、嵌套布局与尺寸约束；不负责连线路由
keywords: 'grid、网格、行列对齐、IRFlowLayout、GridLayout'
---

# ADR-010：Flow Grid 二维对齐布局

- 状态：Accepted
- 决策日期：2026-09-11
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow 平级 Source、Group 与 Layout](./007-flow-catalog-source-layout-groups.md) · [Flow Layout Definition 与 Registry](./004-flow-layout-definition-registry.md) · [Flow Orchestration、Result 与 Artifact](./005-flow-orchestration-result-artifact.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

流程图中的分支、缓存命中与回写等结构，需要多排节点同时共享行与列的中心线。独立的一维 Layout 只能对齐直接 children；嵌套排列时，父 Layout 对齐的是整行或整列的包围盒，不能让不同子 Layout 内的节点共享尺寸约束。通过独立 gap 和等宽内容凑出的对齐，会随语言、字号和节点形状变化而失效。

Flow 增加 Grid 固定排列，使作者通过行列位置表达二维结构，由真实内容测量决定尺寸。相同列的节点共享水平中心，相同行的节点共享垂直中心，作者无需手工计算节点坐标。

## 决策

### Grid 属于无绘制 Layout

`IRFlowLayout` 以必填 `kind: 'linear' | 'grid'` 区分一维排列与二维排列。二者继续位于同一个 `layouts` catalog，不新增第四类 Flow element，也不使用 Group 的外观或 role 表达排列方式。

Grid 和 Linear 均可包含 Entity、Group 或其它 Layout，并作为一个整体参加外层排列。Grid 只对齐自身直接 children 的测量 bounds；Group 或 Layout 的内部后代仍由其自身 owner 排列，不因外层 Grid 获得跨 scope 的共享行列约束。

Layout 不绘制边框，不产生 Graph identity，也不能作为 Relation endpoint。Graph 继续拥有 Entity / Group / Relation 语义；Diagram 拥有 Flow 排列意图、标签空间需求与 routing；通用二维轨道排版复用 `@retikz/layout` 的 Grid 公共组合能力，不引入外部布局引擎或复制 Grid solver。

### 包含顺序与单元格位置分别表达独立事实

根、Group 和所有 Layout 的 `children` 仍是唯一包含事实源。Grid 使用 `placements` 指定行列位置。推荐的二维矩阵中，外层下标是行，内层下标是列，非空单元格写 direct child id，`null` 保留空格；也接受以 direct child id 为键、值为 `{ row, column }` 的对象映射。两种结构只表达位置，不建立第二套 owner，不移动或重新包含被引用元素。

`children` 决定稳定遍历、绘制与 artifact 顺序，`placements` 决定空间位置；矩阵位置与 catalog 顺序不影响位置。两者不是可相互推导的重复事实：改变绘制顺序不改变单元格位置，改变单元格位置也不改变绘制顺序。

每个 direct child 必须恰好对应一个位置，位置只能引用 direct child。矩阵的行列由数组下标确定；对象映射的 `row` 与 `column` 显式从零开始。重复 child 或重叠坐标非法。当前不提供自动填充、跨行跨列或固定轨道宽高，避免为简单共享行列引入完整表格配置。

未占用的单元格保留为空，不创建占位 Entity、Graph identity 或 artifact element。行列范围由最大索引确定；索引空洞不压缩。全空轨道的内容尺寸为零，其两侧仍按相邻轨道间距处理；范围上限沿用 Layout Grid 的公开轨道限制，不重复保存可推导的行列数量。

### 共享中心线与内容驱动尺寸

Grid 的每个单元格在两个轴上都使用中心对齐。同列共享中心 x，同排共享中心 y；节点保留真实测量宽高，不被拉伸成同尺寸矩形。

列宽与行高由该轨道全部 direct children 的测量尺寸和空间需求共同决定。child margin 作为中心线两侧的碰撞留白参与尺寸需求；非对称 margin 不得移动 child 的真实 bounds 中心偏离行列中心线，允许在另一侧留下额外空白。

Group 的 shell minimum、caption 和 content insets 继续参与其自身测量，Grid 对齐最终 Group bounds，不穿透 shell 对齐其内部内容。改变文本、语言、Theme 或字号时重新测量并共同扩张轨道，保持中心线约束。

### 标签留白与连线

Grid 行列位置不由 Relation 推断，Relation 不重排 children。`rowGap` 和 `columnGap` 是相邻轨道间距，不是节点中心距；轨道尺寸由内容和 margin 决定。

Grid 默认使用 Core 真实测量的 relation label 整块视觉盒宽高自动扩张间距：横向关系把标签宽度加到 `columnGap`，纵向关系把标签高度加到 `rowGap`；跨行列关系在两个轴上分别预留空间。同轴关系取最大标签尺寸，并把该尺寸加到每个同轴间隙，因此同轴其它间隙也会一起增大，且结果与 relation 遍历顺序无关。`reserveLabelSpace` 省略时为 `true`；设为 `false` 后严格使用作者配置的行列间距，不为标签预留空间。

固定 placement context 从同一次 Flow measurement 消费标签约束，内置与自定义 provider 共用此边界，不额外暴露派生间距或复制标签尺寸。连接后代时以所属 direct child 的整体 bounds 参与空间分配，不穿透内部排列。Linear 保留已有标签 margin 行为；两种 Layout 的标签显示与路由继续沿用 Graph/Core 和所选 provider 的既有语义。Core 标签断口 gap 与 Grid 轨道留白是不同语义，不相互覆盖。

Flow provider 的节点尺寸不包含形状边界裁切信息，其 labelBounds 不作为最终标签显示位置的权威来源。实际裁切后路径上的标签几何一致性属于独立能力设计，不在 Grid 内复制形状求交或通过偏移标签实现。

跨 scope、跨越已占单元格、斜向、多重边和折线路由继续遵循所选 Flow layout Definition 的能力与 routing 契约；Grid 本身不增加任意路径的全局避障或标签互避保证。Grid 无独立流程方向，涉及它的 routing 继承最近外层有效 Flow direction；网格行列始终是物理上下、左右轴，不随该方向旋转。Linear 的 direction 继续同时确定其排列方向和局部 routing 方向。

## 基础数据结构与公开契约

以下类型表达最小公开形态；正式 IR 继续由 owner schema 派生：

```ts
type IRFlowLayout =
  | Readonly<{
      kind: 'linear';
      id: string;
      rank?: number;
      direction: 'right' | 'left' | 'down' | 'up';
      gap?: number;
      align?: 'start' | 'center' | 'end';
      children: ReadonlyArray<string>;
    }>
  | Readonly<{
      kind: 'grid';
      id: string;
      rank?: number;
      rowGap?: number;
      columnGap?: number;
      reserveLabelSpace?: boolean;
      placements:
        | ReadonlyArray<ReadonlyArray<string | null>>
        | Readonly<Record<string, Readonly<{ row: number; column: number }>>>;
      children: ReadonlyArray<string>;
    }>;
```

Linear 保留一维排列语义：`direction` 必填，`align` 缺省为 `center`，`gap` 缺省使用进入该 Layout 时的有效 `nodeGap`。Grid 的 `rowGap`、`columnGap` 独立缺省为进入该 Layout 时的有效 `nodeGap`，`reserveLabelSpace` 缺省为 `true`；显式 `0` 仍为有效间距，开启 label 预留时可被对应标签尺寸扩张。两者均为有限非负数，不把 `rankGap` 解释成网格行距。

Grid 不接受 Linear 的 `direction`、`gap` 或 `align`；Linear 不接受 Grid 字段。`rank` 在两种变体中都只约束整个 Layout 在外层自动布局中的层级，不影响内部单元格位置。

缓存图可以表达为一个 Grid Layout：

```json
{
  "kind": "grid",
  "id": "cache",
  "placements": [
    ["tex-request", "cache-lookup", "cached-content"],
    [null, "mathjax-processing", "parsing-result"]
  ],
  "children": ["tex-request", "cache-lookup", "cached-content", "mathjax-processing", "parsing-result"]
}
```

### 三入口与 provider 执行边界

Direct IR、Vanilla `InputFlowLayout` 与 React `FlowLayout` 表达同一判别联合。React 继续通过嵌套 children 收集唯一 containment，Grid 的 `placements` 可以使用矩阵或 id 映射，以相同的 authored id 指定位置；不新增只在 JSX 中存在的布局算法、行容器或隐式占位节点。

`FlowLayoutCapabilities` 增加必填、非空且无重复的 `placementKinds: ReadonlyArray<'linear' | 'grid'>`，catalog 如实暴露该集合；`compoundScopes` 继续描述含 Layout / Group 的递归结构支持。内置 layered 声明支持两种 placement，自定义 Definition 可以显式声明支持的子集。实际请求包含未支持的 placement kind 时，在 callback 前失败，不回退为一维布局。

`FlowLayoutExecutionContext.placeLayout` 保持同步和单次调用契约，其输入以 placement kind 区分有效 Linear / Grid 配置，并携带已测量 child 尺寸、margin 和 Grid 位置。内置与自定义 Definition 使用同一执行边界；Grid placement 复用 Layout Grid，Linear placement 继续复用 Layout Flex。

`FlowLayoutPlacementInput.layout` 使用 `kind` 判别：Linear 配置保留 `id / direction / gap / align`，Grid 配置为 `id / rowGap / columnGap / reserveLabelSpace / placements`，其中默认值已补全。`elements` 保留原有有序 `id / size / margin`，不新增标签输入契约；输出仍是 Layout 与各 child 的 bounds，不暴露 Grid solver 中间状态。

每个 authored Layout 必须恰好调用一次 `placeLayout`。provider 可以平移整个 Layout，但最终 Layout bounds 和各 direct child 的相对 bounds 必须与该次 placement 一致，不能在结果阶段独立吸附节点破坏已确定排列。具体行列尺寸、空间预留与位置均为派生结果，不回写 Source。

artifact 继续使用 `kind: 'layout'`、authored id、bounds 和有序 elements，不新增 Grid identity 或重复持久化 placement 配置。行列内部的空位不进入 elements，Relation 仍按根 Source 数组顺序对齐输出；SVG、Canvas 及其它 renderer 继续消费普通 Scene。

## 行为、失败语义与兼容性

- 相同 Source、definitions、Theme 和测量结果产生相同 placement、artifact 与 Scene；行列中心对齐以布局坐标成立，不依赖渲染像素取整
- 非法矩阵单元格或对象映射、重复 child、重叠坐标、placement 缺失、非 direct child 引用和行列范围超限在 Source 边界拒绝，诊断定位到 Layout 及相应 `placements` 字段；已有未知 child、重复包含和循环包含继续沿用 Flow 引用与 containment 诊断
- 不支持的 placement kind 使用 `DIAGRAM_FLOW_LAYOUT_CAPABILITY_UNSUPPORTED`，给出 Definition、Layout id 与缺失的 placement kind
- provider 改写固定 placement 或输出错误的 child 尺寸时使用 `DIAGRAM_FLOW_LAYOUT_OUTPUT_INVALID`；执行组合失败保留底层 cause，沿用 Diagram 物化失败边界，不静默降级
- 本决策被采纳并实施时，替代 ADR-007 的一维专属 Layout 形态，并更新 ADR-004/005 的 placement 输入、能力预检和结果保证；其余 Graph 语义、包含关系、identity 与同步执行边界保持有效
- 所有 Linear Source 和 authoring 调用显式补 `kind: 'linear'`，自定义 Flow layout Definition 显式声明 `placementKinds`。无 kind 的旧 Layout 不自动推断为 Linear，不保留旧 schema、alias 或双轨入口
