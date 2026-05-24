# ADR-03：新增 rectangle step（圆角矩形）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §`<Rectangle>` / §IR 改动清单](../../../plans/v0/v0.2-alpha.5.md)

## 背景

矩形是 TikZ 最常用图元之一（`(a) rectangle (b)`）。直角矩形可用 `move + 4 line + cycle` 拼，但：① IR 体积大（5 step）；② **圆角矩形拼不干净**（需 4 段 arc + 4 段 line，且 arc 隐式圆心语义不便）；③ AI 出 IR 时扫 5 个 step 才能识别「这是矩形」。故新增专门 `rectangle` step。

## 决策

加 `RectangleStepSchema`，进 `StepSchema` discriminatedUnion（现 10 种 → **11 种**）。

```ts
RectangleStepSchema = z.object({
  type: z.literal('step'),
  kind: z.literal('rectangle'),
  from: TargetSchema,                              // 一角
  to: TargetSchema,                                // 对角
  roundedCorners: z.number().nonnegative().optional(), // 单值，四角同半径；缺省 = 直角
})
```

> **本版不带 `label`**：矩形是闭合形状，边标注需沿周长参数化（决定走哪条边 / sloped 角 / pen 落点），`geometry/segment.ts` 也无 `rectSegmentSample`。为保 step 最小、不引入未定义语义，alpha.5 的 rectangle **不含 label**；需要时后续补 `rectSegmentSample` 再加。

**输出走 path 命令，不发独立 `RectPrim`**（收口 plan §待定「rect vs path primitive」）：rectangle 是 path 的一个 step，可能与其它 step 同处一条 path，发独立 `RectPrim` 无法与同 path 其它段组合；故 compile 把它编译成**追加到当前 path 的命令**（直角 = 4 line + close；圆角 = 4 arc + 4 line），与 circlePath / ellipsePath「往 path 里追加弧命令」同构。Node 的矩形仍走 `RectPrim`（那是对象，非 path step）——两者本就分属 [ADR-04](./04-sugar-conventions.md) 区分的两轴。

## 待决点（已定）

- **from / to 任意顺序**：compile 归一化为 min/max 角，方向无关。
- **from / to 类型**：`TargetSchema`——故 `<Rectangle corner1 corner2>` 形态的两角可接**任意 Target**（透传，直接作 from/to）；`<Rectangle center+宽高 / center+side / corner1+宽高>` 形态需 sugar 算坐标 → 限 literal 笛卡尔（[ADR-04](./04-sugar-conventions.md)）。
- **roundedCorners 单值**：四角同半径；四角独立留后续（plan §待定）。compile clamp 到 `min(width, height) / 2`，超出取上限（不报错）。
- **圆角几何**：四角 quarter-arc + 四边 line，outline 几何进 `geometry/rect.ts`（[ADR-04](./04-sugar-conventions.md) 几何下沉），供未来「圆角矩形 node shape」复用。
- **派发 + pen 状态（自包含 step，不改 builder）**：`<Rectangle>` 派发 `move(from) → rectangle(from, to, roundedCorners?)`——满足 builder「≥2 step + 首段 move」，**无需动 builder**（move 步本身不发命令）。compile 把 rectangle 当**自包含 step**（同 circlePath：排除出 `hasTo`、不依赖 prev、自发完整 subpath，在 cycle 分支后、`findPrev` 检查前处理）：
  - 归一化对角 → `(x0,y0)=min`、`(x1,y1)=max`（**from/to 逆序结果相同**）
  - 直角：`M (x0,y0) → L (x1,y0) → L (x1,y1) → L (x0,y1) → close`（起点左上、**顺时针**，y-down 下视觉顺时针）
  - 圆角：起点 `(x0+r, y0)`，四边 line + 四角 quarter-arc + close；`r = min(roundedCorners, (x1-x0)/2, (y1-y0)/2)`（clamp，不报错）
  - 画完：`subPathStart=(x0,y0)`（圆角时为 `(x0+r,y0)`）、`penOverride = subPathStart`（**后续 step 从该角续**）；bbox = 四角

## 影响

- `packages/core/src/ir/path/step.ts`：加 `RectangleStepSchema` + 进 `StepSchema` union + `IRRectangleStep` 类型；顶部「十种 kind」注释 → 十一种。
- `packages/core/src/geometry/rect.ts`：加 `outline(from, to, roundedCorners?)` 出 path 命令规格（直角四点 / 圆角 arc+line）。
- `packages/core/src/compile/path/index.ts`：加 rectangle 分支，追加 path 命令。
- `packages/react/src/kernel/Step.tsx` + `builder.ts`：加 rectangle 变体 props + `readPathChildren` 分支（无需改首段降级——sugar 派发 `move(from)` 在前）。
- **零破坏**：纯新增 step kind，不动既有。

## 实现契约

### Level

`red`（`ir/**` 加 step + `compile/**` + `geometry/**`）。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | describe 摘要 |
|---|---|---|---|---|
| `ir/path/step.ts` | 加 | `RectangleStepSchema`（进 union） | discriminated `kind:'rectangle'` | 矩形 step，from/to 对角，可选圆角；编译为 path 命令 |
| `ir/path/step.ts` | 加 | `from` / `to` | `TargetSchema` | 矩形对角两点 |
| `ir/path/step.ts` | 加 | `roundedCorners` | `z.number().nonnegative().optional()` | 四角同圆角半径，缺省直角，compile clamp 到边长一半 |

### 测试象限（`packages/core/tests/compile/rectangle-step.test.ts`，≥ 8）

- happy：直角矩形 commands = `[move, line, line, line, close]`，起点 (x0,y0) 顺时针；圆角矩形含 4 arc，起点 (x0+r,y0)；from/to 逆序结果同
- 边界：roundedCorners 超过边长一半 → clamp；roundedCorners=0 = 直角
- pen 语义：rectangle 后接一条 line，起点 = (x0,y0)（penOverride）
- 错误：缺 from / to 被 schema 拒
- 交互：`<Rectangle>` 各形态派发 = 手写 `move(from) + rectangle` IR 等价；rectangle 嵌在多 step path 中（line → rectangle → line）输出连贯

### 依赖

- `compile/path/index.ts` step loop / `refPointOfTarget` —— 加分支。
- `builder.ts` `readPathChildren` —— 加 rectangle 分支（透传 from/to/roundedCorners，parseTargetSugar 解析 from/to）。
- `geometry/rect.ts` —— 加 outline，复用点同 [ADR-04](./04-sugar-conventions.md)。
