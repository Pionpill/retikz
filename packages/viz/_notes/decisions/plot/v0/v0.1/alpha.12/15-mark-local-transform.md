# ADR-15：Mark-local transform for all marks

状态：Accepted
决策日期：2026-06-26
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-06 transform registry](./06-transform-registry.md) · [ADR-08 custom mark registry](./08-mark-custom-registry.md) · [ADR-14 relation derived data](./14-relation-derived-data-routing.md)

## 背景

ADR-14 为 RelationMark 引入了局部 transform，使 relation 可以从 root transform 后的 rows 继续派生只服务自己的数据视图。实现后这个能力不应继续作为 relation 特例存在：point、path、interval、reference 与 custom mark 同样需要“只对当前图层筛选、排序、聚合、派生字段”的数据视图。

transform 是 Statistics 层能力，不是 relation 几何能力。把局部 transform 只放在 relation 会制造平行管线，也会让自定义 mark 无法自然复用 transform registry。

## 决策

所有 mark operation 共享可选字段 `transform?: Array<IRPlotTransform>`。执行顺序固定为：

1. ingest / fieldMaps / format / resolveField / normalize 得到 canonical rows。
2. root `spec.transform` 先执行，得到 `rootRows`。
3. 每个 mark 基于 `rootRows` 独立执行自己的 `mark.transform`，得到 `MarkDataView.rows`。
4. scale domain、channel resolver、guide、mark lowering 与 locator 都读取对应 mark 的 data view。

`transform` 字段名与 root `spec.transform` 对齐，避免使用 `transforms` 与 core Scope 几何 transform 混名。自定义 mark 也通过公共 pipeline 获得已经 transform 后的 rows，`MarkDefinition.lower` 不需要自己重复实现局部 transform。

## 最终形态

- `MarkDataView` 是 render 与 locator 共享的数据视图产物。
- `mark.transform` 省略或为空数组时，与使用 root rows 等价。
- mark-local transform 的 input / output 字段参与 strict model；派生字段从 source field set 删除。
- 每个 mark 真实绘制的 rows 贡献它自己的 scale / guide / channel domain。
- React 所有 mark props 都暴露 `transform` prop，并装配进对应 mark operation。

## 影响

- RelationMark 现有 `transform` 行为保留，但从特例升级为所有 mark 的公共 contract。
- root transform 与 mark-local transform 形成两级数据管线：前者影响全图，后者只影响当前 mark。
- 内置 mark 与自定义 mark 对 transform registry 的使用对等。
- docs 需要说明 root transform 与 mark-local transform 的区别。

## 不在本 ADR 范围

- 不新增 transform kind。
- 不引入 per-mark independent dataset、named data view 或 join。
- 不把 `<Transform>` 子组件变成某个 mark 的子节点。
- 不把 runtime callback 写进 IRPlotSpec。
