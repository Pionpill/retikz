# ADR-06：Sector pull visual offset

- 状态：Accepted
- 决策日期：2026-06-28
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [ADR-05](./05-stat-geom-surface.md)

## 背景

polar interval 已能表达 pie、donut 与 radial bar。常见需求是把某个 sector 从圆心方向静态拉出一点用于强调，但 `explode` 一词容易混入 hover/selected 交互状态和布局语义。alpha.13 只需要补齐静态、JSON-safe、可测试的 sector 几何偏移。

## 决策记录

`IntervalMark` 新增 `pull` 字段，表示 polar sector 沿自身中分角向外平移的静态距离。`pull` 支持常量和字段绑定，单位是最终 user units，默认 0。

稳定语义：

- 不新增 `explode` 别名。
- `pull` 只适用于 `IntervalMark` 在 `polar2D` 下生成的 sector geometry；非 sector geometry 设置 pull 必须 fail-loud。
- `pull` 必须是有限非负数，负数、非数值或非有限值报错。
- 正值沿 `(startAngle + endAngle) / 2` 方向向外平移。
- `pull` 平移 sector 的 center 与最终 core `Node.position`，不改 inner/outer radius 或 angle params。
- locator 与 rendering 共享同一份 pulled geometry；datum anchor、series centroid、label host 都反映 pull 后位置。
- `padAngle` 与 `pull` 同时存在时，先应用 `padAngle`，再按最终中分角计算 pull 方向。

## 被否决方案

- 使用 `explode` 字段：容易暗示交互高亮/选中态，不适合作为静态几何 contract。
- 使用半径比例作为单位：会让同一 spec 在不同尺寸下偏移语义变化。
- 静默忽略非 polar pull：会让用户误以为强调生效。
- 修改 core sector shape schema：偏移属于 plot lowering 后的 Node.position，不是 sector 参数。

## 实现指针

- 发布版本：viz group `v0.1.0-alpha.13`。
- 验收范围：`packages/viz/plot` sector pull lowering 与 locator 测试，React `<IntervalMark pull>` 映射，Vanilla PlotSpec 消费，docs pie/donut 静态 pulled sector demo。
- 不在范围：hover/selected state、animated explode、tooltip、label collision avoidance、PieChart/DonutChart preset。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/graph/v0/v0.1/alpha.13/06-sector-explode-pull.md`（封板全文）。
