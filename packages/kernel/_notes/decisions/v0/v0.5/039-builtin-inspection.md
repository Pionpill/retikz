---
description: 扩展 Core 元素观测与内置 Inspector；背景：原有 Inspect 内置辅助内容只解释 stroke Path 的二次、三次贝塞尔控制点
keywords: 'Core、Inspector、outline、bounds、keyPoints、boundary'
---

# ADR-039：扩展 Core 元素观测与内置 Inspector

- 状态：Accepted
- 决策日期：2026-09-13
- 接受日期：2026-09-13
- 关联：[当前 roadmap](./roadmap.md) · [Inspector 独立包](./021-extensible-inspector-content.md) · [Drawing Complete](../../../architecture/core-drawing-complete.md)

## 背景与目标

原有 Inspect 内置辅助内容只解释 stroke Path 的二次、三次贝塞尔控制点。Core 虽然已经计算节点外框、文本排版、连接边界、裁切路径与 Scope 放置结果，但原有 observation owner 只支持 Path kind 和带 artifact 的 Composite。调用方无法通过统一选择规则检查这些 Core 元素，也无法区分节点外框、连接面和 Scene 坐标中的 AABB。

本决策把 Core 已确定的绘图事实接入同一观测链路，使 Inspect 能解释曲线构造、节点几何、文本布局、裁切边缘及容器层级。辅助内容仍是可选、只读的普通 Core 图形，不改变主图排版、相机、资源、身份或交互行为。

## 决策：观测最终几何，由 Inspector 选择呈现

Core 负责发布最终 occurrence 的领域事实；Shape、Boundary 和 Clip 的几何仍由相应 Definition 负责。Inspect 只把这些事实转换为辅助 IR，不重新执行主图的 provider、布局、文字度量或命名引用解析，不通过 Scene primitive 或 DOM 反推 authored 元素。

内置检查器以稳定编译对象组织。Shape 是 Node 的几何能力，不为 circle、ellipse、polygon 等名称各建一个 Inspector；曲线种类是 Path 命令，不各建一套 owner。所有内置和第三方检查器使用同一个 `defineInspector`、registry、选择、选项合并、隔离编译和错误路径。

### 内置检查内容

下表的布尔值是**已经显式选中该 Inspector 后**的默认值；仅导入或注册不启用任何辅助内容。所有选项均为稀疏输入，字段级继承，最后应用默认值。

| Inspector key     | 观测对象       | 选项与默认值                                                                                          | 绘制含义                                                                           |
| ----------------- | -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `core/path`       | stroke Path    | `controlPoints: true`、`vertices: false`、`arcGeometry: true`、`labels: false`                        | 二次/三次贝塞尔控制点和控制柄；可选子路径端点；圆弧/椭圆弧中心、起终半径和椭圆主轴 |
| `core/node`       | Node           | `outline`、`boundary`、`box`、`bounds`、`content`、`baselines`、`keyPoints`、`labels` 全部默认 `true` | 局部几何、正文排版、关键点与 Scene AABB                                            |
| `core/clip`       | 一次 Clip 应用 | `outline: true`、`labels: false`                                                                      | 最终裁切路径的全部子路径边缘，包括孔洞边缘                                         |
| `core/scope`      | Scope          | `envelope: true`、`origin: true`、`axes: false`、`labels: false`                                      | 当前 Scope 的固有包络、局部原点、正向坐标轴与层级标签                              |
| `core/coordinate` | Coordinate     | `labels: false`                                                                                       | 已解析坐标点；开启标签时附带 authored id                                           |

`core/node` 统一提供局部几何与 Scene AABB，使用独立选项控制可见内容。Layout 的 container、content、slot、allocation、visual、spacing、overflow 和 alignment guides 继续由 `@retikz/layout/inspect` 消费自身 artifact，Inspect 不复制布局 family 的语义。

### 曲线与节点语义

- 曲线检查以 `StrokePathOwnerOutput.commands` 为准，不还原 authored bend、generator 参数或原始 step。二次曲线有一个控制点、两条控制柄；三次曲线有两个控制点、两条端点控制柄。
- `arcGeometry` 对圆弧显示中心与两条端点半径；对椭圆弧再显示旋转后的两条主轴。圆弧不存在贝塞尔控制点，不能把中心标成控制点。整圆/整椭圆的重合起终点只绘制一次。
- `vertices` 显示 move、line、quad、cubic、arc、ellipseArc 的有效端点及 close 回到的子路径起点。只在同一 Path 内对重合标记去重，不能跨 occurrence 合并颜色或身份。
- Path 标签使用最终命令序号，不冒充 authored step 序号。既有逻辑路径在标签断线区域仍连续；辅助图不声称反映最终所有可见描边碎片、箭头轮廓或装饰轮廓。
- Node `box` 是 Shape 布局外接矩形经过 Node 自身旋转后的四边形；`boundary` 是当前默认连接面的真实轮廓，包含已解析 fit、gap、shape 参数，不等同于外框或描边外缘。
- Node `bounds` 是上述外框四角经过最终 Scope/replay 仿射变换后的 Scene 轴向包络，不是曲线的最紧解析包围盒，不包含 stroke、shadow、外置 label，也不因 Clip 缩小。
- `content` 是同次正文排版的占用盒，`baselines` 是该次排版的物理行基线，不重新测量文字，也不承诺逐字 glyph ink bounds。无正文时二者没有内容；Node 附属 label 和 Path label 不混入正文盒。
- Shape `keyPoints` 表示 provider 命名的结构点，不是全部 anchor 的枚举。矩形为四角，圆/椭圆为中心和主轴端点，多边形为有序顶点；圆角矩形/多边形保留构造顶点，因此关键点不一定落在圆角后的轮廓上。circle、diamond 等 preset 复用其已解析 provider 的能力。

## 基础数据结构与公开契约

### Core observation

`CompileObservationOwner` 在现有分支之外增加四种封闭的 Kernel owner：

```ts
type CompileObservationOwner =
  | Readonly<{ kind: 'composite'; namespace: string; type: string }>
  | Readonly<{ kind: 'path'; name: string }>
  | Readonly<{ kind: 'node' }>
  | Readonly<{ kind: 'scope' }>
  | Readonly<{ kind: 'coordinate' }>
  | Readonly<{ kind: 'clip' }>;

type CompileObservationAncestor = Readonly<{
  owner: Extract<CompileObservationOwner, { kind: 'scope' | 'composite' }>;
  occurrence: CompileOccurrenceLocator;
}>;
```

`CompileObservation` 增加 `ancestors: ReadonlyArray<CompileObservationAncestor>`，按最终逻辑容器从外到内排列，不包括自身。未被选择的容器仍保留在祖先链中，不需要为了计算深度而启用父级 Inspector。展开式与 layout-aware Composite 都可以作为祖先；是否有 artifact 不影响结构归属，不因此为无 artifact Composite 创建领域产物。深度、父节点索引和格式化标签由消费者计算，不再作为独立事实存储。

所有产物继续使用既有 owner-output schema、JSON-safe snapshot、冻结、按需捕获与最终 replay 提交机制。下表冻结新增公开产物的最小数据；`Rect`、`PathCommand`、`Position`、`SceneClipPath` 和 locator 复用 Core/Math 契约。

| 公开产物                | 数据                                                                                                                                                                                                                                                                                                                               | 坐标与缺省语义                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NodeOwnerOutput`       | `rect: Rect`；`shape: { name: string; outline: Array<PathCommand> \| null; keyPoints: Array<GeometryKeyPoint> \| null }`；`boundary: { name: string; outline: Array<PathCommand> \| null }`；`content: { corners: readonly [Position, Position, Position, Position]; baselines: Array<{ from: Position; to: Position }> } \| null` | 全部为 Node 所在 occurrence-local 坐标；已应用 Node 自身几何与旋转，尚未应用 observation transform。rect 保留自身 rotate；content 四角按左上、右上、右下、左下的排版顺序变换，null 表示无正文 |
| `ScopeOwnerOutput`      | `envelope: { shape: 'rectangle' \| 'circle'; rect: Rect } \| null`                                                                                                                                                                                                                                                                 | Scope 自身坐标中、应用自身 transforms/placement 前的固有包络；最终自身与祖先变换全部进入 observation transform。无参与包络的子布局时为 null，原点仍是 `[0, 0]`                                |
| `CoordinateOwnerOutput` | `id: string`；`position: Position`                                                                                                                                                                                                                                                                                                 | 已完成引用/极坐标解析的 occurrence-local 点                                                                                                                                                   |
| `ClipOwnerOutput`       | `path: SceneClipPath`                                                                                                                                                                                                                                                                                                              | 一次应用所在坐标系的最终 lowering 路径；不发布资源 id，不重新 resolve 或 lower                                                                                                                |

Node 产物直接投影同次 settled layout，不通过 `artifacts.nodeLayouts` 开关取得，因此开启 Inspect 不改变 primary artifacts。既有 `CompiledNodeLayout` 的 world-space 摘要继续保持原语义；不得把它作为 occurrence-local 数据再乘一次 transform。

Scope envelope 沿用 Core 的固有包络定义和 `boundingShape`，不是后代最终可见 primitive 的 union，也不是 Layout allocation。Path-only Scope 没有节点布局包络时不伪造包围框。Scope 层级检查表示最终逻辑容器层级，不是 renderer group 层级；没有可见 primitive 的 authored Scope 仍可观测。

Clip 以**应用**而非去重后的资源观测。普通 Scope clip、Composite 创建的 Scope clip，以及最终 replay wrapper clip 都发布；一次 wrapper 把相同 clip 应用到多个输出 primitive 时仍只发布一次。为该应用在宿主 final occurrence 后追加 `CompileExpansionKind.Clip = 'clip'` 段，`index` 是该宿主逻辑 clip 应用的稳定顺序；普通 Scope 自身的 clip 为 0。`provenance` 与祖先 occurrence 同步 remap，不依赖资源 id 或 primitive 数量。

Scope clip 的 transform 包含 Scope 自身的最终 transforms/placement；replay wrapper clip 按既有契约位于 placement 后的 parent allocation frame，因此不再包含 wrapper 内部放置子内容的 transforms。祖先变换仍正常应用。即使几何相同，不同逻辑应用也不合并为一个观察事件。

### Shape 与 Boundary 的几何出口

`ShapeDefinitionInput` 增加可选 `outline` 与 `keyPoints`；`BoundaryDefinitionInput` 增加可选 `outline`。它们是普通几何能力，不接收 Inspector 选项、颜色或 renderer 句柄。

```ts
type GeometryKeyPoint = Readonly<{
  name: string;
  position: Position;
}>;

// 仅展示 ShapeDefinitionInput<TParams> 的新增成员
type ShapeDefinitionInput<TParams> = {
  outline?: (rect: Rect, params: TParams) => ReadonlyArray<PathCommand>;
  keyPoints?: (rect: Rect, params: TParams) => ReadonlyArray<GeometryKeyPoint>;
};

// 仅展示 BoundaryDefinitionInput<TParams> 的新增成员
type BoundaryDefinitionInput<TParams> = {
  outline?: (rect: Rect, params: TParams) => ReadonlyArray<PathCommand>;
};
```

函数遵循已有 `boundaryPoint` 的 rect 坐标语义，包含 rect 的旋转，返回与该 rect 同坐标系的结构化几何。outline 的各轮廓显式闭合，不含视觉样式、描边厚度或 label；空数组表示合法空几何。keyPoints 的名称必须在同一实例内唯一，顺序由 provider 稳定定义；未知名称不能冒充可用于 NodeTarget 的 anchor。

Core 内置 rectangle、ellipse、polygon 及 circle、rectangle、ellipse Boundary 都提供精确 outline；Shape 提供上述关键点。`boundary: 'shape'` 使用同一 Shape outline。轮廓生成必须与 emit、boundaryPoint 共用所属 provider 的几何事实，不建立仅供 Inspect 使用的公式副本。

第三方 provider 没有声明某项能力时，相应 owner output 字段为 null，而不是采样圆、AABB 或空数组。Inspect 跳过这一项，输出带 owner/occurrence 的非致命 `UnsupportedGeometry` 诊断，仍绘制其它已支持的内容；仅在该项开关开启时报告。provider 声明了能力却抛错、输出非有限坐标、不闭合 outline 或重复关键点名属于 Core contract failure，不按“不支持”掩盖。

### Inspector 坐标与诊断

`InspectorOutput` 接受普通 Core child 或 `InspectorFragment`，也可返回两者混合的数组。片段结构为 `{ type: 'fragment', coordinateSpace: 'local' | 'scene', child: IRChild }`；裸 child 默认使用 local。Definition 不携带空间配置；`InspectorContext` 增加只读 `transform: AffineMatrix` 和上述 `ancestors`。transform 始终表示 observation-local 到主 Scene 的最终变换。

- `local` 的 callback 输出保持既有语义，plane entry 使用 observation transform。
- `scene` 的 callback 输出已经是主 Scene 坐标，plane entry 使用单位矩阵。`core/node` 的 `bounds` 片段 使用此模式，将 rect 四角正向变换后求 AABB；不通过逆矩阵把 Scene AABB 硬塞回局部坐标，因此负缩放、非均匀缩放及有限奇异变换都没有逆变换前提。
- 两种输出仍通过同一隔离 `compileFragment` 入口编译；只改变输出坐标约定，不更改捕获的 Theme/文字度量/provider 环境，不增加平行绘图 IR、renderer 分支或主图引用权限。

为声明受支持的部分结果，`InspectorContext` 增加 `warn(code: string, message: string): void`。回调警告进入既有 `InspectionDiagnostic`：origin 为当前 `inspect` 阶段，自动附 Inspector key、owner、occurrence；cause 保留 code/message，并使用当前 occurrence 的 sourcePath。内置与第三方同路，警告按 request 顺序及回调报告顺序排列，在该 request 的 fragment warnings 之前；回调失败时不返回先前积累的部分结果。

### 选择与宿主

scene、subtree、self 对所有 Inspector 使用同一选择规则，移除 Path kind 必须命中 self 才启用的限制。scene/subtree 只匹配请求明确指定的 Inspector key，不自动开启其它 Inspector，不自动装载 Layout definitions。更具体的 `options: false` 可以关闭，后代显式请求可以重开；barrier 仍不可重开。

Node、Coordinate 和 Scope 增加 authored self locator 准入；生成 occurrence 通过 final locator 精确选择。同一次 authored site 对应的多个 final occurrence 仍按既有排序和 `occurrenceIndex` 区分。Clip 可由 scene/subtree 批量选择，或通过 clip final locator 精确选择；不把 Scope self 偷换为它的 Clip self。

`InspectScope` 保持 subtree request 的既有语义，`InspectLayout` 仍是 Scene 宿主而不是新的 Core layout 元素。新增可选 React `InspectNode`、`InspectCoordinate` wrapper，复用基础 Node/Coordinate authoring 接线；Vanilla 通过相同的 `createInspectionVanillaAuthoring` 和显式 selection 表达等价规则。基础 React/Vanilla 根入口不识别 Inspector key 或选项。

Vanilla 的 `InputNode` 及对应 React props 增加领域中立的 `authoring?: unknown` 通道；Coordinate 从直接使用 IR 输入收敛为 `InputCoordinate = IRCoordinate & { authoring?: unknown }`，`InputChild` 接收它，`coordinate(id, config)` 接收该输入的配置并返回 `InputCoordinate`。`CoordinateProps` 同步透传 authoring，`InputAuthoringSiteKind` 增加 `'node' | 'coordinate'`。normalize 不把 authoring 写入 IR，只生成与 Core 对应的 `.node` / `.coordinate` sourcePath site；React 透传到 Vanilla，不自行拼装 locator。新增 Inspect wrapper 的 request 与 InspectPath 一样，只接受单项或多项 Inspector request，不接受只能用于容器的 barrier。该接线只是可选 runtime contribution，不改变 Node/Coordinate schema；带 authoring 的输入必须经过 Vanilla normalize，不能当作已归一的 Core IR 使用。

贡献内部缺少独立 authored site 的 Scope 不通过字符串猜测定位；可以使用 final occurrence self 精确选择，其 authored subtree barrier 限制保持原有明确失败语义。本决策不声称解决任意贡献内部 authored subtree 定位。

## 绘制样式

辅助内容按 resolved request 的稳定顺序，从当前 Core categorical 色板循环取色；每个 request 的线、点和文字保持同色。warning 使用 Core semantic warning。Shape 外观主题、作者 fill/stroke/defaults 不得意外覆盖检查器显式生成的辅助样式。

Inspect 不提供 Theme style preset、自由 paint/CSS 注入或逐元素样式配置。辅助轮廓无填充，正文标签背景透明，线型区分外框、连接面与正文盒，关键点和标签留出距离；同一视图内完全重合的轮廓可合并并保留语义标签。Scope 标签由最终祖先链导出深度，颜色本身不承担唯一的层级说明。

Clip 辅助层显示各次应用的完整路径，不继承主图 clip、不计算嵌套 clip 的布尔交集，也不把不可见区域重新画回主图。所有辅助线宽、点半径与文字尺寸使用 user units，不承诺缩放时屏幕像素恒定。

## 行为、失败语义与兼容性

- 未使用 observed compile、未选择 owner 或被 barrier 排除时，不为新增观测调用额外几何出口、克隆产物或执行辅助编译。所有 session 仍只消费最终提交结果，probe、失败候选、未选 replay 不产生 observe；complete 在全部 dispatch 后调用一次。
- 注册顺序与最终 occurrence 顺序共同决定稳定输出；同一 owner 可有多个不同 key 的 Inspector，重复 key 继续 fail-loud。默认 registry 扩展内置集合，但不会隐式生成 request。
- 空几何、无正文和空 Scope 是合法结果；能力缺失产生上述非致命诊断。无效 options、显式 self 无最终目标、owner 不匹配、非法产物、回调或片段编译失败保持原子失败，不返回部分 primary/plane，retained 宿主保留上一 committed frame。
- 开关辅助内容不得改变 primary Scene、artifacts、spatial handles、资源、身份拓扑、相机、布局及命中结果。SVG/Canvas 执行同一只读层，辅助内容不响应 pointer、hydration、动画或编辑操作。
- 这是 `0.x` 公开能力扩展：owner union 与扩展段新增分支需要消费者更新穷举；已有显式 scene/subtree Path 请求由“不绘制”改为“绘制”。Path 统一使用 `PATH_INSPECTOR`、`PATH_INSPECTOR_KEY`、`PathInspectOptionsSchema` 与 `core/path` key；Node 统一使用 `core/node` 并默认开启全部显示选项，空间由输出片段指定，不提供旧选择策略开关或兼容分支。
- 不改变持久化 Core IR。Source 原始参数可编辑性、箭头/装饰专用 Inspector、glyph 轮廓、领域布局 solver trace、跨 revision 稳定选中状态不由这些只读几何产物承诺。

## 实现摘要

五类内置 Inspector 共用既有 Definition、选择和隔离绘制链路。Core 发布 Node、Scope、Coordinate、Clip 的最终事实与祖先链，Shape/Boundary 提供可选精确几何；React 与 Vanilla 共享不进入持久化 IR 的 authoring 通道。Node 的局部几何和 Scene AABB 由同一 Inspector 按片段空间分别呈现，内置辅助样式不继承作者的图形默认值。

第三方缺失的几何能力只在相应显示项启用时报告，不以近似轮廓冒充支持。辅助标签采用固定偏移，不承诺任意密集图形中的自动避让；专项标签、箭头、装饰及布局求解轨迹仍不在本决策范围内。
