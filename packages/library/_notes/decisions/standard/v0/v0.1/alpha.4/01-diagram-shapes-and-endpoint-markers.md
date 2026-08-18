# ADR-01：参数化图式 Shape 与端点 Marker

- 状态：Proposed
- 决策日期：2026-08-18
- 关联：[alpha.4 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md) · [Graph Entity ADR](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/07-entity-data-geometry.md) · [Graph Relation ADR](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/08-relation-data-geometry.md)

## 背景与目标

Core 已提供 rectangle、ellipse、polygon 等基础 Shape provider，以及 normal、open、stealth、circle 等基础 Arrow provider；Standard 进一步提供 contour、cross、sector、star、diamond 与 openDiamond。它们可以绘制基础节点和常见箭头，但流程图、架构图、学术模型图与数据关系图仍需要梯形、平行四边形、圆柱和 crow-foot 等通用形态。调用方目前只能重复手写 contour 点集或自定义 marker 几何，难以保持内容外接、边界求交、连接面、缩放、provider 装配与诊断一致

这些形态去除 Graph、Workflow、UML、ER 或神经网络等领域词汇后仍然成立，并可由直接作者与多个 Tier 2 包复用，因此属于 Standard 的通用绘图实现。Standard 只拥有几何 Definition 与静态 provider；Entity role、Relation kind、predicate、direction、cardinality 和 Theme selector 仍由相应领域包解释

本决策增加四个参数化 Shape definition 与两个端点 Marker definition。流程图六边形使用独立的可变宽高轮廓；菱形继续复用现有能力，不建立 renderer 分支或领域 preset catalog

## 决策

### 增加四个参数化 Shape definition

Standard `shape` 子入口增加 `trapezoid`、`parallelogram`、`hexagon` 与 `cylinder`。每项都通过 Core `ShapeDefinition`、Shape registry、Node resolve、layout、boundary、Scene emit 与 provider dependency graph 接入；内置与第三方 Shape 使用同一公开路径

公开参数契约为：

```ts
type TrapezoidShapeParams = Readonly<{
  shortSide?: SideValue;
  shortSideRatio?: number;
  cornerRadius?: number;
}>;

type ParallelogramShapeParams = Readonly<{
  slantDirection?: 'left' | 'right';
  slantAngle?: number;
  cornerRadius?: number;
}>;

type HexagonShapeParams = Readonly<{
  shoulderRatio?: number;
  cornerRadius?: number;
}>;

type CylinderShapeParams = Readonly<{
  axis?: 'vertical' | 'horizontal';
  capDepth?: number;
}>;
```

`SideValue` 直接复用 Core 的 `top | right | bottom | left` 共享词汇，不在 Standard 建立第二套 side enum。四个 params 类型以及 `TrapezoidShapeDefinition`、`ParallelogramShapeDefinition`、`HexagonShapeDefinition`、`CylinderShapeDefinition` 和对应静态 provider 从现有 `@retikz/standard/shape` 子入口公开；名称分别加入 `StandardShapeName.Trapezoid`、`StandardShapeName.Parallelogram`、`StandardShapeName.Hexagon` 与 `StandardShapeName.Cylinder`

`trapezoid.shortSide` 指定比相对侧更短的一边，默认 `top`；`shortSideRatio` 是短边长度与相对长边长度的比值，取值为 `(0, 1]`，默认 `0.72`。`1` 产生矩形退化形态，但仍使用 trapezoid definition。`cornerRadius` 是非负 user-unit 长度，省略或 `0` 表示尖角，并按每个顶点的无自交上限裁剪

`parallelogram.slantDirection` 指定顶边相对底边水平偏移的方向，默认 `right`；`slantAngle` 是斜边与水平边的夹角，取值为 `(0, 90]` 度，默认 `70`，`90` 产生矩形退化形态。`cornerRadius` 使用与 trapezoid 相同的非负长度和裁剪语义。作者需要纵向形态时使用已有 Node rotate，而不是建立第二套 axis 参数

`hexagon` 表达 draw.io / mxGraph 风格的可变宽高流程图六边形：左右各有一个侧向顶点，中间保留水平的上下边，而不是把六个顶点均布在外接圆上。`shoulderRatio` 是每侧斜肩水平深度与最终总宽度的比值，取值为 `(0, 0.5)`，默认 `0.25`，对应 mxGraph `mxHexagon` 的 `25% / 75%` 顶点位置；例如更宽的中部区域可以使用约 `0.17`。尖角形态的内容外接保证完整内容内框落在两个肩点之间的中央矩形中，即其宽度不超过最终宽度的 `1 - 2 * shoulderRatio`，高度不超过最终高度；有效 `cornerRadius` 大于 `0` 时必须进一步扩张外框，保证完整内容内框位于圆角裁剪后的最终轮廓内。minimumSize 或父级 allocation 扩张最终 bounds 时，绝对肩深随最终宽度按该比例变化。`cornerRadius` 使用与 trapezoid 相同的非负长度和裁剪语义。纵向形态继续使用 Node rotate

`cylinder.axis` 指定圆柱主轴，默认 `vertical`；`capDepth` 是每个端盖沿主轴占用的非负 user-unit 深度，默认 `8`。内容外接在主轴两端分别预留该确定长度，因此后续 minimumSize 或父级 allocation 只扩张外框时不会改变内容保留区；最终端盖深度在显式外框不足时仍裁剪到主轴长度的一半，避免两个端盖反转或自交。Cylinder 的外轮廓参与内容外接、boundary、connection envelope 与 bounds；可见端盖分隔弧只参与绘制，不形成内部连接边界或第二个 identity

四个 Shape 都根据内容内框计算完整外接尺寸，不把文本或 child 压到斜边、圆角或端盖区域。trapezoid、parallelogram 与 hexagon 的 direction、ratio、angle 保持无量纲，Node scale 时不改变；cornerRadius 与 cylinder capDepth 按 Core Shape contract 的 user-unit 长度缩放，Cylinder axis 保持不变

这些 Shape 只提供 Core 已定义的 center 与方向 anchor；不新增 `short-side`、`cap-center` 等专有 anchor。自动连接点使用最终外轮廓和 Core connection envelope contract，不能退化为外接矩形求交。Node rotate、style、padding、minimumSize、boundary、labels、transforms、Theme、identity 与 Scene 行为继续由 Core 拥有

### Hexagon 与 Core polygon 保持不同几何契约

Core `polygon { sides: 6 }` 只表达正六边形：六个顶点均布在同一外接圆上，内容外接、最终宽高与连接边界都受正多边形约束。Standard `hexagon` 则表达可变宽高的流程图轮廓，其局部顶点按最终 bounds 与 `shoulderRatio = r` 确定：

```ts
[
  [r * width, 0],
  [(1 - r) * width, 0],
  [width, height / 2],
  [(1 - r) * width, height],
  [r * width, height],
  [0, height / 2],
];
```

因此 `hexagon` 是独立 Definition 与 provider key，不是 Core polygon 的别名，也不 lowering 为 polygon。它必须基于同一最终轮廓实现内容外接、boundary、connection envelope、圆角与 Scene bounds。Standard 仍不为 rectangle 的胶囊形、ellipse 的 circle 或 polygon 的 diamond 增加重复 provider；作者明确需要正六边形时继续直接使用 Core polygon

### 增加 bar 与 crowFoot 端点 Marker

Standard `arrow` 子入口保留现有 `diamond` 与 `openDiamond`，并增加 `bar` 与 `crowFoot`：

- `bar`：垂直于路径末端切线的单条开放线段，用于阻断、抑制或其它由消费方定义的端点语义
- `crowFoot`：以路径末端为汇合点的三条开放射线，用于多重性或其它由消费方定义的分叉端点语义

两项都使用 Core `ArrowDefinition` 与 marker host，并声明为由 stroke 表达的 hollow marker，沿最终路径切线自动定向；描边继承当前 path stroke，默认宽度、显式 length / width、color、opacity 与 lineWidth 继续使用 `IRArrowEndDetail`。它们不消费 fill，不定义领域 direction，也不把 marker 名称解释为 cardinality

`bar` 和 `crowFoot` 必须提供确定的 line contact、tip extent 与 marker bounds，使 Path shrink、start / end 放置、反向路径与双端 marker 使用 Core 同一算法。它们通过 `BarArrowDefinition`、`CrowFootArrowDefinition` 及对应静态 provider 进入现有集合，名称分别加入 `StandardArrowName.Bar` 与 `StandardArrowName.CrowFoot`；不扩展 Arrow Definition 参数模型，也不引入可递归组合的 marker IR

Square、bracket、parenthesis、hook、rays 和 ER 组合 marker 不在本决策中。未来只有在真实消费者证明需要后，才按同一 Arrow Definition 路径增加独立通用形态；不能把多个 marker 名称编码成字符串语法或让 Graph 在 renderer 中拼装

### 子入口与领域消费边界

新增项只从 `@retikz/standard/shape` 或 `@retikz/standard/arrow` 的既有公共子入口导出，不从 Standard 根入口、React 或 Vanilla 根入口聚合。调用方可以直接把 Definition 放入 Core compile options，也可以贡献对应静态 provider；两种路径继续服从 Core 的重复 key、缺失 dependency、provider output 与未注册名称诊断

Graph 等 Tier 2 包可以在自己的 role / kind / predicate recipe 中引用这些 provider name，并静态贡献实际使用项。Standard 不导出 Entity role、Relation role、UML aggregation、workflow activity、database resource 或其它领域 recipe，也不根据调用方 role 自动安装 provider。相同 Shape 或 Marker 被直接作者、Graph、Plot、Table 或未来 Diagram 使用时，仍经过同一 Core registry、resolve、compile 与 Scene 主链

## 行为、失败语义与兼容性

- Shape params 是 JSON-safe strict object；未知字段、非法 enum、非有限数、越界 shortSideRatio / shoulderRatio / angle、负 cornerRadius / capDepth 或缺失必需 provider 时 fail-loud，并保留 Core 的 provider name 与 IR path 诊断
- Shape definition 必须使内容外接、boundary point、connection envelope、emit outer contour 与 Scene bounds 对同一几何达成一致；Cylinder 内部分隔弧不得扩大外轮廓或被当作连接边界
- Arrow definition 必须在 start、end、双端、反向 route、不同 length / width、path stroke / opacity 与 hollow/solid 邻接场景下复用 Core marker host；未注册 marker 继续由 Core fail-loud，不使用 normal 或 diamond fallback
- 新名称加入 Standard owner-local 名称常量、Definition 与 provider 集合；重复 key 与调用方自定义同名 definition 继续沿 Core provider resolver fail-loud，不使用 Standard 优先级或 last-wins
- 新增能力不改变 Core 默认内置 Shape / Arrow 集合，不改变现有 contour、cross、sector、star、diamond、openDiamond 的几何、导出或注册名
- `hexagon` 不作为 Core polygon 的 alias 或 preset，不从 contour 点集反推 trapezoid / parallelogram / hexagon，也不从 Shape / Marker 反推 Graph role、kind、predicate、direction 或 Theme
- 直接 Core IR、React、Vanilla、SSR 与官方 Tier 2 contribution 在相同 IR 和 provider 集合下必须得到相同 Scene、bounds 与诊断；adapter 不维护私有 Shape 参数默认或 marker geometry
