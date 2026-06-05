# ADR-02：公开 union 类型拆 named type + JSDoc 补全（`StepProps` / `PathCommand` / `Transform` / `TextLine`）

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-4 + TODO-9](./roadmap.md) · [AGENTS.md "类型每个属性都要 JSDoc"](../../../../../../AGENTS.md)

> **范围**：把若干以**内联 union literal** 声明的公开 discriminated union 类型按判别 kind 拆成具名分支 type，每分支 / 每字段补 JSDoc，union 类型保留 export（向下兼容）。

## 背景 / 约束

内联 union literal 的问题：IDE hover 一次蹦出全部分支、单变体难独立看；单分支没法独立 import 做 wrapper / HOC / `forwardRef` 派生（用户想拿 `BendStepProps` 子类型拿不到）；修单变体易误改邻近变体；与 `@retikz/core` 端已按 kind 拆好的 IR 类型（`IRMoveStep` / `IRLineStep` / …）命名风格不一致；违反 AGENTS.md "类型每个属性都要 JSDoc"。

## 决策：按 kind 切 named type + union 拼回

每个判别分支抽成具名 type（上方 JSDoc 描述用途、每字段 JSDoc），union 类型继续 export。被否决的备选：保留 union literal 仅补字段 JSDoc——工作量小，但解决不了"单分支不能独立 import"。

理由：与 IR 类型命名对照一致；解锁用户 `Pick<BendStepProps, …>` / 写 wrapper；JSDoc 跟着 named type 走 IDE hover 更佳；union 保留 export = 零破坏。

### 拆分清单（命名即决策）

- **`StepProps` 拆 10 个 named type**：`MoveStepProps` / `LineStepProps` / `FoldStepProps`（kind=`'step'`，与 IR `IRFoldStep` 对照）/ `CycleStepProps` / `CurveStepProps` / `CubicStepProps` / `BendStepProps` / `ArcStepProps` / `CirclePathStepProps` / `EllipsePathStepProps`。
- **`PathCommand` 拆 7 个**：`Move` / `Line` / `Quad` / `Cubic` / `Arc` / `EllipseArc` / `Close` + `PathCommand` 后缀。
- **`Transform` 拆 3 个**：`TranslateTransform` / `RotateTransform` / `ScaleTransform`。
- **`TextLine` 保留单 type 不拆**（已是 record 非 union），仅补字段 JSDoc。
- `parseTargetSugar` JSDoc 从文件顶常量挪到函数上方 + 补 `RELATIVE_OFFSET_RE` JSDoc；`SegmentSample` 上方补 JSDoc。

## 不在本 ADR 范围

- IR 端 zod schema 拆 named——IR 端已经 named（如 `IRMoveStep`），本 ADR 只让 React props + Scene primitive 端跟齐。
- 把 `IRControlPoint` / `IRStepLabel` / `IRArrowDetail` 等单 record 类型也拆——单 record 不存在 union 拆分问题，不必要。

---

> **实现指针**：level `yellow`、非 breaking（新增 ~20 个 named type export 是 superset 扩张，运行时零变化）。真源以代码为准——`StepProps` 系列（`react/src/kernel/Step.tsx`）、`PathCommand` 系列（`core/src/primitive/path.ts`）、`Transform` 系列（`core/src/primitive/group.ts`）、`TextLine`（`core/src/primitive/text.ts`），均经各自 `index.ts` 导出。type-level smoke 测试见 `react/tests/kernel/StepProps-named-types.test.ts` 与 `core/tests/primitive/{path-command,transform}-named-types.test.ts`。完整原文（示例代码 / 文件 scope / 测试象限）见本文件 git 历史。
