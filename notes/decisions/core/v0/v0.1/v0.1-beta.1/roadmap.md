# v0.1.0-beta.1 实施待办

> 写于 2026-05-11。完工后保留留档（摘要见 roadmap v0.1 跟踪段）。
>
> 关联：[`v0 roadmap`](./roadmap.md) · [`packages/core/AGENTS.md`](../../../../../../packages/core/AGENTS.md) · [`alpha.5 ADRs`](../v0.1-alpha.5/)

## 背景与定位

v0.1 收尾两版分工（详见 `v0/roadmap.md` "拆分原则"）：

- **`v0.1.0-alpha.5`**：破坏性窗口最后一站（IR schema 扩张 / 字段语义调整 / 命名修正等"用户可见的破坏性改动"）。
- **`v0.1.0-beta.1`（本版）**：**非破坏性优化窗口**——bug 修复、性能优化、错误信息改善、内部重构、目录整理、文档完善。**不动 IR schema 字段名 / 语义 / 公开 API 表面**。

本文件登记 beta.1 的 TODO 列表。完工后把已落地条目摘要写进 `v0/roadmap.md` 的 v0.1 跟踪段（本文件保留留档）。

---

## 进度看板

| # | 标题 | 状态 | 工作量 | 优先级 |
|---|---|---|---|---|
| 1 | `FontSchema` 抽到 `ir/font.ts` | ✅ 完成（a254e09） | 小 | P1 |
| 2 | `LineSpec` / `NodeText` 抽到 `ir/text.ts` | ✅ 完成（a254e09） | 小 | P1 |
| 3 | core 注释 / `.describe()` 去 SVG-imposing 语言 | ✅ 完成（0949079） | 中 | P1 |
| 4 | `StepProps` 拆 10 个命名子类型 | ✅ 完成（2445b8b） | 中 | P1 |
| 5 | polar 角度方向 schema describe 修正 | ✅ 完成（b7c01cb） | 小 | P0（bug） |
| 6 | versioning mdx 相对链接死链修 | ✅ 完成（b7c01cb） | 极小 | P0（bug） |
| 7 | `polar.fromPosition` delegate `point.toPolar`（去重） | ✅ 完成（b7c01cb） | 极小 | P3 |
| 8 | geometry 4 shape `localToWorld`/`worldToLocal` 抽 `_transform.ts` + 死 `*Anchor` 类型清理 | ✅ 完成（42a6c67） | 小 | P1 |
| 9 | 公开 type `TextLine` / `PathCommand` / `Transform` 字段 JSDoc 补 + 拆 named type | ✅ 完成（2445b8b，与 #4 合并） | 小-中 | P1 |
| 10 | unbuilder round-trip 补 alpha.5 新增形态（OffsetPosition / AtPosition / `arrowDetail` / 7 keyword `position`） | ✅ 完成（21bfcb9） | 中 | P1 |
| 11 | `compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 与 enum 互锁 | ✅ 完成（step 1 守门 `73725c8` / step 2 拆 `7cf245a` / step 3 perf `007fcd4` / step 4 互锁 `e6b234a`） | 中-大 | P2 |
| 12 | `_builder.ts` ↔ `_unbuilder.ts` 镜像字段表化（`NODE_FIELDS as const` + `AssertEqual` 互锁） | ✅ 完成（`f6e0dca` builder + `7fb7957` _fields.ts 共享 + unbuilder） | 中 | P2 |
| 13 | `_builder.ts` 60 处 `as` cast 收敛到顶层 | ✅ 完成（`f6e0dca` typed buildXxxFromProps + 顶层 cast 收敛） | 中 | P2 |
| 14 | `CompileOptions.onWarn` 收集器：路径解析 silent fail → 显式 warning | ✅ 完成（9f21775） | 中 | P0 |
| 15 | 边界测试补：`parseWay` 形状算子错误路径 / `view-box` NaN-Infinity / `fallbackMeasurer` 极端值 / `buildPathD`/`buildTransform` throw message 契约 / 多 `<Tikz>` 实例 marker id 隔离 e2e | ✅ 完成（0a0bc74，含 schema .finite() 让 cross-test 全过） | 中 | P2 |
| 16 | 改名 + 命名清理（`NodeTextSchema`→`TextBlockSchema`、`_builder` / `_unbuilder` 去 `_` 前缀、`renderPrim.tsx` 公开签名 `ctx`→`context`） | ✅ 完成（b9eb378，beta 不考虑兼容性纳入 NodeTextSchema 改名） | 小-中 | P2，**含 BREAKING** |
| 17 | arrow marker `stableSpecKey` 字段表与 `ArrowEndSpec` 类型互锁 | ✅ 完成（ea9a58a） | 小 | P1 |
| 18 | core 测试 helper 去除 renderer mirror 漂移风险 | ✅ 完成（`6235835` 74 处 + 2 处 buildTransform 全迁移；删 helpers/path-d.ts / transform.ts；新建 path-command-factory.ts） | 中（74 处 `pathCommandsToD` / 8 文件） | P2 |

---

## TODO-1 — `FontSchema` 从 `node.ts` 抽离到 `ir/font.ts` ✅ 完成（a254e09）

### 问题陈述

`packages/core/src/ir/node.ts` 当前 321 行，混着 4 个 schema（`FontSchema` / `LineSpecSchema` / `NodeTextSchema` / `NodeLabelSchema` / `NodeSchema`）+ 5 个派生类型 + 1 个 const 集合。其中 `FontSchema` **不是节点专属属性**——它描述的是文字排印规格（family / size / weight / style），node.ts 里已经被 3 处复用：

- `NodeSchema.font`（块级）
- `LineSpecSchema.font`（行级覆盖）
- `NodeLabelSchema.font`（label 级覆盖）

v0.2 预备项里 Scope / Group 全局字体默认值、`<Tikz fontDefault={...}>`、edge label 字体等还会继续引用——`FontSchema` 是横切多个引用点的"工具型 schema"，不应该住在 `node.ts`。

### 建议方案

**搬到独立文件 `packages/core/src/ir/font.ts`，单文件不开文件夹**（单 schema 开 `font/` 文件夹是过度——参考 `ir/coordinate.ts` / `ir/scene.ts` 同级单文件先例；只有 `ir/position/` 因有 3 个互不耦合的 schema 才开文件夹）。

### 改动清单

| 改动 | 文件 |
|---|---|
| 新建 `ir/font.ts`：搬迁 `FontSchema` + `IRFont` 派生类型 + 关联 JSDoc | `packages/core/src/ir/font.ts`（新文件） |
| 从 `node.ts` 删 `FontSchema` 定义 + `IRFont` 类型；改为 `import { FontSchema } from './font'`；`IRFont` 不再在 node.ts 中重复声明 | `packages/core/src/ir/node.ts` |
| barrel 加 `export * from './font'` | `packages/core/src/ir/index.ts` |
| 公开 API 不需要改 | `packages/core/src/index.ts`（已 re-export `FontSchema` / `IRFont`，链路自动跟随） |

### 验证项

- `pnpm --filter @retikz/core exec tsc --noEmit` 通过
- `pnpm --filter @retikz/core exec eslint . --fix` 通过
- `pnpm --filter @retikz/core test:run` 全绿（schema 形态不变，所有快照 / 等价性测试应原封通过）
- React adapter 编译通过——`@retikz/react` 间接通过 `core/src/index.ts` 拿 `FontSchema`，不直接 import 子路径
- `apps/docs` 编译通过（同理）

### 不需要的事项

- **不需要更新文档**——按 AGENTS.md "用户可见改动必须同步文档站"判断口诀，本项 IR schema / DSL / 公开 API 全部等价，用户读现有文档不会"据此写出与新代码不一致的代码"，属于"编译器 / 渲染器内部纯重构"豁免范围。
- **不需要 ADR**——纯目录搬迁，无设计决策需要固化。

---

## TODO-2 — `LineSpecSchema` + `NodeTextSchema` 从 `node.ts` 抽离到 `ir/text.ts` ✅ 完成（a254e09）

### 问题陈述

`node.ts` 目前还住着两个**非 node-specific** 的文本结构原语：

| schema | 内容 | 真的"node 专属"吗 |
|---|---|---|
| `LineSpecSchema` | 单行文字（`text` + 可选 `fill` / `opacity` / `font` 覆盖） | 否——通用样式化文本行 |
| `NodeTextSchema` | `string \| Array<LineSpec>` 多行包装 | 名字带 Node，结构不 node-specific——就是个"文本块" |

未来潜在复用点：

- `StepLabelSchema.text`（边标注）现在是 `z.string()`，想升级到多行 + 行级覆盖 → 复用 `LineSpecSchema`
- `NodeLabelSchema.text` 同上
- 未来 `<Text>` standalone IR 节点 → 直接吃 `NodeTextSchema`

`NodeLabelSchema` **不在搬迁范围**——它的 `position: 8-direction relative to node border` + `distance` 是 node 边界几何专属，留 `node.ts` 概念清晰。

### 建议方案

新建 `packages/core/src/ir/text.ts`，**`LineSpecSchema` + `NodeTextSchema` 一并搬过去**（两者绑死：`NodeTextSchema = z.union([z.string(), z.array(LineSpecSchema).min(1)])`，拆两文件互相 import 反而复杂）。

不开 `ir/text/` 文件夹——目前只 2 schema，跟 `ir/font.ts` 同级单文件足够。

构成 `ir/` 下的"文本原语层"：

- `ir/font.ts` 管排印规格（family / size / weight / style）
- `ir/text.ts` 管文本内容结构（行 + 块）
- `ir/node.ts` 留专属于"节点"的 schema（NodeLabel 等）

### 不改名 — 名字保持 `LineSpecSchema` / `NodeTextSchema`

长期看 `NodeTextSchema` 应该叫 `TextBlockSchema` 之类（名实相符），但**改名 = 破坏公开 API**（`core/src/index.ts` 导出 `NodeTextSchema`）——属于 alpha 窗口动作，beta.1 不能做。本条**只搬位置不改名**；改名意图见下方 `## 后续 alpha 待提案`。

### 改动清单

| 改动 | 文件 |
|---|---|
| 新建 `ir/text.ts`：搬迁 `LineSpecSchema` + `IRLineSpec` + `NodeTextSchema` + 关联 JSDoc；`LineSpec` 内部 `import { FontSchema } from './font'` | `packages/core/src/ir/text.ts`（新文件） |
| 从 `node.ts` 删两个 schema 的定义；改为 `import { LineSpecSchema, NodeTextSchema } from './text'`；`IRLineSpec` 不再在 node.ts 中重复声明 | `packages/core/src/ir/node.ts` |
| barrel 加 `export * from './text'` | `packages/core/src/ir/index.ts` |
| 公开 API 不需要改 | `packages/core/src/index.ts`（已 re-export `LineSpecSchema` / `IRLineSpec` / `NodeTextSchema`，链路自动跟随） |

### 前置依赖

依赖 TODO-1 落地——`text.ts` 里的 `LineSpecSchema` 要 `import { FontSchema } from './font'`。两条按顺序提交，或一个 PR 里一并搬。

### 验证项

- `pnpm --filter @retikz/core exec tsc --noEmit` 通过
- `pnpm --filter @retikz/core exec eslint . --fix` 通过
- `pnpm --filter @retikz/core test:run` 全绿（schema 形态不变）
- React adapter / docs 编译通过（间接通过 `core/src/index.ts` 拿，不直接 import 子路径）

### 不需要的事项

- **不需要更新文档**——理由同 TODO-1，内部目录搬迁、用户可见行为等价
- **不需要 ADR**——同 TODO-1

---

## TODO-3 — core 注释 / `.describe()` 去除 SVG-imposing 语言

### 问题陈述

`packages/core/src/` 下大量 JSDoc 注释 + zod `.describe()` 字符串把 SVG 当作"the renderer"来描述类型——"椭圆原语"被写成"对应 SVG `<ellipse>`"、"dash 模式"写成"SVG stroke-dasharray 模式"、`<tspan>` / SVG path "M"/"L"/"Q"/"C"/"Z" 等满天飞。

这与 `packages/core/AGENTS.md` 硬约束冲突：**"不准依赖 DOM API"** 延伸到注释层就是 core 描述抽象 IR / primitive 时**不该假定"目标渲染器是 SVG"**。这种语言让人误以为 core 是 SVG 库，未来 canvas / Skia / PDF adapter 作者读这些注释会被误导。

### grep 出的位置（按文件聚合）

**`packages/core/src/primitive/`**：

- `ellipse.ts:2` — "椭圆原语，对应 SVG `<ellipse>`"
- `rect.ts:19, 23` — "SVG stroke-opacity"、"SVG stroke-dasharray 模式"
- `group.ts:7` — "SVG transform 字符串"（注：该字段本身在 alpha.5 TODO-6 已规划结构化重构）
- `view-box.ts:1` — "SVG viewBox 数值四元组"
- `text.ts:1, 14, 30` — `<tspan>` 多处提及
- `path.ts:3-21` — 全文 SVG-tinted（alpha.5 TODO-6 重写时自然清理）

**`packages/core/src/compile/`**：

- `node.ts:36, 52, 65, 87` — "SVG textAnchor" / "SVG transform" / "SVG stroke-dasharray"
- `path.ts` 多处 — "SVG y-down CW" / "SVG cursor" / "SVG marker"（大部分随 alpha.5 TODO-6 重写消失）

**`packages/core/src/ir/`**：

- `node.ts:19, 51, 224, 229` — JSDoc / `.describe(...)` 多处 "SVG `<text>`" / `<tspan>` / "SVG stroke-dasharray"
- `path/path.ts:24, 48, 54, 60` — `.describe(...)` "SVG stroke-dasharray" / "SVG fill-rule" / "SVG stroke-linecap" / "SVG stroke-linejoin"
- `path/step.ts:39, 49, 83, 107, 121, 160, 177, 191, 228` — `.describe(...)` "SVG path M/L/Z/Q/C" / "SVG A 命令"

**`packages/core/src/geometry/`**：

- `bend.ts:5` — "法向 SVG y-down"（改为 "screen y-down"——y-down 是 SVG/Canvas/PDF 共享几何约定，不是 SVG 专属）
- `arc.ts` 多处 — 整体随 alpha.5 TODO-5 挪去 react adapter 处理

**保留不动**：

- `parseWay.ts:24` "TikZ `cycle` / SVG `Z`" —— TikZ-SVG 对照语境，引用合法
- `primitive/scene.ts:10` "不允许出现 SVG-only 或 Canvas-only 特性" —— 这本身就是正确表述

### 替换原则

注释 / `.describe(...)` 应**渲染器中性，只描述 IR / Scene 语义**：

| 旧（SVG-imposing） | 新（中性） |
|---|---|
| "对应 SVG `<ellipse>`" | "椭圆原语（cx/cy 圆心，rx/ry 半径）" |
| "SVG stroke-opacity" | "描边透明度 0~1" |
| "SVG stroke-dasharray 模式" | "描边 dash 模式字符串（如 '4 2'，与 SVG/CSS `stroke-dasharray` 同格式）" |
| "SVG fill-rule" | "填充规则（nonzero / evenodd）" |
| "SVG stroke-linecap" | "描边端点形状（butt / round / square）" |
| "SVG stroke-linejoin" | "描边拐角形状（miter / round / bevel）" |
| "SVG path M / L / Z / Q / C / A" | "move（不绘） / line / close / quad Bezier / cubic Bezier / arc" |
| "`<tspan>`" | "单行 / 行级内容" |
| "renderer 每行画 `<tspan>`" | "renderer 按 lineHeight 堆叠多行" |
| "SVG textAnchor" | "文字对齐锚点（start / middle / end）" |
| "SVG y-down" / "SVG y-down CW" | "screen y-down" / "y-down 屏幕坐标系" |
| "SVG marker" | "箭头 marker（renderer 端实现）" |
| "SVG viewBox 数值四元组" | "viewBox 数值四元组 `[x, y, w, h]`（与 SVG `viewBox` 同语义）" |

**保留 SVG 名字作为"格式标识"的情况**（不是"为 SVG 准备"，而是"与该标准格式兼容"）：

- dash 模式格式（与 SVG/CSS `stroke-dasharray` 同格式）—— 这里 SVG 是格式标准的 reference，类似"与 ISO XXX 兼容"
- viewBox 数值（与 SVG `viewBox` 同语义）—— 同上

### 改动清单

| 改动 | 文件 |
|---|---|
| 改 primitive/ 注释 | `ellipse.ts` / `rect.ts` / `view-box.ts` / `text.ts`（`group.ts` / `path.ts` 已被 alpha.5 TODO-6 重写覆盖） |
| 改 compile/ 注释 | `node.ts`（compile/path.ts 大部分随 alpha.5 TODO-6 重写） |
| 改 ir/ JSDoc + `.describe(...)` | `node.ts` / `path/path.ts` / `path/step.ts` |
| 改 geometry/ 注释 | `bend.ts` "SVG y-down" → "screen y-down" |
| 不动 | `parseWay.ts`（TikZ 对照保留 SVG 引用）、`primitive/scene.ts`（已正确表述）、`geometry/arc.ts`（alpha.5 TODO-5 已规划挪出） |

### 前置依赖

依赖 alpha.5 TODO-5（arc.ts 挪 react）+ TODO-6（PathPrim/GroupPrim 结构化重构）落地——这两条会顺手清掉 `geometry/arc.ts` / `primitive/path.ts` / `primitive/group.ts` / `compile/path.ts` 的 SVG 注释。beta.1 TODO-3 处理 alpha.5 没覆盖到的**剩余 SVG-imposing 注释**。

### 验证项

- `pnpm --filter @retikz/core exec tsc --noEmit` 通过
- `pnpm --filter @retikz/core exec eslint . --fix` 通过
- `pnpm --filter @retikz/core test:run` 全绿（schema 形态不变，纯 `.describe(...)` 字符串变化）
- React adapter / docs 编译通过

### 不需要 ADR

纯注释 / 描述字符串清理；按 AGENTS.md "core 不准依赖 DOM API" 原则延伸到注释层。

### 副作用

`.describe(...)` 字符串变化会影响 zod JSON Schema 导出 —— LLM tool definition 系统提示里看到的描述会换一批，这是**好事**（让 LLM 生成的 IR 更不依赖具体 renderer）。文档站不需要改 —— mdx 自己写的描述，跟 zod schema 描述独立。

---

## TODO-4 — `StepProps` 拆分为命名子类型

### 问题陈述

`packages/react/src/kernel/Step.tsx` 的 `StepProps` 是一个 100+ 行的内联 discriminated union literal——10 个 `{ kind: '...', ... }` 分支铺在一个 `|` 链上：

- 读起来困难，单分支没法独立 import 做 wrapper / HOC / forwardRef 派生
- IDE 类型 hover 一次蹦出全部 10 个变体
- 修单个变体时容易误改邻近变体
- 与 `@retikz/core` 那边 `IRMoveStep` / `IRLineStep` / ... 已经按 kind 拆开的命名风格不一致

### 建议方案

按 IR 的命名惯例切出 10 个子类型，最后用 union 拼回 `StepProps`：

```ts
export type MoveStepProps = {
  kind: 'move'
  to: IRTarget
}

export type LineStepProps = {
  kind?: 'line'      // 默认，可省
  to: IRTarget
  label?: IRStepLabel
  children?: ReactNode
}

export type FoldStepProps = {
  kind: 'step'       // IR 端 FoldStep 的 kind 字面量沿用 'step'
  via: '-|' | '|-'
  to: IRTarget
  label?: IRStepLabel
  children?: ReactNode
}

export type CycleStepProps = { kind: 'cycle' }

export type CurveStepProps = { kind: 'curve'; control: IRControlPoint; to: IRTarget; label?: IRStepLabel; children?: ReactNode }
export type CubicStepProps = { kind: 'cubic'; control1: IRControlPoint; control2: IRControlPoint; to: IRTarget; label?: IRStepLabel; children?: ReactNode }
export type BendStepProps = { kind: 'bend'; bendDirection: 'left' | 'right'; bendAngle?: number; to: IRTarget; label?: IRStepLabel; children?: ReactNode }
export type ArcStepProps = { kind: 'arc'; startAngle: number; endAngle: number; radius: number; label?: IRStepLabel; children?: ReactNode }
export type CirclePathStepProps = { kind: 'circlePath'; radius: number; label?: IRStepLabel; children?: ReactNode }
export type EllipsePathStepProps = { kind: 'ellipsePath'; radiusX: number; radiusY: number; label?: IRStepLabel; children?: ReactNode }

export type StepProps =
  | MoveStepProps
  | LineStepProps
  | FoldStepProps
  | CycleStepProps
  | CurveStepProps
  | CubicStepProps
  | BendStepProps
  | ArcStepProps
  | CirclePathStepProps
  | EllipsePathStepProps
```

每个子类型独立 export，方便用户 `Pick<BendStepProps, 'bendDirection'>` 或写 wrapper（如 `BezierStep = (props: CurveStepProps | CubicStepProps) => ...`）；IDE hover 一次只显示一个变体。

### 命名对照 IR

| IR (`@retikz/core`) | React props (`@retikz/react`) | kind 字面量 |
|---|---|---|
| `IRMoveStep` | `MoveStepProps` | `'move'` |
| `IRLineStep` | `LineStepProps` | `'line'`（默认可省） |
| `IRFoldStep` | `FoldStepProps` | `'step'` |
| `IRCycleStep` | `CycleStepProps` | `'cycle'` |
| `IRCurveStep` | `CurveStepProps` | `'curve'` |
| `IRCubicStep` | `CubicStepProps` | `'cubic'` |
| `IRBendStep` | `BendStepProps` | `'bend'` |
| `IRArcStep` | `ArcStepProps` | `'arc'` |
| `IRCirclePathStep` | `CirclePathStepProps` | `'circlePath'` |
| `IREllipsePathStep` | `EllipsePathStepProps` | `'ellipsePath'` |

### 改动清单

| 改动 | 文件 |
|---|---|
| 切分 10 个子类型 + 重组 union | `packages/react/src/kernel/Step.tsx` |
| 公开 API 导出 10 个子类型 + 保留原 `StepProps` | `packages/react/src/index.ts` |
| 可选：分支文件化（若 Step.tsx 仍嫌长） | 暂不拆文件——10 个 type 加起来 ~50 行，单文件可控；拆文件先记入栈区 |
| 测试 | 现有 `react/tests/kernel/_builder.test.tsx` / `Draw.test.tsx` 用例不变（运行时形态等价）；可选加一组"子类型可独立 import"smoke test |

### 是否破坏性

**非破坏性**：

- `StepProps` 形态（10 变体并集）完全等价
- 新增 10 个 export 是 superset 扩张
- 用户原有 `<Step kind="bend" ... />` 调用 / `import { StepProps } from '@retikz/react'` 全部保持有效

### 不需要 ADR

纯类型分拆 + 导出扩张，无设计决策。

### 验证项

- `pnpm --filter @retikz/react exec tsc --noEmit` 通过
- `pnpm --filter @retikz/react exec eslint . --fix` 通过
- `pnpm --filter @retikz/react test:run` 全绿
- docs / 测试 import 不受影响

---

## 后续 alpha 待提案（**不在 beta.1 范围**，登记备忘）

> 以下是 beta.1 阶段**不能做**但发现值得做的破坏性改动，等下一次 alpha 窗口（v0.2 alpha）开起时挪进对应 alpha 计划。

- **`NodeTextSchema` → `TextBlockSchema` 重命名**：名字带 "Node" 但内容是通用文本块；与 `text.ts` 文件位置呼应、与未来 StepLabel / NodeLabel / `<Text>` 复用呼应。需 ADR：是否同步重命名 `IRNodeText` 类型 + 是否短期保留 `NodeTextSchema` 作为 deprecated alias。

---

## TODO-5 — polar 角度方向 schema describe 修正（bug） ✅ 完成（b7c01cb）

### 问题陈述

`packages/core/src/ir/position/polar-position.ts:17` 旧 describe 写 `"counter-clockwise positive (TikZ convention)"`，`packages/core/src/geometry/polar.ts:18` JSDoc 写 `"逆时针为正"`——但 compile 实际行为是 SVG 屏幕 y-down 下的 CW（与 `ir/path/step.ts` 中 `ArcStep` describe 一致诚实）。LLM / 用户读 polar schema 生成径向图会方向反。

### 已落地方案

两处 polar 角度描述改为渲染器中性表述："Angle in degrees, measured from +x axis (0°). 90° = +y = screen-down (visual clockwise under screen y-down)"；与 ArcStep / Node label 角度约定对齐。

### 不需要 ADR

纯 describe 字符串修正，无设计决策。

---

## TODO-6 — versioning mdx 相对链接死链修 ✅ 完成（b7c01cb）

### 问题陈述

`apps/docs/src/contents/about/releases/versioning/index.{zh,en}.mdx:38` 写 `[AI 辅助开发](../../../../../../apps/docs/src/contents/about/developer/ai-assisted-development)`——retikz 的 mdx `<a>` 只对 `/` 开头走 react-router，相对路径会落到浏览器原生导航，从 `/about/releases/versioning` 加 `../../../../../../apps/docs/src/contents/about/developer/ai-assisted-development` 解析为不存在的 `/about/releases/ai-assisted-development`。

### 已落地方案

中英两份相对路径都改为绝对路径 `/about/ai-assisted-development`。

---

## TODO-7 — `polar.fromPosition` delegate `point.toPolar`（去重） ✅ 完成（b7c01cb）

### 问题陈述

`geometry/polar.ts:52` 的 `polar.fromPosition` 实现（`atan2` + `hypot`）与 `geometry/point.ts:19` 的 `point.toPolar` 一字不差，且 `polar.equal` 已有 delegate 到 `point.equalPolar` 的先例。

### 已落地方案

`polar.fromPosition` 改为 `(p) => point.toPolar(p)` 单行委托；删除 `polar.ts` 内多余的 `RAD_TO_DEG` 常量。

---

## TODO-8 — geometry 4 shape `localToWorld` / `worldToLocal` 抽 `_transform.ts` + 死 `*Anchor` 类型清理

### 问题陈述

`packages/core/src/geometry/{rect,circle,ellipse,diamond}.ts` 各自一份 `localToWorld(s, local)` / `worldToLocal(s, world)` 函数（30 行 × 4 = 120 行），函数体一字不差只参数类型名不同。

同时 `CircleAnchor`（`circle.ts:16`）/ `EllipseAnchor`（`ellipse.ts:18`）/ `DiamondAnchor`（`diamond.ts:16`）三个类型的字面量与 `RectAnchor` 9 个值完全相同；grep 全仓除自定义文件 + `index.ts` re-export 外**零消费方**。

### 建议方案

(1) 新建 `packages/core/src/geometry/_transform.ts` 暴露 `localToWorld(s, local)` / `worldToLocal(s, world)`，参数化"中心 + 旋转弧度"（`type CenteredShape = { x: number; y: number; rotate?: number }`）；4 个 shape 文件 import 共用版本。

(2) 公开 type 收敛：保留 `RectAnchor`，删除三个重复类型；`index.ts` re-export 保留 `CircleAnchor`/`EllipseAnchor`/`DiamondAnchor` 作为 alias `export type CircleAnchor = RectAnchor`，不破坏外部 import。

### 改动清单

| 改动 | 文件 |
|---|---|
| 新建共享 helper | `packages/core/src/geometry/_transform.ts` |
| 4 文件改为 import 共享 helper、删本地实现 | `geometry/{rect,circle,ellipse,diamond}.ts` |
| 三个 `*Anchor` 类型 → alias 到 `RectAnchor` | `geometry/{circle,ellipse,diamond}.ts` |
| barrel 不动 | `geometry/index.ts` |

### 验证项

- core/react/docs 三个 workspace `tsc --noEmit` 通过
- `pnpm test` 全绿
- 公开 API surface 不变（alias 保留）

### 风险

低，纯内部重构 + 公开类型表面别名兼容。

---

## TODO-9 — 公开 type `TextLine` / `PathCommand` / `Transform` 字段 JSDoc 补齐 + 拆 named type

### 问题陈述

(a) `primitive/text.ts` 的 `TextLine` type 字段无 JSDoc（违反根 AGENTS.md "type 每个属性都要 JSDoc"）；
(b) `primitive/path.ts` 的 `PathCommand` 7 分支 union 只在顶层有注释，每个 kind 分支字段无独立 JSDoc；
(c) `primitive/group.ts` 的 `Transform` 3 分支 union 同样；
(d) `parsers/parseTargetSugar.ts` 导出函数 `parseTargetSugar` 函数体上方无 JSDoc（JSDoc 写在文件顶级常量上）；
(e) `geometry/segment.ts` 的 `SegmentSample` type 上方无 JSDoc（模块顶用 `/* ... */` 不是 JSDoc）。

### 建议方案

- `PathCommand` 拆 7 个 named type（`MovePathCommand` / `LinePathCommand` / `QuadPathCommand` / `CubicPathCommand` / `ArcPathCommand` / `EllipseArcPathCommand` / `ClosePathCommand`），union 由 named 组成，每个字段独立 JSDoc——与 TODO-4 拆 `StepProps` 同风格
- `Transform` 同上拆 `TranslateTransform` / `RotateTransform` / `ScaleTransform`
- `TextLine` 字段补 JSDoc
- `parseTargetSugar` JSDoc 移到函数上方
- `SegmentSample` 补 JSDoc

### 验证项

- core/react/docs 编译通过
- 测试全绿（纯类型 / 注释变化）
- 公开 API surface 扩张（新 export named type），向下兼容

### 不需要 ADR

纯类型分拆 + 注释补全。

---

## TODO-10 — unbuilder round-trip 补 alpha.5 新增形态

### 问题陈述

`packages/react/tests/kernel/_unbuilder.test.tsx` 当前覆盖 alpha.3 之前的 `Node shape` / `arrow` / `label` / `fillRule` / `lineCap` / `thickness` / `opacity` 等 round-trip。但 alpha.5 加进 IR 的 4 个 schema 增项**未有 react-layer round-trip 测试**：

- `Node.position` 形态 `{ direction, of, distance }`（alpha.4 ADR-01，可能也未补 round-trip）
- `Node.position` 形态 `{ of, offset }`（alpha.5 ADR-04 OffsetPosition）
- `step.to` 形态 `{ of, offset }`（alpha.5 ADR-04 进 IRTarget）
- `Path.arrowDetail` 全字段（含 `start` / `end` 子对象、起末异形 / 异色 / 异 scale）
- `StepLabel.position` 7 keyword + 任意 0..1 数值

`_unbuilder.ts` 已经透传相应字段，但 round-trip（IR → React JSX → IR）等价性没测过——unbuilder bug 隐藏点。

### 建议方案

在 `packages/react/tests/kernel/_unbuilder.test.tsx` 补 5 组测试，每组：构造含上述形态的 IR → `convertIRToReactNode` → `buildIR` → 与原 IR 深比较。

### 验证项

- `pnpm --filter @retikz/react test:run` 全绿；若发现 round-trip 不等价，**算 alpha.5 遗留 bug**，回补 unbuilder
- 5 个新测试用例命中前文 4 个增项

### 不需要 ADR

纯补测。

---

## TODO-11 — `compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 与 enum 互锁

### 问题陈述

`packages/core/src/compile/path.ts` 单文件 879 行；其中 `emitPathPrimitive` 单函数 489 行，混 8 类职责（relative 解析 / step iteration / emit helpers / arrow shrink / label emit / sub-path split / endpoint shift / cycle close）。

`emitPathPrimitive` 内 `findPrev(i)` 每步反向扫一遍 anchors 数组，n 步全程 **O(n²)**——典型流程图 50+ step 时已成 hotspot。

`compile/path.ts:194` 的 `THICKNESS_TO_WIDTH: Record<NonNullable<IRPath['thickness']>, number>` 与 `ir/path/path.ts:60-68` 的 `thickness` enum 列表字面重复，新增档位漏写 TS 不抓。

### 建议方案

拆 `compile/path/` 子目录：

- `compile/path/index.ts` —— `emitPathPrimitive` 入口（主循环）
- `compile/path/relative.ts` —— `normalizeRelativeTargets`
- `compile/path/shrink.ts` —— arrow shrink + endpointOf + setEndpoint
- `compile/path/split.ts` —— sub-path split for markers
- `compile/path/label.ts` —— `emitLabelPrimitive`

`findPrev` 改单调指针：步序只前进、`lastDrawnIdx` 单调，O(n) 整体。

`THICKNESS_TO_WIDTH` 改为 `Record<IRPath['thickness'] & string, number>`（zod enum 字面量类型作 key），新增档位漏写哪边 TS 报错。

### 验证项

- 拆分前先加 e2e snapshot test 锁住 IR→Scene 输出，再做改动
- `pnpm test` 全绿（行为等价）
- `tsc --noEmit` 通过

### 风险

中。建议先小步重构（拆 1 个子文件 + 测试守门，再拆下一个），避免一次性大改难 review。

### 不需要 ADR

纯目录重构 + 算法常数因子优化。

---

## TODO-12 — `_builder.ts` ↔ `_unbuilder.ts` 镜像字段表化

### 问题陈述

`_builder.ts:98-131` `buildNode` 30+ 行 `id: props.id as ...` 字段赋值；`_unbuilder.ts:9-42` `nodePropsFromIR` 30+ 行镜像 `if (n.id !== undefined) props.id = n.id`。两边字段表手动维护、加新 IR 字段必改两处，TS 不抓漏。

`_unbuilder.ts:44-124` `stepToElement` ↔ `_builder.ts:170-306` `readPathChildren` 也是 10-kind 镜像 switch。

### 建议方案

```ts
const NODE_FIELDS = ['id', 'shape', 'rotate', /* ... */] as const;

// 编译期校验字段表覆盖 IRNode 所有 key（漏一个就报错）
type _NodeFieldsCheck = AssertEqual<
  typeof NODE_FIELDS[number],
  Exclude<keyof IRNode, 'type' | 'text' | 'position' | 'label'>  // 特化字段单独处理
>;

const ir = pickDefined(props, NODE_FIELDS);
const reactProps = pickDefined(ir, NODE_FIELDS);
```

`text` / `position` / `label` 等"读取来源不止 props"的特化字段保留独立处理路径，只把"纯透传"字段表化。

### 验证项

- TS 静态保证字段表完备
- `pnpm test` 全绿（行为等价）

### 不需要 ADR

纯类型层面互锁。

---

## TODO-13 — `_builder.ts` 60 处 `as` cast 收敛

### 问题陈述

`react/src/kernel/_builder.ts` 全文 grep 出 **60 处 `props.X as <Type>`** cast。根本原因：`Children.forEach` 给的 `child.props` 是 `unknown`，需要按约定 narrow。但当前写法等同 100% 信任调用方 props 类型正确，IR 类型错位时**编译期不会报错，运行期到 zod 校验之前**。

同时 `parsers/parseTargetSugar.ts:10` `return input as IRTarget` 把 `unknown` 直接 cast 到 `IRTarget`，对非字符串非 relative 形态完全不验证。

### 建议方案

给每个 Kernel 组件加一个类型化签名的 `buildXxxFromProps(props: XxxProps): IRChild` 入口（props 用各自 `NodeProps` / `PathProps` / `StepProps`，不是 `Record<string, unknown>`），cast 一次性收敛到顶层 `child.props as NodeProps` 这一处。子函数内部走类型化签名，字段 rename 时 TS 抓所有点。

`parseTargetSugar` 参数从 `unknown` 改 `IRTarget | string`，调用方在边界做窄化。

### 风险

低。对外 API / 运行时行为不变。

### 不需要 ADR

类型层面强化。

---

## TODO-14 — `CompileOptions.onWarn` 收集器：路径解析 silent fail → 显式 warning（P0 体验）

### 问题陈述

`packages/core/src/compile/path.ts` 在路径解析失败时 **20+ 处 silent `return null`**（line 132/144/169/181/399/448/451/462/582/586/601/667/677/687/696/709/720/775），`compile.ts:96` 的调用方 `if (result)` 跳过——用户写 `<Path><Step to="bogusId"/></Path>` **整个 path 静默消失、控制台零信息**。

同病：
- `compile/position.ts` 三处 `return null`
- `_builder.ts:42` "non-string `<Text>` children 静默跳过"
- `_builder.ts:154` "多个 `<EdgeLabel>` 取首个其余静默丢"

调试体验最差的位置之一。

### 建议方案

引入 `CompileWarning` 收集器：

```ts
type CompileWarning = {
  code: 'UNRESOLVED_TARGET' | 'INVALID_REL_INITIAL' | ...
  message: string
  path: string  // IR locator，如 'children[3].path.children[1].to'
};

CompileOptions.onWarn?: (w: CompileWarning) => void;
```

所有 silent fail 点改成 `onWarn(...)` 后再 return null。默认行为：
- dev 模式（`process.env.NODE_ENV !== 'production'`）`console.warn`
- 生产环境无 callback 时静默（兼容旧行为）
- 测试 / 用户可注入自己的 logger

### 改动清单

| 改动 | 文件 |
|---|---|
| 加 `CompileOptions.onWarn` + `CompileWarning` 类型 | `packages/core/src/compile/compile.ts` |
| 20+ 个 `return null` 点加 `onWarn(...)` | `packages/core/src/compile/path.ts` |
| 3 个 `return null` 点加 `onWarn(...)` | `packages/core/src/compile/position.ts` |
| 公开 API 加 `CompileWarning` export | `packages/core/src/index.ts` |
| 测试 | core 加新测试组：构造错误 IR → 验 `onWarn` 收到对应 code + path |

### 风险

非破坏性——不传 `onWarn` 默认行为与旧版等价（控制台默认 `console.warn`，可关）。

### 不需要 ADR

API 可选字段扩张。

---

## TODO-15 — 边界测试补

### 问题陈述

`parseWay` / `view-box` / `fallbackMeasurer` / `buildPathD` / `buildTransform` / `Tikz` 的若干边界 / error 路径缺测试守门：

1. `parseWay` `WayCircleOp` / `WayEllipseOp` 错误路径：way[0] 是 circle/ellipse 算子是否降级 / 抛错？负 radius？arc `startAngle === endAngle`？
2. `view-box` `computeViewBox` 输入含 NaN / Infinity 时行为未规约（IR 含 polar 极端值能触发）
3. `fallbackMeasurer`：`size=0` / 负 size / NaN size / 多 codepoint emoji 文本（length 与 codepoint 不一致）
4. `buildPathD` / `buildTransform` 的 default → throw 只测了 `{ kind: 'unknown' }` 单条，未验证 throw message 包含 kind 名字（错误消息契约）
5. `Tikz` 的 `arrowMarkerPrefix` 在多 `<Tikz>` 实例下 marker id 是否隔离（同页 + 相同 arrow spec 不撞 SVG defs）e2e 测试缺
6. `browser-measurer`：模块级 canvas/ctx 单例（同次会话二次调用复用 canvas、不重复 `createElement`）未测

### 建议方案

按上面 6 条各加 1~3 个测试用例，目标补 10~15 个 case。

### 风险

零。纯补测。

---

## TODO-16 — 改名 + 命名清理（**部分有破坏性嫌疑**）

### 问题陈述

3 处命名不一致：

1. **`NodeTextSchema` → `TextBlockSchema`**：alpha.5 时已记入"后续 alpha 待提案"——名字带 "Node" 但内容是通用文本块；与 `text.ts` 文件位置呼应、与未来 StepLabel / NodeLabel / `<Text>` 复用呼应。
2. **`_builder.ts` / `_unbuilder.ts` 去 `_` 前缀**：`_` 前缀表示"内部模块"但 `buildIR` 经 `index.ts` 以 `convertReactNodeToIR` 公开导出。**文件 rename，公开 import path 不变。**
3. **`renderPrim.tsx` 公开签名 `ctx: RenderContext` → `context: RenderContext`**：与类型名对齐 + 符合 AGENTS.md "不用缩写"——但 `ctx` 是局部参数名，影响面极小。

### 风险评估

- 改 1 是 schema **导出名变化** → 破坏 `import { NodeTextSchema }` 调用方。alpha.5 已冻 schema 字段名 / 语义；**schema 导出名是否在冻结范围**？严格说"alpha.5 起公开 API 表面冻结"，导出名变化也算冲击。
- 改 2 是文件名 rename，公开 import path 不变；属内部命名整理，**非破坏**。
- 改 3 是函数参数名，对调用方零影响（位置参数 + TS 不约束参数名）；**非破坏**。

### 建议

- **改 2、改 3 进 beta.1** —— 非破坏性
- **改 1 推到下次 alpha 窗口（v0.2 alpha 或重开 alpha.6）** —— 严格守 schema 冻结约定，避免 beta.1 破公开 API 表面

### 不需要 ADR

改 2 / 改 3 是命名清理；改 1 推延后下次 alpha 窗口时再开 ADR。

---

## TODO-17 — arrow marker `stableSpecKey` 字段表与 `ArrowEndSpec` 类型互锁

### 问题陈述

`packages/react/src/kernel/Tikz.tsx` 里的 `stableSpecKey(spec: ArrowEndSpec)` 手写枚举 `shape / scale / length / width / color / fill / opacity / lineWidth`，用于 marker dedup 与 hash。当前行为测试已经覆盖了相同 spec 复用、不同 shape/color 分离、字段顺序不影响 hash，但**没有类型级保护**：未来 `ArrowEndSpec` 新增字段时，如果忘记同步 `stableSpecKey`，两个视觉不同的 arrow 可能复用同一个 marker id。

这类问题不会立刻被 TypeScript 或现有测试发现，属于“字段表漂移”风险，和 TODO-11 的 `THICKNESS_TO_WIDTH` / TODO-12 的 builder-unbuilder 字段镜像问题同类。

### 建议方案

把 marker key 的字段列表改成单一常量，并加类型互锁：

```ts
const ARROW_END_SPEC_KEY_FIELDS = [
  'shape',
  'scale',
  'length',
  'width',
  'color',
  'fill',
  'opacity',
  'lineWidth',
] as const satisfies ReadonlyArray<keyof ArrowEndSpec>;
```

再配一个 `AssertEqual` / `Exclude` 类型检查，确保 `ArrowEndSpec` 的 key 集合与字段表一致。`stableSpecKey` 只遍历这张表，避免手写 if 链重复。

### 改动清单

| 改动 | 文件 |
|---|---|
| 新增 `ARROW_END_SPEC_KEY_FIELDS`，`stableSpecKey` 改为遍历字段表 | `packages/react/src/kernel/Tikz.tsx` |
| 加类型互锁工具（可局部声明，不必公开） | `packages/react/src/kernel/Tikz.tsx` |
| 保留现有 marker hash 测试；补 1 条“全部 spec 字段参与 hash”的测试 | `packages/react/tests/kernel/Tikz-arrow-hash.test.tsx` |

### 风险

非破坏性。只收敛内部实现，marker id 的具体 hash 可能变化；该 id 不应作为公开契约。测试应断言 marker 数量 / 分离行为，不断言完整 hash 字符串。

### 不需要 ADR

内部质量加固，不改 IR schema / React DSL / public API。

---

## TODO-18 — core 测试 helper 去除 renderer mirror 漂移风险

### 问题陈述

`packages/core/tests/helpers/path-d.ts` 和 `packages/core/tests/helpers/transform.ts` 镜像了一部分 React adapter 的 `buildPathD` / `buildTransform` 逻辑，用来把 Scene primitive 再序列化成 SVG 字符串断言。这样写短期方便，但长期有两个风险：

1. core 测试本应守住“结构化 Scene primitive”契约，却把断言重心拉回 SVG mini-language。
2. helper 与 `packages/react/src/render/*` 各自维护，未来 arc / transform / rounding 语义改动时可能出现测试 helper 与真实 renderer 漂移，导致测试既可能误报，也可能漏报。

这不是立即 bug；更像测试层边界不够干净。TODO-15 已经登记了 renderer error path 的边界测试，本条专门处理“core 测试依赖 adapter 镜像逻辑”的结构性风险。

### 建议方案

优先让 core 测试直接断言 `PathCommand[]` / `Transform[]` 结构，而不是转成 SVG 字符串。只有在确实需要读者友好的字符串快照时，才保留极薄的 test-only formatter，并明确它不覆盖 renderer 语义。

可分两步：

1. 梳理使用 `pathCommandsToD` / test `buildTransform` 的测试，把能改成结构化断言的先改掉。
2. 剩余少量字符串断言迁移到 `packages/react/tests/render/*`，由 React adapter 自己测试 SVG 输出。

### 改动清单

| 改动 | 文件 |
|---|---|
| 统计并替换 core 测试中可结构化断言的 `pathCommandsToD` 调用 | `packages/core/tests/**/*.test.ts` |
| 统计并替换 core 测试中可结构化断言的 transform helper 调用 | `packages/core/tests/**/*.test.ts` |
| 删除或收窄 test helper 的职责说明 | `packages/core/tests/helpers/path-d.ts` / `packages/core/tests/helpers/transform.ts` |
| 如仍需 SVG 输出契约，迁到 React render 测试 | `packages/react/tests/render/*` |

### 风险

非破坏性。纯测试重构，但需要谨慎避免把可读性很强的旧字符串断言一次性全部打散；建议每次只迁一组测试，保证 failure diff 仍然清楚。

### 不需要 ADR

测试结构优化，不改用户可见行为。

---

## 入栈区（后续讨论新条目追加在此）

<!-- 后续讨论中确认要纳入 beta.1 的条目，依次以 TODO-N 形式追加到上面正式区 -->

无
