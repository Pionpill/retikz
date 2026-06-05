# ADR-01：Node `at` 节点间相对定位

- 状态：Accepted（已实现）
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · [tikz-gap-analysis §1 P1](../../../../../analysis/tikz-gap-analysis.md)

> **范围**：补 TikZ `positioning` library 的相对定位（`right=2cm of A` / `above right=of A`），让用户描述节点关系而非手算坐标。

## 背景 / 约束

- alpha.3 的 Node 只能绝对笛卡尔 `[x,y]` 或极坐标——画"三 step 横向均分"得手算每个坐标。
- alpha.3 已把 polar 进 IR、编译期 `resolvePosition` 解析；相对定位是同类问题，须保持同模式（否则两种定位语法心智分裂）。

## 决策：嵌入 `position` union + 编译期解析

`position` 单字段承担三形态（笛卡尔 / 极坐标 / `AtPosition`），IR 保留用户原始意图 `{ direction, of, distance? }`，编译期折成笛卡尔。判别：`Array.isArray` → 笛卡尔，`'direction' in pos` → AtPosition，其余 → polar。`nodeDistance` 经 `<Layout nodeDistance>` 注入 `CompileOptions`。代码：`core/src/ir/position/at-position.ts`、`core/src/compile/position.ts`。

设计细节（均为具体决策）：

- **8 方向**（4 主向 + 4 对角），对齐 TikZ `positioning`。对角分量 `1/√2`，保证斜向距离与水平/垂直等长（对角点落在 distance 半径圆周上）。`above` = 视觉上方（retikz y 减小 / TikZ y 增大，语义两边一致）。
- **distance 优先级**：`node.distance > nodeDistance prop > 1`（硬编码默认，对应 TikZ `node distance=1cm`）。
- **`of` 引用**：仅向后引用已注册到 nodeIndex 的 node / coordinate id；前向引用拒绝（与 polar `origin` / Step 字符串目标一致）。

理由：

1. **与 alpha.3 polar 模式对称**——同问题同设计，减认知负担。
2. **意图保留 + 单字段**——codec / 编辑器 / AI 不必分辨"用 position 还是 at"。
3. **判别简洁**——`'direction' in pos` 一眼识别。

### 被否决的选项

- **B：React DSL 即时解析、不进 IR**——builder 收 children 时算成死 `[x,y]`。丢失意图，TikZ codec 反推不回 `[right=2cm of A]`，AI / 编辑器只见死坐标。
- **C：独立 `at` 字段（与 position 互斥）**——字段名直观，但 zod 表达 xor 要么 `z.union` 重复 30+ 字段、要么运行时校验；IR 语义裂开，codec / AI 多一种 case。

## 不在本 ADR 范围

- `<Coordinate>` 占位节点（ADR-02）、Node `label` 边挂标签（ADR-03）。
- TikZ `node distance=1cm and 1cm`（横/纵不同距离）：留 v0.2+。

---

> **实现指针**：level `red`（动 IR position union + compile）、additive 非 breaking。真源以代码为准——`IRAtPosition`（`core/src/ir/position/at-position.ts`）、`resolvePosition`（`core/src/compile/position.ts`）、`CompileOptions.nodeDistance`、`<Layout nodeDistance>`；测试在 `core/tests/`。完整原文（背景示例 / 选项详情 / 测试清单）见本文件 git 历史。
