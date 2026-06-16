# ADR-02：过点平滑曲线 —— `<Path>` 的 `smooth` step

- 状态：Accepted（2026-06-16 收尾：`smooth` step + `@retikz/math` `curve/` 已实现 + 文档同步 + 评审/对账通过；cursor-less smooth = 跳过 path + `PATH_TOO_SHORT` 警告，codebase 一致口径）
- 决策日期：2026-06-15
- 关联：[v0.4-alpha.3 roadmap](./roadmap.md) · [v0.4 roadmap 候选 B](../roadmap.md#b--路径补强2026-06-12-拍板) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · [alpha.1 ADR-01 `@retikz/math`](../alpha.1/01-math-package-and-geometry-api.md)（`curve/` 子模块原「后置」，2026-06-15 人工拍板提前到本 milestone 开启）· `ir/path/step.ts`（`StepSchema`）· `path-generators/`（generator 机制）

> **范围**：B2「过点平滑曲线」——穿过点列的光滑曲线（TikZ `plot[smooth]` / Hobby 风格）。B1「任意折线圆角」见 [ADR-01](./01-polyline-rounded-corners.md)。

## 背景

TikZ `plot[smooth]` / Hobby：给一串点，画一条**穿过所有点**的光滑曲线，是画数据折线、流线、自由曲线的高频能力。retikz 现状无此能力。

现有曲线 step 都是「逐段、显式控制点」：`curve`（二次贝塞尔，1 控制点）、`cubic`（三次贝塞尔，2 控制点）、`bend`（按方向 + 角度，编译期算 cubic 控制点）。**没有「给点列、自动求光滑过点曲线」的能力**——用户要平滑过 5 个点，得手算 4 段贝塞尔控制点。

roadmap B 把「做成新 step 还是 registered generator」留到实现期定。generator 机制现状（`path-generators/`、step.ts:399）是**用户 / Tier2 的逃生舱**——schema 描述明写「core ships no built-in curve generators」（step.ts:424），registry 由 `CompileOptions.pathGenerators` 外部注入，core 不内置。

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

// compile/path/index.ts —— smooth 分支
//   knots = [cursor, ...resolve(points)]；无前置 cursor（smooth 作首 step）→ 走既有缺笔位路径：跳过该 path + PATH_TOO_SHORT 警告（与 line/curve 作首 step 一致，可诊断、不静默产错）
//   调 @retikz/math curve.catmullRomToCubic(knots, tension ?? 1) → Array<{control1, control2, to}>
//   emit 为既有 cubic PathCommand；cursor 推进到 points 末项
```

理由：

1. **与既有曲线 step 同类**——`curve` / `cubic` / `bend` 都是「算法性、编译期产贝塞尔命令、从 cursor 出发」的一等 step；过点平滑曲线是同一范畴，归一等 step 一致、LLM 直觉。
2. **generator 是外部逃生舱，不该被内置占用**——core 刻意不内置 generator（step.ts:424）。做成内置 generator 等于反悔该约定、要 core 填它故意留空的 registry。一等 step 还天然支持 `label` / `marks` / 切线参数化，react Kernel 直达，用户无需手接 `pathGenerators`。
3. **纯曲线数学进 `@retikz/math`，IR 干净可序列化**——`points`（Target 数组）+ `tension`（number）全 JSON，编译期展开为既有 `cubic` PathCommand，无新 Scene primitive，renderer 零改动；算法落 math `curve/`（对齐「B 消费 A」与 alpha.2「math 出算法、core 接线」先例）。

## 待决策点 🔻

> 以下均已 2026-06-15 人工签字，列此留审计 trail，封板时并入「决策」。

- **cursor 与 points 关系**：**已拍板 = cursor 作第一个 knot**——曲线从当前 cursor 起、依次穿过 `points`。`points` min=1，末 cursor = `points` 末项，**不另暴露 `to`**（冗余）。smooth 作首 step（无前置 cursor）→ 走既有缺笔位路径：跳过该 path + `PATH_TOO_SHORT` 警告（与 `line`/`curve` 作首 step 一致，codebase 现状口径，可诊断）。
- **tension 字段与默认**：**已拍板 = 暴露 `tension?: number`（positive），默认 1**（标准 centripetal Catmull-Rom）。
- **样条算法**：**已拍板 = centripetal Catmull-Rom（α=0.5）→ 精确转 cubic**。选 centripetal 而非 uniform / chordal：uniform 在点距不均时产 cusp / 自交回环，chordal 过冲；centripetal 无此病、是过点光滑曲线的稳健默认。Hobby 算法留后续（见「不在本 ADR 范围」）。
- **端点条件**：开放曲线两端用单侧切线（端点 knot 的切线取其唯一相邻段方向）。闭合（smooth + cycle 的周期样条）留后续。

## DSL 表面

react（kernel `<Step kind="smooth">`）：

```tsx
<Path stroke="steelblue">
  <Step kind="move" to="A" />
  <Step kind="smooth" points={['B', 'C', [4, 1]]} tension={1.2}>
    <EdgeLabel>flow</EdgeLabel>
  </Step>
</Path>
```

vanilla（IR-object 形态；见下「适配器对等说明」）：

```ts
import { figure } from '@retikz/vanilla';

const fig = figure([
  {
    type: 'path',
    stroke: 'steelblue',
    children: [
      { type: 'step', kind: 'move', to: { kind: 'node', id: 'A' } },
      {
        type: 'step',
        kind: 'smooth',
        points: [
          { kind: 'node', id: 'B' },
          { kind: 'node', id: 'C' },
          { kind: 'cartesian', x: 4, y: 1 },
        ],
        tension: 1.2,
      },
    ],
  },
]);
```

### 适配器对等说明

- **react 一等支持**：新增 `<Step kind="smooth">` kernel prop（object 形态）。
- **vanilla 一等支持（IR-object）**：vanilla 是 IR-native runtime / SSR 入口，直接消费 / 构造 `IRPath`；smooth step 作 IR 对象进 path `children` 即可（上例），与 react kernel 同一份 zod schema、零漂移。
- **`way` 文法 token 暂缺（有理由的延后）**：vanilla `draw(way)` 与 react `<Draw way>` 的 `way` mini-DSL 是「上一项 → 下一项」**点对 infix** 模型（`{curve}` / `{cubic}` / `{bend}`）。smooth 是**多点**段，塞进点对 infix 需要专门的 token 文法设计 + 等价性测试，属 **Sugar 层**，与本 Kernel ADR 解耦，延后到 sugar 后续（见「不在本 ADR 范围」）。在此之前，react 用 `<Step kind="smooth">`、vanilla 用 IR-object，两套 authoring surface 均已就位。

## 测试设计

`packages/core/math/tests/curve/catmull-rom.test.ts`（math 纯算法）+ `packages/core/core/tests/compile/path-smooth.test.ts`（compile）+ step schema 测试覆盖：

- 过点正确性（cursor + N 点 → N 段、过每个 knot）
- tension 缩放控制点
- 退化（2 knot / 点距不均无 cusp）
- schema accept / reject
- 无 cursor 报错
- label / marks / 后续 step 交互

具体 case 拆分见「实现契约 § 测试象限」。

## 影响

- **现有代码**：`StepSchema` discriminatedUnion 加成员（12→13）、末尾 JSDoc 「十二种 kind」计数与列举更新；`compile/path/index.ts` 加 smooth 分支；`@retikz/math` 开 `curve/` 子模块 + `src/index.ts` 导出（首切 A 列为后置，本 ADR 提前）。
- **react**：`StepProps` union 加 `SmoothStepProps`（11→12），JSDoc 计数更新。
- **文档站**：`<Path>` / step 文档加 `smooth` step（API + 双语 + demo：过点平滑 vs 折线对照、tension 对照）；`@retikz/math` `curve/` 能力页（新增 public API）。
- **对外 API**：react `<Step>` 加 `smooth` kind；`@retikz/math` 加 `curve` 命名空间。均 additive，无 breaking。

## 不在本 ADR 范围

- **`way` / `parseWay` 的 smooth token**（react `<Draw>` + vanilla `draw` 的 sugar 写法）——多点 token 文法属 Sugar 层，另起，配「展开 == kernel `<Step kind="smooth">`」等价性测试。
- **闭合平滑曲线**（smooth + cycle 周期样条）——端点条件不同，推迟。
- **Hobby 算法**——美观更优但要解三对角线性系统；后续可在同 step 加 `method?: 'catmull' | 'hobby'` 升级（IR 向后兼容）。
- **per-point tension / 进出方向约束**（TikZ `in` / `out`）——推迟。
- **数据驱动函数采样绘图**（`\draw plot` 采样）——属 plot / Tier2 lowering，非 core Kernel step。
- **任意折线圆角**——[ADR-01](./01-polyline-rounded-corners.md)。

---

## 实现契约（必填）🔻

> 下游 implement / test / document / wrapup 阶段的硬约束。偏离需开新 ADR 或本 ADR 加条重审。

### Level

`red`

- 动 `packages/core/core/src/ir/path/step.ts`（IR schema）+ `packages/core/core/src/compile/path/index.ts`（compile）+ `packages/core/math/src/index.ts`（包公开面）→ red。
- react `<Step>` kernel（yellow）跨级取最高 = **red**。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/path/step.ts` | 加 | `SmoothStepSchema`（`kind: 'smooth'`） | discriminatedUnion 新成员 | — | 过 cursor + points 的平滑曲线，编译成 cubic |
| 同上（成员字段） | 加 | `points` | `z.array(TargetSchema).min(1)` | — (必填) | cursor 之后依次穿过的点；cursor 为隐式首 knot |
| 同上 | 加 | `tension` | `z.number().positive().finite().optional()` | 1（compile 缺省） | 切线长度乘子；<1 更紧、>1 更鼓 |
| 同上 | 加 | `label` | `StepLabelSchema.optional()` | — | 边标注，沿生成 cubic 按贝塞尔参数定位 |
| 同上 | 改 | `StepSchema` union + 末尾 JSDoc | 加 `SmoothStepSchema`；计数 12→13 | — | — |
| `packages/core/math/src/curve/catmull-rom.ts` | 新建 | `catmullRomToCubic(knots, tension)` | 纯函数 `(Array<Position>, number) => Array<{control1,control2,to}>` | — | centripetal CR knots → cubic 段 |
| `packages/core/math/src/curve/index.ts` | 新建 | `curve` 命名空间 re-export | — | — | 开 `curve/` 子模块 |
| `packages/core/math/src/index.ts` | 改 | 导出 `curve` | — | — | math 公开面加 curve |
| `packages/core/react/src/kernel/Step.tsx` | 加 | `SmoothStepProps` | 加入 `StepProps` union（11→12）+ JSDoc 计数 | — | `<Step kind="smooth">` |

字段名 `smooth` / `points` / `tension` / `catmullRomToCubic` / `curve` 写死，下游不得改。

### 文件 scope

- `packages/core/math/src/curve/catmull-rom.ts`（新建）
- `packages/core/math/src/curve/index.ts`（新建）
- `packages/core/math/src/index.ts`（改：导出 `curve`）
- `packages/core/math/tests/curve/catmull-rom.test.ts`（新建）
- `packages/core/core/src/ir/path/step.ts`（改：`SmoothStepSchema` + union + `IRSmoothStep` 类型 + JSDoc 计数）
- `packages/core/core/src/compile/path/index.ts`（改：smooth 编译分支）
- `packages/core/core/tests/compile/path-smooth.test.ts`（新建）
- `packages/core/core/tests/ir/step-schema.test.ts`（改 / 若无则新建：smooth accept/reject）
- `packages/core/react/src/kernel/Step.tsx`（改：`SmoothStepProps` + union + JSDoc）
- `packages/core/react/tests/kernel/builder.test.tsx`（改：`<Step kind="smooth">` 入 IR）
- `apps/docs/src/contents/core/.../path` step mdx（改）+ demo `.tsx`（新建）；`@retikz/math` `curve` 能力 mdx（改 / 新建）

### 测试象限

**Happy path（≥ 3）**：

- `through-three-knots`：cursor + 2 points（3 knot）→ 2 段 cubic，曲线过 cursor / 每个 point（端点严格命中、采样点与 CR 参考一致）。
- `through-many-knots`：cursor + 4 points（5 knot）→ 4 段 cubic，全部过点。
- `tension-scales-controls`：同 knot、`tension=1.5` vs 默认 → 控制点距离按比例变化、过点不变。

**边界（≥ 2）**：

- `two-knot-single-segment`：cursor + 1 point（2 knot）→ 1 段 cubic，过两点（退化不报错）。
- `tension-default-equals-one`：省略 `tension` → 输出与显式 `tension=1` 逐字一致。
- `uneven-spacing-no-cusp`：点距极不均 → centripetal 产出无 cusp / 自交（与 uniform 参考对照断言）。

**错误路径（≥ 2）**：

- `reject-empty-points`：`points: []`（违反 min(1)）→ schema 拒绝。
- `reject-bad-tension`：`tension <= 0` / 非有限 → schema 拒绝；`points` 含非法 Target → schema 拒绝。
- `smooth-without-cursor`：smooth 作 path 首 step（无前置 move/step，cursor 未定义）→ 跳过该 path 且发 `PATH_TOO_SHORT` 警告（与 `line`/`curve` 作首 step 一致的可诊断缺笔位行为）。

**交互（≥ 2）**：

- `smooth-with-label`：smooth + `label` → label 沿生成 cubic 按贝塞尔参数定位（与 curve / cubic label 语义一致）。
- `smooth-then-line-cycle`：smooth 后接 `line` / `cycle` → 末 cursor = points 末项，后续从此继续 / cycle 闭合回最近 move 起点。
- `smooth-with-path-marks`：smooth + path `marks`（pos∈[0,1]）→ mark 沿曲线、方向取切线。

### 依赖的现有元素

- `TargetSchema`（`ir/path/target`）—— **引用**（points 元素类型）。
- `StepLabelSchema`（`ir/path/step.ts`）—— **引用**（label 字段）。
- `StepSchema` discriminatedUnion（`ir/path/step.ts`）—— **修改**（加成员 + JSDoc 计数）。
- path 编译 cursor / target 解析（`refPointOfTarget` 等，`compile/path/index.ts`）—— **扩展**（smooth 分支解析 points + cursor）。
- 既有 `cubic` PathCommand emit 路径（`compile/path/index.ts` / `primitive/path.ts`）—— **引用**（smooth 复用同一 emit）。
- `@retikz/math` `curve/` 子模块（`packages/core/math`）—— **新建**（roadmap A 预留后置，本 ADR 开启）。
- react `StepProps`（`react/src/kernel/Step.tsx`）—— **扩展**（加 `SmoothStepProps`）。
- alpha.2「math 出算法 + core 接线」（`minimalEnclosingCircle` 先例）—— **引用**（分层取向对齐）。
