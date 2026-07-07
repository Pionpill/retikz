# ADR-03：抽象 mark 模型 + mark registry

状态：Accepted
决策日期：2026-06-17
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [ADR-04 mark surface convergence](./04-mark-surface-convergence.md) · [plot-design.md §2 / §8.3](../../../../../architecture/plot-design.md)

## 背景

旧 plot IR 把 `point` / `line` / `interval` / `sector` / `area` / `rect` / `rule` / `text` / `ribbon` 暴露为 9 个 shape-oriented mark。alpha.11 已经在 lowering 层把 interval / sector / rect 的 cell 投影机制统一，但 IR 仍保留多个图表形状名，导致 grammar 与实现抽象不一致。

同时，mark 下沉分发曾由写死的 `if (mark.type === ...)` 链完成，无法与 composite / coordinate / transform / scale 等 registry 范式对齐，也不利于后续自定义 mark。

## 决策

底层 mark 收敛为 6 个抽象数据几何 mark，并通过 mark registry 分发 lowering 行为：

| 抽象 mark | IR `type` | 收编旧形态 | 语义 |
| --- | --- | --- | --- |
| Point | `point` | `point` + `text` | 坐标元组上的 glyph / 文本锚点 |
| Path | `path` | `line` | 有序点构成的一维轨迹 |
| Region | `region` | `area` | 边界围出的可填充区域 |
| Interval | `interval` | `interval` + `sector` + `rect` | 正交区间积，经坐标系投影成柱、cell、扇区等 |
| Link | `link` | `ribbon` | source-target 关系几何的早期方向 |
| Reference | `reference` | `rule` | 固定位置或区间的参考约束 |

`sector`、`rect`、`text` 删除；`line` / `area` / `rule` / `ribbon` 分别改名为 `path` / `region` / `reference` / `link`。由于本里程碑仍处 0.x 收敛期，不保留旧别名。

`IntervalMark` 用坐标系无关的 `bounds` 描述每个 role 的区间来源：`band`、`span`、`extent`、`full`。bar、histogram、heatmap、stack、dodge、pie、donut、radial bar 都由同一个 `interval × bounds × coordinate` 机制表达。ADR-01/02 中 transform 产出的字段不变；旧 interval 专属读取字段被 `bounds.extent(from,to)` 取代。

`PointMark` 吸收 text：存在 `encoding.text` 时下沉为无边框文本 node，不存在时下沉为普通 glyph；`dx` / `dy` 用于文本微调。

## 实现状态

最终代码没有停留在早期“6 个内置抽象 mark + link”形态，而是继续演进为 `point` / `path` / `interval` / `reference` 四个内置 mark，加上 `CustomMarkSchema` 与 `MarkDefinition` registry。旧 `LinkMark` 方向被 [ADR-13](./13-relation-mark-anchor.md) supersede：通用关系图元改由 `RelationMark + AnchorRegistry + core Path` 表达。

## 实现指针

- mark schema 的静态真源仍在 plot IR schema 内；runtime registry 只负责 lowering 行为。
- mark lowering 分发由 `MarkDefinition` / mark registry 完成，内置与自定义 mark 复用同一查找与错误路径。
- interval cell / projected geometry 继续复用既有 `Cell` / `CellGeometry` / coordinate `projectCell` 通路。
- text lowering 与 point lowering 合并，文本是 point glyph 的一种输出形态。

## 影响

- ⚠️ BREAKING：删除旧 shape-specific mark type 与旧 interval 字段，不保留 0.x 兼容别名。
- 图表形态不再等同于底层 mark；bar / pie / heatmap 等成为 interval 在不同 bounds 与 coordinate 下的结果。
- 为 ADR-04 的 React / Vanilla / docs 表面收敛提供底层语义。
- 为 ADR-08 的公开自定义 mark registry 铺平内部结构。

## 不在本 ADR 范围

- 公开自定义 mark 的完整 schema / runtime 注入契约由 [ADR-08](./08-mark-custom-registry.md) 处理。
- chart 层的 stacked / grouped / percent 等高层 preset 不进 plot IR。
- Sankey / alluvial / 通用 relation 图元不由 `link` 承担；后续由 ADR-13/14 的 RelationMark 方向处理。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/03-mark-abstraction-registry.md`（封板全文）。
