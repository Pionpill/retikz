# ADR-03：抽象 mark 模型 + mark registry

状态：Accepted
决策日期：2026-06-17
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [ADR-04 mark surface convergence](./04-mark-surface-convergence.md) · [plot-design.md §2 / §8.3](../../../../../architecture/plot-design.md)

## 背景

旧 plot IR 把 `point` / `line` / `interval` / `sector` / `area` / `rect` / `rule` / `text` / `ribbon` 暴露为 9 个 shape-oriented mark。alpha.11 已经在 lowering 层把 interval / sector / rect 的 cell 投影机制统一，但 IR 仍保留多个图表形状名，导致 grammar 与实现抽象不一致。

同时，mark 下沉分发曾由写死的 `if (mark.type === ...)` 链完成，无法与 composite / coordinate / transform / scale 等 registry 范式对齐，也不利于后续自定义 mark。

## 决策

底层 mark 收敛为 5 个内置抽象数据几何 mark，并通过 mark registry 分发 lowering 行为：

| 抽象 mark | IR `type`   | 收编旧形态                     | 语义                                                    |
| --------- | ----------- | ------------------------------ | ------------------------------------------------------- |
| Point     | `point`     | `point` + `text`               | 坐标元组上的 glyph / 文本锚点                           |
| Path      | `path`      | `line` + `area`                | 有序轨迹；可选 closure 表达可填充区域                   |
| Interval  | `interval`  | `interval` + `sector` + `rect` | 正交区间积，经坐标系投影成柱、cell、扇区等              |
| Relation  | `relation`  | `ribbon` 与关系 path           | 通过 anchor / projected target 表达 path 或 ribbon 关系 |
| Reference | `reference` | `rule`                         | 固定位置或区间的参考约束                                |

`sector`、`rect`、`text`、`line`、`area`、`rule`、`ribbon` 作为独立 mark type 删除；对应语义分别由 interval、point、path、reference 与 relation 承接。由于本里程碑仍处 0.x 收敛期，不保留旧别名。

`IntervalMark` 用坐标系无关的 `bounds` 描述每个 role 的区间来源：`band`、`span`、`extent`、`full`。bar、histogram、heatmap、stack、dodge、pie、donut、radial bar 都由同一个 `interval × bounds × coordinate` 机制表达。ADR-01/02 中 transform 产出的字段不变；旧 interval 专属读取字段被 `bounds.extent(from,to)` 取代。

`PointMark` 吸收 text：存在 `encoding.text` 时下沉为无边框文本 node，不存在时下沉为普通 glyph；`dx` / `dy` 用于文本微调。

## 最终状态

最终公共面为 `point` / `path` / `interval` / `reference` / `relation` 五个内置 mark，加上 custom mark operation 与 `MarkDefinition` registry。`PathMark` 通过 closure 承接区域，`RelationMark` 通过 anchor registry 与 core Path 承接关系几何。

## 最终形态

- mark schema 的静态真源仍在 plot IR schema 内；runtime registry 只负责 lowering 行为。
- mark lowering 分发由 `MarkDefinition` / mark registry 完成，内置与自定义 mark 复用同一查找与错误路径。
- interval cell / projected geometry 继续复用既有 `Cell` / `CellGeometry` / coordinate `projectCell` 通路。
- text lowering 与 point lowering 合并，文本是 point glyph 的一种输出形态；关系几何由 relation definition 承接。

## 影响

- ⚠️ BREAKING：删除旧 shape-specific mark type 与旧 interval 字段，不保留 0.x 兼容别名。
- 图表形态不再等同于底层 mark；bar / pie / heatmap 等成为 interval 在不同 bounds 与 coordinate 下的结果。
- 为 ADR-04 的 React / Vanilla / docs 表面收敛提供底层语义。
- 为 ADR-08 的公开自定义 mark registry 铺平内部结构。

## 长期边界

- 公开自定义 mark 的完整 schema / runtime 注入契约由 [ADR-08](./08-mark-custom-registry.md) 处理。
- chart 层的 stacked / grouped / percent 等高层 preset 不进 plot IR。
- Sankey / alluvial / 通用 relation 图元不由 `link` 承担；后续由 ADR-13/14 的 RelationMark 方向处理。
