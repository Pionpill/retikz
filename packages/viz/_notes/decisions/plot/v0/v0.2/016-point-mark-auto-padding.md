---
description: 将点图自动留白的策略契约与最大半径计算归入 Plot，PointMark 默认 max-radius，Chart 保留图表策略选择并同步迁移文档
keywords: PointMark、autoPadding、max-radius、point-aware、domainPadding、Chart、留白、clearance
---

# ADR-016：PointMark 自动留白与 Chart 策略下传

- 状态：Accepted（2026-10-15 用户批准执行）
- 决策日期：2026-10-15
- 关联：[roadmap](./roadmap.md) · [逐点外缘留白](./012-mark-aware-domain-padding.md) · [Chart 最大半径留白](../../../chart/v0/v0.1/014-point-radius-domain-padding.md) · [Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)

## 背景与目标

点的坐标表示中心，位置极值映射到绘图区边缘时，半径可能伸出边界。当前 Chart 根据最终点图元计算最大半径，补齐位置尺度的 domainPadding；逐点策略则由 Chart 声明参与图元，再交给 Plot 求解。直接使用 PointMark 时没有同等的默认保护。

留白依赖图元尺寸、实际尺度绑定和最终绘图区，属于 Plot 的可视化语义。目标是让直接 Plot 与 Chart 复用相同计算，由 PointMark 声明需求，Plot 汇总尺度约束，Chart 只选择图表默认策略。

本决策修订 Plot ADR-012 与替代 Chart ADR-014 的策略入口和职责归属；未明确改变的逐点求解、净空单位、有效数据、坐标边界与收敛规则继续适用。

## 决策：图元声明策略，Plot 统一计算，Chart 选择默认值

PointMark 默认采用 max-radius。Plot 负责尺寸上界解析、留白需求与实际位置尺度的关联、方向净空换算、共享约束和最终布局。Chart 不再计算半径或生成派生的自动 padding 数值；它将策略传给最终保留的图元，并将作者明确指定的 domainPadding 转换为 Plot 尺度配置。

Chart 点图家族保留当前默认选择：Bubble 使用 point-aware，Scatter、Regression、Connected Scatter、Ranged Dot 和 Strip 使用 max-radius。用户显式策略优先于图表默认值；图元显式配置优先于 Chart 提供的默认策略。Chart override 移除的图元不参与计算，替换后的图元按最终配置参与。

Ranged Dot 使用 Relation 的端点节点，必须进入同一机制。RelationMark 可声明相同策略，仅约束实际存在的 source / target 节点，连线路径不参与；直接 RelationMark 默认关闭，Chart Ranged Dot 显式下传选定策略。这样保留 Chart 能力，同时不改变普通关系图的默认布局。

理由：

1. 图元的尺寸和尺度绑定由 Plot 拥有，Chart 不应维护另一套几何默认解析。
2. 多图元、双轴和分面需要在真实尺度及布局作用域上协调，不能由单个图元独立改写尺度。
3. React、Vanilla 与 JSON IR 应产生相同默认行为，不依赖宿主或 renderer 测量。

## 基础数据结构与公开契约

Plot 拥有自动策略的 schema 和 IR 类型，Chart 复用同一契约；四边净空复用 Core 的 IRBoxSpacing，不复制间距词汇。以下为公开字段的最小形态：

```ts
autoPadding?: false | 'max-radius' | 'point-aware' | {
  kind: 'max-radius' | 'point-aware';
  clearance?: number | IRBoxSpacing;
};
```

该字段用于 PointMark、RelationMark 及 Chart 点图 properties。PointMark 省略时为 max-radius，RelationMark 省略时为 false；Chart 在下传前确定各图表默认值。false 表示该图元不主动贡献自动留白需求，不阻止其它图元改变共享尺度，也不覆盖显式尺度配置。clearance 为有限非负绘图单位，省略为零；字符串等价于同策略、零净空的对象形式。

不在 Source 中保存计算出的半径、padding、尺度索引或逐点缓存。React props、Vanilla Input 和 JSON Source 使用同一字段与语义；领域默认与计算在 Plot，Vanilla 只完成 authoring 组装，React 复用 Vanilla。

### 尺度覆盖优先级

尺度 domainPadding 决定显式值，图元 autoPadding 只补自动端：

| 尺度配置           | 结果                                                        |
| ------------------ | ----------------------------------------------------------- |
| 省略 domainPadding | 按绑定到该尺度的图元策略计算                                |
| 数字，包括 0       | 两端完全显式，不自动补齐                                    |
| range 对象         | 显式 lower / upper 优先，省略端自动补齐；没有图元需求时为 0 |
| ratio 对象         | 保持现有语义，省略端为 0，不自动补齐                        |
| mark 对象          | 保留显式引用与逐点求解契约，不额外合并图元默认策略          |

显式 mark 分支是独立的尺度级约束，因此可引用 autoPadding 为 false 的图元；false 仅关闭隐式贡献。两端完全显式时，不执行无用的自动计算或自动能力检查。

Chart 的 properties.domainPadding 保留数字、四边 range / ratio 形式及优先级，encoding scale 的显式 domainPadding 继续优先。Chart 不改写 extension scale；但 extension scale 未声明 domainPadding 时，Plot 仍依据实际绑定图元执行自身默认行为。需要精确保持无自动留白时使用 domainPadding: 0。plotExtension 中的 PointMark 遵循 Plot 默认值，Chart 不向其注入图表策略。

### 最大半径与逐点策略

max-radius 保持图元级估算：常量 size 使用半径，字段 size 使用有效尺寸尺度 range 的最大半径，省略 size 使用 Point 的权威默认值；不为求最大值扫描数据行。尺寸上界必须有限且非负，不能从已解析尺度确定上界时明确失败，不猜测默认值。尺寸尺度的默认 range 复用 Plot 真源。

最大半径策略沿用现有适用范围，仅为连续位置尺度补留白；分类尺度维持自身 padding，需按实际外缘保护时选择 point-aware。其半径含义仍只涵盖 size，不包含 minimumSize、shape 缩放、旋转、描边、阴影、标签或文本包围盒，不能据此承诺完整节点包围盒保护。文本节点不从字号推断半径。

point-aware 继续复用 ADR-012 的 Mark、Scale 和 Coordinate domainPadding capability，以及已有 registry 和有界求解流程；支持的连续、分类、极坐标与 role-space placement 语义不变。不另建 renderer 测量或策略专用 registry。max-radius 是 Point 及 Relation 端点的尺寸上界策略，不强迫其它 Mark 提供“半径”语义。

净空按图元自身策略参与约束。数值作用于所有适用端；对象按具体方向、x / y、default、0 的顺序解析。四边仅用于笛卡尔坐标，反向轴按视觉方向换算；极坐标只接受 default 与角色方向，不能将视觉左右解释成角轴两端。

### 共享尺度与位置调整

按图元实际使用的位置尺度和坐标作用域归集需求，包括具名轴绑定；不同尺度互不借用最大半径。共享尺度中多个 max-radius 需求取各端“半径加净空”的最大值，不相加。混合策略时，该最大值构成自动端的最低留白，point-aware 在同一映射上同时满足逐点约束，不能让后处理策略覆盖前一个策略。

独立分面分别计算，共享尺度同时满足所有面板的约束。point-aware 使用位置调整后的实际位置，同一图元、角色的 jitter 保护不能重复累加；max-radius 继续与现有 placement containment 协作，保障尺寸与散布范围，不能把已包含的半径再计入一次。

最终尺度、坐标轴、网格、定位信息与图元使用一致映射。留白不改变数据、画布尺寸或节点尺寸。自动布局延续有界协调与最终约束验证，不引入渲染后回读。

## 行为、失败语义与兼容性

- PointMark 默认行为改变：未显式指定 domainPadding 的连续位置尺度自动留白。纯 Plot、Chart extension 点层以及 range 对象只覆盖一端的场景都可能改变视觉结果；不保留旧默认开关或双轨实现。
- max-radius 保留不扫描数据的成本特征，空数据不保证消除图元级估算；point-aware 的空有效点集不产生自动留白。两种策略的成本与保证不同，不能以扫描数据替换最大半径估算。
- 沿用 point-aware 的有效数据、显式 domain、域外点、共享域和坐标能力规则；完全显式的端点配置可跳过自动路径。
- 无效净空、无法确定有限非负尺寸上界、自动求解所需 capability 缺失、不可度量的位置调整、不可行绘图区或有界求解未获得可行结果时，由 Plot 报出可定位到 mark / scale / scope 的错误，不静默换策略。Chart 仅负责自身 recipe / override 配置错误。
- Chart-owned 默认点图在相同尺度、数据和策略下保持既有语义；图元与尺度关联更精确，多尺度及 extension 内容按上述新规则处理。Ranged Dot 端点不丢失保护。
- 现有尺度 mark 分支继续作为显式选择参与图元的独立能力保留，并非旧 API 兼容层。Chart 自动策略不再依赖自己制造该分支。
- 本次迁移不扩展节点包围盒测量、复合图元内容解析或性能测试范围。

## 文档所有权

PointMark 文档成为自动补齐边缘留白的用法、策略比较、覆盖规则和实现原理的主说明入口，承接相关可交互示例与两种策略的对照图。RelationMark 说明端点参与和默认关闭，链接到共同策略说明。

Chart Point 总览删除整个“实现原理”章节，包括“自动补齐边缘留白”；基础使用与 API 仅保留图表策略默认值、配置入口及到 PointMark 的链接，不重复讲解计算。Chart 各点图 API 同步引用 Plot 策略真源。代码迁移与中英文正文、示例、API 引用和导航链接作为同一交付，不留下双重原理 owner。
