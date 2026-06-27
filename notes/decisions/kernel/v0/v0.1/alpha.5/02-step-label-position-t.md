# ADR-02：`StepLabel.position` 扩充（7 keyword + 任意 t 数值 + 多 kind 参数化规则）

- 状态：Accepted（已实现）
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md) · [core-design.md §4.5](../../../../../architecture/core-design.md)

> **范围**：把 edge label 的 `position` 从 3 keyword 扩成 TikZ 完整集（7 keyword + 任意数值 t∈[0,1]），并把"t 在每种 step kind 上的几何含义"写定。

## 背景 / 约束

- 原 `StepLabel.position` 只接受 3 keyword（`midway`/`near-start`/`near-end`），缺 4 个 TikZ keyword 且无数值形态——"路径 30% 处放标签"得手算坐标，破坏 LLM 友好性（TikZ `pos=0.3` 是常见训练输入）。
- 更深层：原 schema 没规定 t 在多段 fold / Bezier / arc / 整圆椭圆上怎么解释（compile 仅硬编码了 line/fold 上 3 keyword）。扩成数值后**必须把每种 step kind 的 t 几何参数化写定**，否则落点不可预测。

## 决策：`union(enum 7 keyword, number 0..1)`

keyword 是 t 的语义糖（一对一映射），数值 t∈[0,1] 提供任意位置。7 keyword → t：`at-start`=0 / `very-near-start`=0.125 / `near-start`=0.25 / `midway`=0.5（默认）/ `near-end`=0.75 / `very-near-end`=0.875 / `at-end`=1。代码：`core/src/ir/path/step.ts`（schema）、`core/src/compile/path.ts`（`resolveLabelT` + `pointAtT` 按 kind 分路）。

理由：

1. **覆盖 TikZ 完整集**——与 LLM 训练数据 100% 对齐。
2. **keyword 友好 DX + 数值精细控制**——常用位置写关键词更直白。
3. **超集扩展非破坏**——旧 3 keyword IR 运行时仍合法。
4. **schema 不复杂**——union(enum, number) 是 zod 标准模式。

### t 在各 step kind 上的解释规则（具体决策，每条对齐 TikZ）

t 是沿整个 step 的归一化参数（0 起点 / 1 终点），参数化方式：

| Step kind | 参数化 | 关键性质 |
|---|---|---|
| `line` | 归一化弧长 | t=0.5 即中点 |
| `step`（fold N 段） | 每段各占 `1/N` t 区间（**不按弧长加权**），段内归一化弧长 | 第 j 拐角恒在 `t=j/N`；N=2 时 t=0.5 落拐角，与段长无关 |
| `curve`/`cubic`/`bend` | Bezier 参数 t（**非弧长**；bend 内部 lower 成 cubic） | t=0.5 通常**不是**视觉中点 |
| `arc` | 角度线性映射 `startAngle..endAngle` | t=0.5 = 起末角度中点 |
| `circlePath`/`ellipsePath` | t=0 在 angle 0（+x），CCW 增长 | t=0.5 落 180°（-x），非弧长（椭圆 rx≠ry 时仍按角度） |

三条关键选择：Bezier 用参数 t 不用弧长（弧长定位需数值积分、昂贵且与 TikZ 不一致）；fold 每段等占 `1/N`（段长悬殊拐角仍恒在 `t=j/N`）；arc/circle/ellipse 用角度参数化（简单且跨平台一致）。circlePath 起点取 angle 0 而非"cursor 进入点"——cursor 在圆心、无进入点概念。Fold 规则按通用 N 段一次写定，未来加 N>2 折角复用同参数化。

异常值（`pos=-0.1`/`1.2`）由 zod `.min(0).max(1)` 在 schema 阶段拒绝，**不**在 compile clamp。

### 被否决的选项

- **B：只扩 keyword、不支持数值**——用户/LLM 想表达 t=0.3 无路可走，偏离 TikZ `pos=<float>`。
- **C：只数值、删 keyword**——破坏旧 IR；`midway` 等是 TikZ 标准词、对 LLM 亲和力高、DX 优于裸 0.5。

## 不在本 ADR 范围

- `NodeLabel.position`（8 方向 + 数字角度，与 StepLabel 完全独立）；Move/Cycle step（本就无 label）；Label 其它字段（`side`/`text`）不动。

---

> **实现指针**：level `red`、运行时 IR 100% 兼容（轻度 TS 体感 BREAKING——`position` 值集扩大，旧 exhaustive switch 新值落 default）。真源以代码为准——`StepLabelSchema.position`（`core/src/ir/path/step.ts`）、`resolveLabelT` + `pointAtT`（`core/src/compile/path.ts`，调 `core/src/geometry/{bend,arc}` 等）；测试在 `core/tests/compile/path-label.test.ts`（每 step kind 一个 describe 块）。完整原文（fold N 段推导 / 每 kind demo 矩阵 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `8a8f2f5a`；压缩前完整施工蓝图 = `git show 8a8f2f5a^:notes/decisions/core/v0/v0.1/alpha.5/02-step-label-position-t.md`。
