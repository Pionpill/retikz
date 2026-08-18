# ADR-04：`Node.position` / `Coordinate.position` 加 `OffsetPosition`（任意 offset 相对定位）

- 状态：Accepted（已实现）
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md) · [alpha.4 ADR-01](../alpha.4/01-node-at-positioning.md) · [alpha.4 ADR-02](../alpha.4/02-coordinate-placeholder.md)

> **目标**：补"相对某基准点偏移 `(dx, dy)`"这一最直白的相对定位（对应 TikZ `calc` 的 `($(A)+(30,10)$)`），现有三种 position 形态都表达不了。

## 背景 / 约束

- position union 现有三态：绝对 `[x,y]` / polar `{origin,angle,radius}` / at `{direction,of,distance}`。"把 B 放在 A 右 30 下 10"无法表达——绝对要先知道 A 坐标、polar 要手算 `atan2/hypot`、at 只有 8 方向 + 单标量距离。
- 已有 `RelativeTarget{relative:[dx,dy]}` 但基准是 path 前一步终点（非命名节点）、且只挂 `step.to`、不入 position union。

## 决策：新建 `OffsetPositionSchema` 加入 position union

`{ of, offset }`，加入 `Node.position` / `Coordinate.position` / `TargetSchema`（step.to 一并扩，避免"position 能写、target 不能写"的不对称），compile `resolvePosition` 加分支。`of` 接受三种基准点形态（**与 `PolarPosition.origin` 同形**，覆盖 TikZ `calc` 全部基准用法）：

- `string`（节点 id）——前向引用拒绝；
- `Position` 笛卡尔 `[x,y]`——直接坐标基准、无需预定义、无前向引用概念；
- `PolarPosition`——递归极坐标基准（"基于 (A + 极坐标偏移) 再加 (dx,dy)"）。

理由：

1. **schema 字段不重叠优于字段重叠**（AGENTS.md 惯例）。
2. **保留意图**——IR 持久化"相对 A 偏移"而非 evaluated 绝对坐标，codec 反推能生成 `calc` 语法。
3. **LLM 友好**——`.describe` 可白纸黑字写"相对节点 A 偏移 (dx,dy)"。
4. **与 alpha.4 AtPosition/Coordinate 风格对齐**（高层意图进 IR、compile 解析为笛卡尔）。

设计细节（具体决策）：

- 字段名 `offset`（dx/dy 直觉强），**不复用** path `RelativeTarget.relative` 同名——两者基准点不同（命名节点/笛卡尔/polar vs 前步终点）。
- 前向引用规则与 polar `origin`/at `of` 一致：仅当 `of` 是 string 或嵌套 polar 内 string origin 时要求先定义；`of` 为笛卡尔时无前向引用概念。

## 长期边界

- 链式 offset 深度不设上限（与 polar nested origin 一致）；`AtPosition.distance` 扩二元组；OffsetPosition 的字符串 sugar（`of`+`offset` 难用单字符串表达，保持对象形态，未来另开 ADR）。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：additive；其余默认行为、失败语义与公开契约以正文为准。
