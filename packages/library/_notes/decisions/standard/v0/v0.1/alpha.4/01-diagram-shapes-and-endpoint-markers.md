# ADR-01：参数化图式 Shape 与端点 Marker

- 状态：Accepted
- 决策日期：2026-08-19
- 关联：[alpha.4 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md) · [Graph Entity ADR](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/07-entity-data-geometry.md) · [Graph Relation ADR](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/08-relation-data-geometry.md)

## 背景与目标

Core 提供基础 Shape、Arrow Definition、registry、resolve、boundary、marker host 与 Scene 编译能力；Standard 在同一扩展主链上提供跨领域复用的官方几何。流程图、架构图、学术模型图与数据关系图仍需要梯形、平行四边形、长六边形、圆柱以及更多通用端点，调用方不应重复手写 contour 或 marker 几何

这些形态移除 Graph、Workflow、UML、ER 等领域词汇后仍然成立，因此由 Standard 拥有 Definition 与静态 provider。Entity role、Relation kind、predicate、direction、cardinality 与 Theme selector 仍由对应领域包解释

## 决策

### 参数化 Shape

`@retikz/standard/shape` 增加以下 Definition、公开参数类型、名称常量成员与静态 provider：

| 名称            | 参数与默认值                                                                         | 长期几何语义                                                         |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `trapezoid`     | `shortSide: SideValue = 'top'`、`shortSideRatio = 0.72`、`cornerRadius = 0`          | `shortSideRatio` 取 `(0, 1]`；`1` 退化为矩形                         |
| `parallelogram` | `slantDirection: 'left' \| 'right' = 'right'`、`slantAngle = 70`、`cornerRadius = 0` | `slantAngle` 取 `(0, 90]`；`90` 退化为矩形，纵向形态使用 Node rotate |
| `hexagon`       | `shoulderRatio = 0.2`、`cornerRadius = 0`                                            | 表达可变宽高的长六边形；每侧肩深为最终宽度的 `(0, 0.5)` 比例         |
| `cylinder`      | `axis: 'vertical' \| 'horizontal' = 'vertical'`、`capDepth = 8`                      | 每个端盖沿主轴预留非负 user-unit 深度；最终深度不超过主轴长度一半    |

公开参数类型分别为 `TrapezoidShapeParams`、`ParallelogramShapeParams`、`HexagonShapeParams` 与 `CylinderShapeParams`；对应公开 Definition 为 `TrapezoidShapeDefinition`、`ParallelogramShapeDefinition`、`HexagonShapeDefinition` 与 `CylinderShapeDefinition`，并提供匹配的静态 provider 与 `StandardShapeName` 成员

`SideValue` 复用 Core 的 `top | right | bottom | left` 共享词汇。参数均为 JSON-safe strict object；ratio、angle 与 direction 是无量纲语义，`cornerRadius` 与 `capDepth` 是随 Shape 缩放的 user-unit 长度

四个 Shape 都从内容内框计算能够完整容纳内容的最终外框。梯形、平行四边形与长六边形的圆角不得裁掉内容；圆角按无自交上限裁剪。圆柱端盖分隔弧只参与描边，不形成内部连接边界或独立 identity，近端端盖与主体使用同一 fill

内容外接、boundary point、connection envelope、emit outer contour 与 Scene bounds 必须消费同一最终轮廓。Shape 只提供 Core 已有的 center 与方向 anchor，不增加 `short-side`、`cap-center` 等专有 anchor；padding、minimumSize、rotate、style、Theme、identity 与 Scene 行为继续由 Core 拥有

### 长六边形与 Core polygon

Core `polygon { sides: 6 }` 表达顶点均布在外接圆上的正六边形。Standard `hexagon` 表达具有水平上下边和左右侧向顶点的可变宽高长六边形，肩点由最终 bounds 与 `shoulderRatio` 决定

`hexagon` 是独立 Definition 与 provider key，不是 Core polygon 的别名，也不 lowering 为 polygon。作者需要正六边形时继续使用 Core polygon

### 端点 Marker

`@retikz/standard/arrow` 保留 `diamond` 与 `openDiamond` 名称，将其默认轮廓修订为 TikZ 扁菱形，并增加以下 Definition、名称常量成员与静态 provider：

| 名称组                    | 长期几何语义                             |
| ------------------------- | ---------------------------------------- |
| `bar`                     | 垂直于路径末端切线的开放线段             |
| `crowFoot`                | 以路径接触点为汇合点的三条开放射线       |
| `diamond` / `openDiamond` | 默认长宽比为 `2:1` 的对称扁菱形          |
| `kite` / `openKite`       | 肩部位于默认长度四分之一处的不对称风筝形 |
| `square` / `openSquare`   | 默认长度与宽度相等的方形                 |

每个名称都公开匹配的 `ArrowDefinition`、静态 provider 与 `StandardArrowName` 成员

`bar` 与 `crowFoot` 是继承当前 path stroke 的 hollow marker，不消费 fill，也不绑定阻断、cardinality 等领域含义。Diamond、Kite 与 Square 的实心变体使用 arrow fill，未显式设置时继承 path stroke；open 变体只描边并忽略 fill。显式 `length` 与 `width` 继续由 Core Arrow host 独立缩放

所有 Marker 都提供确定的 line contact、tip extent 与 bounds，并复用 Core 的 Path shrink、start / end 放置、反向路径、双端 marker、hollow 外缘修正与主路径半描边接头覆盖。Standard 不增加 renderer 分支、递归 marker IR 或第二套端点参数模型

### 装配与领域边界

新增项只从 `@retikz/standard/shape` 或 `@retikz/standard/arrow` 导出，不聚合到 Standard、React 或 Vanilla 根入口。调用方可以直接注入 Definition，也可以贡献对应静态 provider；两种方式使用 Core 同一 registry、resolve、compile 与诊断主链

Graph 等 Tier 2 包可以在自身 role、kind 或 predicate recipe 中引用这些 provider name，并静态贡献实际使用项。Standard 不导出领域 role、relation、cardinality 或 recipe，也不根据调用方语义自动安装 provider

## 行为、失败语义与兼容性

- 未知字段、非法 enum、非有限数、越界 ratio / angle、负 `cornerRadius` / `capDepth`、非有限派生几何以及缺失或重复 provider 必须 fail-loud，并保留 Core 的 provider name 与 IR path 诊断
- 直接 Core IR、React、Vanilla、SSR 与 Tier 2 contribution 在相同 IR 和 provider 集合下必须得到相同 Scene、bounds 与诊断；adapter 不维护私有默认或 marker geometry
- 新能力不改变 Core 内置 Shape / Arrow 集合，也不改变 Standard 既有 contour、cross、sector 与 star。`diamond` 和 `openDiamond` 保留名称与装配方式，但默认几何改为 TikZ 扁菱形，属于 alpha 阶段有意的视觉 breaking change
- Shape 与 Marker 不反推 Graph role、kind、predicate、direction、cardinality 或 Theme

## 结果

Standard 的 Shape 与 Arrow 子入口已提供上述参数化 Shape 与端点 Marker，并保持直接 Definition、静态 provider 与 Core 编译主链一致。长六边形默认肩部比例为 `0.2`；圆柱端盖填充与端点接头覆盖符合本决策
