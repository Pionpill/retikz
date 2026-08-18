# ADR-01：比例 partway 定位（AbsoluteTarget + BetweenPosition）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联： · tikz-gap-analysis §5 定位（历史分析已删除） · [alpha.6 ADR-01 结构化 Target](../alpha.6/01-structured-target-anchor.md)（对象主契约 + target resolve）· [alpha.6 ADR-02 edgePoint](../alpha.6/02-side-t-edge-point.md)（`lerpPoint`）· 本 milestone [ADR-02](./02-clip.md) / [ADR-03](./03-viewbox-override.md)

## 背景 / 约束

TikZ calc 的 **比例 partway** `($(A)!t!(B)$)`（A、B 间 t 处 = lerp）是高频定位（边中点 / A→B 三分之一处），retikz 原先只对齐了加法（`OffsetPosition` = `{ of, offset }`）。lerp 几何现成（复用 alpha.6 `lerpPoint`），缺的是 schema 入口。

两个结构性硬约束塑造了设计：

- **schema 不能成环**：若 partway 端点直接定成 `TargetSchema`，而 `TargetSchema` 已含 `PositionSchema`、`PositionSchema` 又引 `TargetSchema`，会循环；且 `{ relative }` / `{ relativeAccumulate }` 依赖"上一段终点"游标，在两点取点的语境里无意义。端点必须是**自包含、排除 path-relative** 的闭包。
- **不得绕回字符串节点引用**：alpha.6 已确立"IR 对象主契约"。端点闭包内任何分支都不能让 core 重新接受 `z.string()` 节点引用。

## 决策：自包含 `AbsoluteTarget` 闭包 + `BetweenPosition`

partway 端点用一套**自包含、排除 path-relative** 的 `AbsoluteTarget` 闭包，`BetweenPosition` 自身也属该闭包（故可嵌套：三等分 = between of between）。`BetweenPosition` 同时落进 `Node.position` / `Coordinate` 的 position union 与 `TargetSchema`（Step.to）。compile 把两端点各 resolve 到世界坐标后 `lerpPoint(A, B, t)`，嵌套递归 resolve；NodeTarget 端点走 alpha.6 anchor / edgePoint 解析。

核心数据结构（字面即决策，完整字段 + 英文 describe 见 ）：

```ts
export type IRAbsoluteTarget = IRPosition | PolarPosition | IRNodeTarget | IROffsetPosition | IRBetweenPosition;
export type IRBetweenPosition = { between: [IRAbsoluteTarget, IRAbsoluteTarget]; t: number };
```

理由：

1. **避免 schema 递归**：`AbsoluteTarget` 自包含、排除 path-relative，`Position` ↔ `Target` 不成环；`z.lazy` 包自引闭包，构造不栈溢出。
2. **守 alpha.6 对象主契约**：端点闭包不引入 `z.string()` 节点引用。
3. **lerp 现成 + 可嵌套**：几何零新增；`BetweenPosition` 自身属 `AbsoluteTarget`，双落点（position 与 Step.to）。

实现期相对原提案的两处收敛（真源以代码为准）：

- **`t` 钳制 `[0,1]`**：schema 加 `.min(0).max(1)`，外插（端点延长线）暂不支持。

## 长期边界

- **`t` 外插**（`t<0` / `t>1` 端点延长线）：实现钳制 `[0,1]`，外插推迟。
- **投影 projection / 完整 calc 表达式**：学术 / 逆结构化方向，不做。
- **clip**→ [ADR-02](./02-clip.md)；**viewBox override**→ [ADR-03](./03-viewbox-override.md)。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：向后兼容纯叠加 union 分支、零破坏；其余默认行为、失败语义与公开契约以正文为准。
