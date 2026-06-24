# ADR-02：过点平滑曲线 —— `<Path>` 的 `smooth` step

- 状态：Accepted（2026-06-16 收尾：`smooth` step + `@retikz/math` `curve/` 已实现 + 文档同步 + 评审/对账通过；cursor-less smooth = 跳过 path + `PATH_TOO_SHORT` 警告，codebase 一致口径）
- 决策日期：2026-06-15
- 关联：[v0.4-alpha.3 roadmap](./roadmap.md) · [v0.4 roadmap 候选 B](../roadmap.md#b--路径补强2026-06-12-拍板) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · [alpha.1 ADR-01 `@retikz/math`](../alpha.1/01-math-package-and-geometry-api.md)（`curve/` 子模块原「后置」，2026-06-15 人工拍板提前到本 milestone 开启）· `ir/path/step.ts`（`StepSchema`）· `path-generators/`（generator 机制）

> **范围**：B2「过点平滑曲线」——穿过点列的光滑曲线（TikZ `plot[smooth]` / Hobby 风格）。B1「任意折线圆角」见 [ADR-01](./01-polyline-rounded-corners.md)。

## 背景

TikZ `plot[smooth]` / Hobby：给一串点，画一条**穿过所有点**的光滑曲线，是画数据折线、流线、自由曲线的高频能力。塑造本决策的硬约束：

- 现有曲线 step 都是「逐段、显式控制点」：`curve`（二次贝塞尔）、`cubic`（三次贝塞尔）、`bend`（方向 + 角度算 cubic）。**没有「给点列、自动求光滑过点曲线」的能力**——用户要平滑过 N 个点，得手算 N-1 段贝塞尔控制点。
- generator 机制（`path-generators/`）是**用户 / Tier2 的逃生舱**：core 刻意不内置任何 curve generator，registry 由 `CompileOptions.pathGenerators` 外部注入。内置 generator 等于反悔该约定、让 core 去填它故意留空的 registry。

## 决策：新一等 step `kind: 'smooth'`，曲线过「cursor + points」，centripetal Catmull-Rom 编译成 cubic

把平滑过点曲线做成 `StepSchema` 第 13 个 kind `smooth`（不走 generator）。曲线**从当前 cursor 起、依次穿过 `points`**（cursor = 第一个 knot），编译期用 centripetal Catmull-Rom 转成 cubic 贝塞尔命令链。

```ts
// ir/path/step.ts —— 新增 SmoothStepSchema，并入 StepSchema discriminatedUnion（12 → 13 kind）
export const SmoothStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('smooth')
      .describe(
        'Smooth curve (TikZ `plot[smooth]` / Hobby style) passing through the current cursor as the first knot and then each point in `points`, in order. Compiled at build time to a chain of cubic Bezier commands via centripetal Catmull-Rom. Requires a preceding step to set the cursor; the cursor ends at the last point.',
      ),
    points: z
      .array(TargetSchema)
      .min(1)
      .describe(
        'Through-points after the cursor, in order; the curve passes through each. The current cursor is the implicit first knot, so a single point yields one segment. The cursor ends at the last point.',
      ),
    tension: z
      .number()
      .positive()
      .finite()
      .optional()
      .describe(
        'Tangent-length multiplier controlling curve slackness (TikZ `tension`); omitted = 1 (standard centripetal Catmull-Rom). <1 pulls the curve tauter (straighter), >1 makes it loopier.',
      ),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to the generated curve; positioned along the produced cubic commands by Bezier parameter (same as curve / cubic step labels).',
    ),
  })
  .describe(
    'Smooth action: a curve passing through the cursor and the given points, compiled to cubic Beziers.',
  );
```

理由：

1. **与既有曲线 step 同类**——`curve` / `cubic` / `bend` 都是「算法性、编译期产贝塞尔命令、从 cursor 出发」的一等 step；过点平滑曲线是同一范畴，归一等 step 一致、LLM 直觉。
2. **generator 是外部逃生舱，不该被内置占用**——一等 step 还天然支持 `label` / `marks` / 切线参数化，react Kernel 直达，用户无需手接 `pathGenerators`。
3. **纯曲线数学进 `@retikz/math`，IR 干净可序列化**——`points`（Target 数组）+ `tension`（number）全 JSON，编译期展开为既有 `cubic` PathCommand，无新 Scene primitive，renderer 零改动；算法落 math `curve/`（对齐「B 消费 A」与 alpha.2「math 出算法、core 接线」先例）。

关键设计选择：

- **cursor 作第一个 knot**：曲线从当前 cursor 起、依次穿过 `points`（min=1），末 cursor = `points` 末项，**不另暴露 `to`**（冗余）。
- **cursor-less smooth**：smooth 作首 step（无前置 cursor）→ 走既有缺笔位路径，跳过该 path + `PATH_TOO_SHORT` 警告（与 `line` / `curve` 作首 step 一致，可诊断、不静默产错）。
- **样条算法 = centripetal Catmull-Rom（α=0.5）→ 精确转 cubic**：选 centripetal 而非 uniform / chordal —— uniform 在点距不均时产 cusp / 自交回环，chordal 过冲；centripetal 无此病、是过点光滑曲线的稳健默认。
- **tension** 默认 1（标准 centripetal Catmull-Rom），`<1` 更紧、`>1` 更鼓。
- **端点条件**：开放曲线两端用单侧切线（端点 knot 切线取其唯一相邻段方向）；闭合周期样条留后续。

DSL 表面（字面形态即决策，react kernel `<Step kind="smooth">`）：

```tsx
<Path stroke="steelblue">
  <Step kind="move" to="A" />
  <Step kind="smooth" points={['B', 'C', [4, 1]]} tension={1.2}>
    <EdgeLabel>flow</EdgeLabel>
  </Step>
</Path>
```

vanilla 同一份 zod schema、以 IR-object 形态进 path `children`，与 react kernel 零漂移；完整用法见文档站 `<Path>` / step 与 `@retikz/math` `curve` 页。

> 实现：core `789602b5`（schema + math curve/ stub + spec）→ `ee342f0d`（math centripetal Catmull-Rom 转 cubic）→ `df233efe`（smooth step 编译为 cubic 贝塞尔）→ `829e73b5`（react `<Step kind="smooth">` 透传），行为对齐 `38f35c95`；测试见 `packages/kernel/math/tests/curve/catmull-rom.test.ts` 与 `packages/kernel/core/tests/compile/path-smooth.test.ts`；最终 schema / 行为以代码为准。

## 不在本 ADR 范围

- **`way` / `parseWay` 的 smooth token**（react `<Draw>` + vanilla `draw` 的 sugar 写法）——多点 token 文法属 Sugar 层，另起，配「展开 == kernel `<Step kind="smooth">`」等价性测试。
- **闭合平滑曲线**（smooth + cycle 周期样条）——端点条件不同，推迟。
- **Hobby 算法**——美观更优但要解三对角线性系统；后续可在同 step 加 `method?: 'catmull' | 'hobby'` 升级（IR 向后兼容）。
- **per-point tension / 进出方向约束**（TikZ `in` / `out`）——推迟。
- **数据驱动函数采样绘图**（`\draw plot` 采样）——属 plot / Tier2 lowering，非 core Kernel step。
- **任意折线圆角**——[ADR-01](./01-polyline-rounded-corners.md)。

---

> 🔖 本文件压缩前完整施工蓝图 = `git show fd0a8598:notes/decisions/core/v0/v0.4/alpha.3/02-smooth-curve-through-points.md`（封板全文）。
