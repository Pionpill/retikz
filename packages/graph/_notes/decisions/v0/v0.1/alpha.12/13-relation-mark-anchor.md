# ADR-13：RelationMark + anchor id contract

状态：Accepted
决策日期：2026-06-26
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-03 mark abstraction](./03-mark-abstraction-registry.md) · [ADR-04 mark surface convergence](./04-mark-surface-convergence.md) · [alpha.3 ADR-05 relation](../alpha.3/05-relation.md) · [core Path target schema](../../../../../../kernel/core/src/schemas/path/target/schema.ts)

## 背景

ADR-03/04 早期草稿曾规划 `LinkMark` / `link` 作为 `ribbon` 的替代，但这个方向更偏 Sankey / alluvial 的流带几何，不适合承担“任意两个 plot 生成实体之间画一条 core Path”的通用关系能力。

真实需求是让 plot 生成的 datum geometry 暴露为稳定可引用 anchor，再用 core Path 的 target、anchor、boundary、arrow、label、route 能力表达关系。alpha.3 的 relation 是数据组合关系，不是本 ADR 的可绘制 source-target 图元。

## 决策

新增 plot 层 anchor contract：维度 mark 负责声明和注册可引用 anchor，`RelationMark` 负责解析 target 并降低为 core `Path`。

`AnchorIdSpec` 支持 `field`、`template`、`generator` 三种 id 来源，三者必须恰好选一；`prefix` 只负责命名空间。默认 id 挂在 plot local namespace 下，并通过 registry 查重。重复 id、缺失 generator、无法解析 anchor 都 fail-loud，错误包含 mark / row / id 上下文。

`PointMark`、`IntervalMark`、`PathMark` 增加 `anchorId`：

- point / interval 为每个成功渲染的 datum node 写入稳定 id。
- path 为有效路径顶点生成 core `Coordinate`，供 relation 指向。
- custom mark 可通过 lowering context 注册 anchors，与内置 mark 同机制。

`RelationMark` 支持 `source`、`target`、`via`、`route`、`label`、`path`。target ref 包含 node、anchor、projected 三类：node 直转 core NodeTarget；anchor 通过当前 row 生成 id 后转 NodeTarget；projected 通过 coordinate frame 投影，必要时生成 core Coordinate。

默认 route 是 `move(source) -> line(via...) -> line(target)`。显式 `route` 使用 core step 的 JSON-safe 子集；step target 扩展为 PlotTargetRef。`path` passthrough core Path 顶层能力，但对象字段首批只做常量传递。

## 实现指针

- lowering 前创建 plot-local `AnchorRegistry`，传给所有 mark definition。
- `MarkDefinition.lower` 接收完整 lowering context：provenance、anchors、anchor id generators 等。
- dimension mark 注册 anchors；relation mark 消费 anchors；custom mark 可同时注册与消费。
- registry 产出的 Coordinate 需要进入对应 layer 或 relation layer，保证 core Path target 可解析。

## 影响

- supersede ADR-03/04 中 `LinkMark` / `link` 方向；不新增 `PlotMark.Link` 作为通用关系能力。
- 新增 public `RelationMark`、`AnchorIdSpec`、`PlotTargetRef`、`RelationRouteStep` 等 schema / 类型。
- React 新增 `<RelationMark>`，并给 Point / Path / Interval props 增加 `anchorId`。
- core 不改动；只消费 core Coordinate、Path、NodeTarget、StepLabel 等既有能力。

## 不在本 ADR 范围

- 不实现 Sankey / alluvial 流带布局；未来可另立 FlowMark / RibbonMark。
- 不实现 AnnotationMark / CalloutMark，只预留 PlotTargetRef。
- 不做 graph layout、force layout 或 automatic edge routing。
- 不改变 locator provenance，也不删除 `datumIdField`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/13-relation-mark-anchor.md`（封板全文）。
