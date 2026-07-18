# ADR-12：channel core coverage 对账

状态：Accepted
决策日期：2026-06-22
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-10 channel registry](./10-channel-registry.md) · [ADR-11 custom visual channel](./11-custom-visual-channel.md)

## 背景

ADR-10/11 已经把 visual channel registry 与自定义 delivery 打通，contract 也区分了 Position、Mark、Scope、Node、Path 等落点。但内置 provider 主要覆盖 mark / node / position，path / scope 仍缺少系统化覆盖。

对照 core IR 可见，`IRNode`、`IRPath`、`IRScope` 共享大量样式属性，如 `opacity`、`strokeWidth`、`fillOpacity`、`drawOpacity`、`zIndex`。若按 Node / Path 分别注册同名 channel 会撞 registry key；若改成 `pathStrokeWidth` 又会破坏用户心智。

## 决策

plot channel coverage 以 core IR 既有能力为边界，但只纳入稳定 scalar 或小枚举、不会改变数据拓扑或坐标投影、且有清楚 mark 语义的字段。

处理原则：

- 位置、结构、id、provenance、animations、children、path geometry、clip、transform 等不做普通 data channel。
- 复杂对象与数组，如 PaintSpec、Font、DropShadow、ArrowDetail、dashPattern、IRTransform 等，不进本轮内置 data channel。
- `opacity`、`fillOpacity`、`drawOpacity`、`strokeWidth`、`zIndex` 等共享样式按同名共享 channel 处理，由 mark lowering 决定落到 Node、Path 或 Scope default。
- point 专属的 `size`、`shape`、`padding`、`minimumSize`、`rotate` 等继续作为 Node channel。
- path 专属的 `lineCap`、`lineJoin`、`roundedCorners` 等补 Path provider。
- scope 仅承接 layer default / zIndex 等整层默认值，不表达逐 datum 几何变化。

首批补齐的用户可见字段包括：`opacity`、`fillOpacity`、`drawOpacity`、`strokeWidth`、`zIndex`、`lineCap`、`lineJoin`、`roundedCorners`、`textColor`，以及 datum `label` 到 core `NodeLabelSchema` 的稳定字段子集。

## 实现指针

- 共享 scalar channel 首选提升为 `MarkChannelDefinition`，让具体 mark lowering 选择 Node / Path / Scope 落点。
- path-only enum / scalar 可放入 Path channel provider。
- 常量 style 可上提为 layer default；field-bound style 逐 datum / path 落值。
- `encoding.channels` 撞内置 channel 名必须 fail-loud，提示使用 mark 顶层字段。

## 影响

- path-like mark 获得与 point 对齐的 scalar style channel。
- datum label 表面对齐 core label 的稳定字段子集。
- core 不改动；plot 只消费 core 既有 IRNode / IRPath / IRScope 属性。
- 对象值、数组值和布局相关 node 字段继续推迟，避免扩大 `ChannelValue = string | number` 契约。

## 不在本 ADR 范围

- 不把 `ChannelValue` 扩到 object / array / boolean。
- 不做数据驱动 PaintSpec、Font、DropShadow、ArrowDetail、AnimationTrack。
- 不新增 core 渲染能力。
- 不设计 React `<Channel>` 声明式糖。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/12-channel-core-coverage.md`（封板全文）。
