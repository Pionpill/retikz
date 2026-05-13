# ADR-02：公开 union 类型拆 named type + JSDoc 补全（`StepProps` / `PathCommand` / `Transform` / `TextLine`）

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-4 + TODO-9](../../../plans/v0/v0.1-beta.1.md) · [AGENTS.md "类型每个属性都要 JSDoc"](../../../../AGENTS.md)

## 背景

retikz 公开 API 中有若干 discriminated union 类型，当前以**内联 union literal** 形式声明，每个分支字段无独立 JSDoc：

- `packages/react/src/kernel/Step.tsx` 的 `StepProps` —— 100+ 行内联 10 分支 union
- `packages/core/src/primitive/path.ts` 的 `PathCommand` —— 7 分支 union（move / line / quad / cubic / arc / ellipseArc / close）
- `packages/core/src/primitive/group.ts` 的 `Transform` —— 3 分支 union（translate / rotate / scale）
- `packages/core/src/primitive/text.ts` 的 `TextLine` —— 字段无 JSDoc
- `packages/core/src/parsers/parseTargetSugar.ts` 的导出函数 JSDoc 写在文件顶常量上、不在函数体上方
- `packages/core/src/geometry/segment.ts` 的 `SegmentSample` 类型上方无 JSDoc（模块顶大段注释用 `/* */` 非 JSDoc）

后果：
- IDE hover 一次性蹦出全部分支，单个变体难以独立看
- 单分支没法独立 import 做 wrapper / HOC / `forwardRef` 派生（用户想写 `BezierStep = (p: CurveStepProps | CubicStepProps)` 拿不到子类型）
- 修单个变体容易误改邻近变体
- 与 `@retikz/core` 端的 IR 类型命名风格（已按 kind 拆 `IRMoveStep` / `IRLineStep` / ...）不一致
- 违反 AGENTS.md "类型每个属性都要 JSDoc"

## 选项

### A. 按 kind 切 named type + union 拼回（**推荐**）

```ts
// 示例：PathCommand
export type MovePathCommand = { kind: 'move'; to: [number, number] };
export type LinePathCommand = { kind: 'line'; to: [number, number] };
export type QuadPathCommand = {
  kind: 'quad';
  /** 二次 Bezier 控制点 */
  control: [number, number];
  /** 终点 */
  to: [number, number];
};
// ... 7 个 named type
export type PathCommand =
  | MovePathCommand | LinePathCommand | QuadPathCommand
  | CubicPathCommand | ArcPathCommand | EllipseArcPathCommand
  | ClosePathCommand;
```

每个 named type 上方有 JSDoc 描述用途；每个字段上方有 JSDoc。union 类型继续 export，向下兼容。

### B. 保留 union literal + 仅补字段 JSDoc

工作量小，但解决不了"单分支不能独立 import"的问题。

## 决策：A

理由：
1. 与 `@retikz/core` 端 IR 类型命名一致（`IRMoveStep` / `IRLineStep` / ...）
2. 解锁用户 `Pick<BendStepProps, 'bendDirection'>` / 写 wrapper 的能力
3. JSDoc 跟着 named type 走，IDE hover 体验提升
4. union 类型保留 export = 零破坏

## 决策细节

- ✓ **`StepProps` 拆 10 个 named type**：`MoveStepProps` / `LineStepProps` / `FoldStepProps`（kind=`'step'`）/ `CycleStepProps` / `CurveStepProps` / `CubicStepProps` / `BendStepProps` / `ArcStepProps` / `CirclePathStepProps` / `EllipsePathStepProps`——与 IR 的 `IRFoldStep`（kind 字面量 `'step'`）保持对照
- ✓ **`PathCommand` 拆 7 个 named type**：`MovePathCommand` / `LinePathCommand` / `QuadPathCommand` / `CubicPathCommand` / `ArcPathCommand` / `EllipseArcPathCommand` / `ClosePathCommand`
- ✓ **`Transform` 拆 3 个 named type**：`TranslateTransform` / `RotateTransform` / `ScaleTransform`
- ✓ **`TextLine` 保留单 type 不拆**（已是 record 非 union），仅补字段 JSDoc
- ✓ **`parseTargetSugar` JSDoc 从文件顶常量挪到函数上方**，同时补 `RELATIVE_OFFSET_RE` 的 JSDoc
- ✓ **`SegmentSample` 上方补 JSDoc 描述用途**，字段已有 JSDoc 保持不变

## DSL 表面

用户既有调用 `<Step kind="bend" ... />` 不变；新能力是：

```ts
import type { BendStepProps, CurveStepProps } from '@retikz/react';

// 用户可以做：
const Bezier: FC<CurveStepProps | CubicStepProps> = props => ...;
```

## 测试设计

新增 smoke test：每个新 named type 都能独立 import + 类型断言基础 `kind` 字面量。位置：
- `packages/react/tests/kernel/StepProps-named-types.test.ts`（新建）
- `packages/core/tests/primitive/path-command-named-types.test.ts`（新建）
- `packages/core/tests/primitive/transform-named-types.test.ts`（新建）

每文件 1-3 个 type-level 断言（`AssertEqual<MovePathCommand['kind'], 'move'>` 之类）足够。

## 影响

- **公开 API surface**：新增 ~20 个 named type export（superset 扩张，向下兼容）
- **TS 用户体验**：IDE hover 单分支、可 `Pick<>` / `Omit<>`、可 wrapper / forwardRef
- **运行时**：零变化
- **文档站**：可选——`apps/docs/src/contents/core/reference/schema/` 中后续可以引用 named type；但不强制本 ADR 范围

## 不在本 ADR 范围

- 把 zod schema 拆 named（如 `IRMoveStep` 已是 named；只是 React props 端跟齐）—— IR 端已经 named，本 ADR 只处理 React props + Scene primitive
- 进一步把 `IRControlPoint` / `IRStepLabel` / `IRArrowDetail` 等 record 类型也拆分——不必要，单 record 不存在 union 拆分问题

---

## 实现契约

### Level

`yellow`（动 `packages/react/src/kernel/` + `packages/core/src/primitive/`，但仅类型 / JSDoc，零行为变化）

### Schema 改动

无 zod schema 改动。仅 TS 类型分拆。

### 文件 scope

- `packages/react/src/kernel/Step.tsx` —— `StepProps` 拆 10 个 named type
- `packages/react/src/index.ts` —— 新增 10 个 named type export
- `packages/core/src/primitive/path.ts` —— `PathCommand` 拆 7 个 named type
- `packages/core/src/primitive/group.ts` —— `Transform` 拆 3 个 named type
- `packages/core/src/primitive/text.ts` —— `TextLine` 字段补 JSDoc
- `packages/core/src/parsers/parseTargetSugar.ts` —— 函数 JSDoc + `RELATIVE_OFFSET_RE` JSDoc
- `packages/core/src/geometry/segment.ts` —— `SegmentSample` 上方补 JSDoc
- `packages/core/src/index.ts` —— 新增 named type export
- `packages/react/tests/kernel/StepProps-named-types.test.ts` —— 新建
- `packages/core/tests/primitive/path-command-named-types.test.ts` —— 新建
- `packages/core/tests/primitive/transform-named-types.test.ts` —— 新建

### 测试象限

非 zod schema 改动，重在守门 + smoke：

**类型 smoke（≥ 3）**：
- 每个新 named type 能独立 import
- `AssertEqual<MovePathCommand['kind'], 'move'>` 三套（StepProps / PathCommand / Transform 各一个 kind 断言）
- union 类型 = 子 type 并集（`AssertEqual<PathCommand, MovePathCommand | LinePathCommand | ...>`）

**守门（既有）**：
- 既有 833 测试全过（行为不变）
- `tsc --noEmit` 全过

不强凑边界 / 错误路径 / 交互 case——零行为变化的纯类型分拆不需要。

### 依赖的现有元素

- `packages/core/src/ir/path/step.ts` 的 `IR*Step` 系列 —— 引用作 React props 命名对照
- `packages/core/src/primitive/path.ts` `ArrowEndSpec` —— 不在本 ADR scope，待 ADR-06 处理字段表互锁时一并审视
