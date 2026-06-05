# ADR-04：`Node.position` / `Coordinate.position` 加 `OffsetPosition`（任意 offset 相对定位）

- 状态：Accepted（已实现）
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md) · [core-design.md §4.5](../../../../../architecture/core-design.md) · [alpha.4 ADR-01](../v0.1-alpha.4/01-node-at-positioning.md) · [alpha.4 ADR-02](../v0.1-alpha.4/02-coordinate-placeholder.md)

> **范围**：补"相对某基准点偏移 `(dx, dy)`"这一最直白的相对定位（对应 TikZ `calc` 的 `($(A)+(30,10)$)`），现有三种 position 形态都表达不了。

## 背景 / 约束

- position union 现有三态：绝对 `[x,y]` / polar `{origin,angle,radius}` / at `{direction,of,distance}`。"把 B 放在 A 右 30 下 10"无法表达——绝对要先知道 A 坐标、polar 要手算 `atan2/hypot`、at 只有 8 方向 + 单标量距离。
- 已有 `RelativeTarget{relative:[dx,dy]}` 但基准是 path 前一步终点（非命名节点）、且只挂 `step.to`、不入 position union。

## 决策：新建 `OffsetPositionSchema` 加入 position union

`{ of, offset }`，加入 `Node.position` / `Coordinate.position` / `TargetSchema`（step.to 一并扩，避免"position 能写、target 不能写"的不对称），compile `resolvePosition` 加分支。`of` 接受三种基准点形态（**与 `PolarPosition.origin` 同形**，覆盖 TikZ `calc` 全部基准用法）：

- `string`（节点 id）——前向引用拒绝；
- `Position` 笛卡尔 `[x,y]`——直接坐标基准、无需预定义、无前向引用概念；
- `PolarPosition`——递归极坐标基准（"基于 (A + 极坐标偏移) 再加 (dx,dy)"）。

代码：`core/src/ir/position/offset-position.ts`、`core/src/compile/position.ts`（分 string/Position/PolarPosition 三路）、`core/src/compile/path.ts`（target 复用 `resolvePosition`）。

理由：

1. **schema 字段不重叠优于字段重叠**（AGENTS.md 惯例）。
2. **保留意图**——IR 持久化"相对 A 偏移"而非 evaluated 绝对坐标，codec 反推能生成 `calc` 语法。
3. **LLM 友好**——`.describe` 可白纸黑字写"相对节点 A 偏移 (dx,dy)"。
4. **与 alpha.4 AtPosition/Coordinate 风格对齐**（高层意图进 IR、compile 解析为笛卡尔）。

设计细节（具体决策）：

- 字段名 `offset`（dx/dy 直觉强），**不复用** path `RelativeTarget.relative` 同名——两者基准点不同（命名节点/笛卡尔/polar vs 前步终点）。
- 前向引用规则与 polar `origin`/at `of` 一致：仅当 `of` 是 string 或嵌套 polar 内 string origin 时要求先定义；`of` 为笛卡尔时无前向引用概念。

### 被否决的选项

- **B：扩 `AtPosition.distance` 兼接 `[dx,dy]`**——direction + 二维 offset 同字段角色冲突、语义混淆、`.describe` 难写清"二选一"，schema 内字段重叠是已知坏模式。
- **C：不加、让用户算 `[A.x+dx, A.y+dy]`**——失去意图表达，codec 反推不出 `calc`，LLM 生成不直观。

## 不在本 ADR 范围

- 链式 offset 深度不设上限（与 polar nested origin 一致）；`AtPosition.distance` 扩二元组（选项 B 已否决）；OffsetPosition 的字符串 sugar（`of`+`offset` 难用单字符串表达，保持对象形态，未来另开 ADR）。

---

> **实现指针**：level `red`、additive。真源以代码为准——`OffsetPositionSchema`/`IROffsetPosition`（`core/src/ir/position/offset-position.ts`）、union 扩入 `core/src/ir/{node,coordinate}.ts` + `core/src/ir/path/target.ts`、`resolvePosition` 分支（`core/src/compile/position.ts`）、target 解析复用（`core/src/compile/path.ts`）。测试在 `core/tests/compile/`。完整原文（of 三态 DSL 示例 / 测试象限 22 case）见本文件 git 历史。

> 🔖 封板压缩 commit `8a8f2f5a`；压缩前完整施工蓝图 = `git show 8a8f2f5a^:notes/decisions/core/v0/v0.1/v0.1-alpha.5/04-position-offset.md`。
