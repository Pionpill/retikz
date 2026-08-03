# ADR-07：Mark label surface follows core label hosts

- 状态：Accepted
- 决策日期：2026-06-28
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [kernel alpha.6 ADR-04](../../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.6/04-node-label-inside-placement.md) · [kernel alpha.6 ADR-05](../../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.6/05-ribbon-label.md)

## 背景

core 已经补齐两类 label host：node label 支持 inside/outside 与边界位置，path-like geometry label 由 `Path.label` 与 ribbon path kind 共享。plot 旧 label 表面仍偏向 datum node label，PathMark/RelationMark/ReferenceMark 的 host label 投递不完整，导致 demo 经常额外创建只用于写字的 PointMark。

## 决策记录

plot mark label 改为 host-inferred schema：用户在 mark 上写 `label`，由 mark definition 根据宿主选择投递到 core `Node.label` 或 path-like `GeometryLabelSchema`。用户不需要额外写 `kind`。

稳定语义：

- `content` 保留 plot 的 field/value/displayFormat 数据绑定能力。
- 几何字段直接派生自 core `NodeLabelSchema` 或 `GeometryLabelSchema`，plot 不重新定义 label layout。
- `PointMark`、`IntervalMark` label 投递到生成的 core `Node.label`。
- `PathMark` label 投递到生成的 core `Path.label`，不表示 per-vertex label。
- `ReferenceMark` 增加 label：line 使用 geometry label，band/region 使用 node label。
- `RelationMark.label` 对 path 与 ribbon 共用 geometry label，并最终投递到 core `IRPath.label`。
- `RelationMark.path.route[].label` 继续表示 step-level label，不和 host label 混用。
- `label` 接受单个 label 或数组；数组按输入顺序投递，不做自动避让。
- mark lowering 遇到 label 字段与实际 host 不匹配时 fail-loud。

该设计让 plot 只负责数据绑定和宿主分派，core 继续是 label 布局语义的唯一来源。内置 mark 使用共享 resolver；自定义 mark 可复用同一 schema 并自行选择 host。

## 被否决方案

- 给用户暴露 label `kind`：内置 mark 已知宿主，重复声明会制造无效组合。
- 保留 flat label props 进入 IRPlotSpec schema：结构化 label 才能完整承载 core label contract；旧 sugar 如存在也只能在 React adapter 内转换。
- 让 PathMark.label 表示顶点级标签：path host label 与 vertex label 是不同语义，后者应另开字段或 ADR。
- 用 PointMark 模拟说明文字：文字会脱离真实图元 host、locator 与 provenance。
