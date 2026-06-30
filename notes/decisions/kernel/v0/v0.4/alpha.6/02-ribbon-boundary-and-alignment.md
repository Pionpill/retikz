# ADR-02：Ribbon 边界、对齐与采样语义

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-01](./01-ribbon.md) · [ADR-03](./03-ribbon-arc-cap.md) · [ADR-07](./07-path-kind-registry.md)

## 背景

variable-width ribbon 不只是“粗线”。它需要明确中心线模式、边界模式、宽度采样、端点方向与对齐方式，否则同一份 IR 在不同 renderer 或上层包中会出现不可预测的闭合轮廓。

## 决策记录

本 ADR 确立 ribbon 的几何 contract：ribbon 可以从中心线和宽度 profile 派生边界，也可以直接由上下边界给出；端点、对齐与采样属于 core path-like 几何语义。

ADR-07 将这些字段收敛到 `Path.ribbon`，稳定字段包括：

- `mode: "centerline" | "boundary"`：中心线模式或显式边界模式。
- `width`、`start`、`end`、`interpolation`：描述沿路径变化的宽度 profile 与端点宽度/方向。
- `align: "center" | "left" | "right"`：决定宽度相对中心线的分布。
- `samples` / `sampling`：控制曲线采样密度，保证输出闭合轮廓可复现。
- `upper` / `lower`：边界模式下的两侧边界。

core 只负责几何，不负责 Sankey layout、流量分配、节点排序或 crossing minimization。这些高层布局由 plot 或后续 Tier 2 包通过同一 core contract 输出。

## 被否决方案

- 只支持中心线模式：会让上下边界已知的 alluvial / custom flow 需要反推中心线，丢失输入精度。
- 只支持边界模式：会让常见关系边宽度语义变得繁琐，也难以复用 path routing。
- 把 `align` 放到 plot：同一条 ribbon 在不同上层包的闭合方向会不一致。
- 在 core 内做 Sankey layout：layout 是 Tier 2 统计/图论职责，不属于 path-like IR。

## 实现指针

- 最终公开契约见 [ADR-07](./07-path-kind-registry.md) 的 `RibbonPathOptionsSchema`。
- 发布版本：kernel group `v0.4.0-alpha.6`。
- 验收范围：core ribbon path 编译、边界模式、宽度 profile、采样与错误诊断测试。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:notes/decisions/kernel/v0/v0.4/alpha.6/02-ribbon-boundary-and-alignment.md`（封板全文）。
