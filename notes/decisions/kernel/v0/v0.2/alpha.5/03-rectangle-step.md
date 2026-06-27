# ADR-03：新增 rectangle step（圆角矩形）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §`<Rectangle>` / §IR 改动清单](./roadmap.md)

> **范围**：给 path 加专门的 `rectangle` step，直接表达（圆角）矩形，而非用 `move + 4 line + cycle` 手拼。

## 背景 / 约束

矩形是 TikZ 最常用图元之一（`(a) rectangle (b)`）。用 `move + 4 line + cycle` 拼有三个缺口：① IR 体积大（5 step）；② **圆角矩形拼不干净**（需 4 段 arc + 4 段 line，且 arc 隐式圆心语义不便）；③ AI 出 IR 时扫 5 个 step 才能识别「这是矩形」。

## 决策：加 `RectangleStepSchema` 进 `StepSchema` union

字段定型见 `core/src/ir/path/step.ts`（`RectangleStepSchema`：`from` / `to` 对角两 Target + 可选单值 `roundedCorners`）。

**输出走 path 命令，不发独立 `RectPrim`**：rectangle 是 path 的一个 step、可能与其它 step 同处一条 path，发独立 `RectPrim` 无法与同 path 其它段组合；故 compile 编译成**追加到当前 path 的命令**（直角 = 4 line + close；圆角 = 4 arc + 4 line），与 circlePath / ellipsePath「往 path 里追加弧命令」同构。Node 的矩形仍走 `RectPrim`（那是对象、非 path step）——两者本就分属 [ADR-04](./04-sugar-conventions.md) 区分的两轴。

具体决策：

- **from / to 任意顺序**：compile 归一化为 `(x0,y0)=min`、`(x1,y1)=max` 角，方向无关（from/to 逆序结果相同）。
- **from / to 类型 = `TargetSchema`**：`<Rectangle corner1 corner2>` 形态两角可接任意 Target（透传，直接作 from/to）；`<Rectangle center+宽高 / center+side / corner1+宽高>` 形态需 sugar 算坐标 → 限 literal 笛卡尔（[ADR-04](./04-sugar-conventions.md)）。
- **roundedCorners 单值**：四角同半径；四角独立留后续。compile clamp 到 `min((x1-x0)/2, (y1-y0)/2)`，超出取上限（不报错）。
- **圆角几何**：四角 quarter-arc + 四边 line，outline 进 `geometry/rect.ts`（[ADR-04](./04-sugar-conventions.md) 几何下沉），供未来「圆角矩形 node shape」复用。
- **自包含 step、不改 builder**：`<Rectangle>` 派发 `move(from) → rectangle(...)`，满足 builder「≥2 step + 首段 move」（move 不发命令）。compile 把 rectangle 当自包含 step（同 circlePath：排除出 `hasTo`、不依赖 prev、自发完整 subpath，在 cycle 分支后、`findPrev` 检查前处理）。直角起点左上、**顺时针**（y-down 下视觉顺时针）；画完 `penOverride = subPathStart`（圆角时为 `(x0+r,y0)`），后续 step 从该角续。

> **本版不带 `label`**：矩形是闭合形状，边标注需沿周长参数化（决定走哪条边 / sloped 角 / pen 落点），`geometry/segment.ts` 也无 `rectSegmentSample`。为保 step 最小、不引入未定义语义，rectangle 暂不含 label。

## 不在本 ADR 范围

- 矩形边 `label`（需 `rectSegmentSample`，后续补）；四角独立圆角半径。

---

> **实现指针**：level `red`（动 `core/src/ir/**` 加 step + `compile/**` + `geometry/**`）、additive 零破坏（纯新增 step kind，不动既有）。真源以代码为准——`RectangleStepSchema` / `IRRectangleStep`（`core/src/ir/path/step.ts`，进 `StepSchema` discriminatedUnion）、rectangle 分支（`core/src/compile/path/index.ts`）、`outline(from, to, roundedCorners?)`（`core/src/geometry/rect.ts`）、`<Rectangle>` props + `readPathChildren` 分支（`react/src/kernel/Step.tsx` + `builder.ts`）。测试在 `core/tests/compile/rectangle-step.test.ts`。完整原文（Schema 改动表 / 派发 + pen 状态全规格 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `b99e7294`；压缩前完整施工蓝图 = `git show b99e7294^:notes/decisions/core/v0/v0.2/alpha.5/03-rectangle-step.md`。
