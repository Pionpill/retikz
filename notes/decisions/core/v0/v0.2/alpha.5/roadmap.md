# v0.2.0-alpha.5 实施待办：Path-level shape sugar

> 写于 2026-05-17 作为独立提案；2026-05-18 并入 alpha.6 节奏（原文件 `v0.2-path-shape-sugar.md`）；2026-05-23 原 alpha.4（IR 顺序回归）与 alpha.5（emit 层增强）合并为一段后，本段从 alpha.6 重编号为 **alpha.5**。v0.2 主线之一：补一组面向"画几何形"的 sugar 组件，让用户和 AI 都能用一行写出 TikZ 习语级的图元，不必下到 IR 层手拼 `<Path><Step>` 长串。
>
> 关联：[`v0.2 总计划`](../roadmap.md) · [`v0.1-rc.2.md`](../../v0.1/rc.2/roadmap.md)（最初讨论起点，已撤回 TODO-5）· [`roadmap.md`](./roadmap.md) v0.2 段

## 背景

当前 sugar 只有 `<Draw>` / `<EdgeLabel>`。画圆 / 椭圆 / 弧 / 矩形 / 网格 / 扇形都得手写 `<Path><Step kind="move" .../><Step kind="circlePath" .../></Path>` 之类的 IR-level 拼装——比 TikZ 一行 `\draw circle [radius=R]` / `\draw (0,0) grid (3,2)` 累得多，且对 AI 友好度低（生成 IR-level 长串易出错）。

本提案补 6 个 sugar：`<Circle>` / `<Ellipse>` / `<Arc>` / `<Sector>` / `<Rectangle>` / `<Grid>`。

## 为什么是 v0.2 不是 rc.2

最初 (2026-05-17 早) 想在 rc.2 内做"纯映射现有 IR"的最小版本——5 个 sugar、不动 kernel。讨论中发现用户期望的能力（半圆 / 1/4 椭圆部分裁剪 / 椭圆弧 / 圆角矩形 / 扇形）**全部需要扩 IR**——硬塞到 rc.2 既违反 rc 期 "additive only" 边界，又会让 sugar 的 prop 表面跟 IR 能力错位。整组推 v0.2 与 Scope / 样式继承 / Shape Registry 一起出窗口。

**v0.2 内做这套 sugar 的额外收益**：

- 与 v0.2 同窗口的 **Shape Registry** 共享"几何形态由谁定义"的思路——sugar 是"用户友好包装层"，Shape Registry 是"对象级 shape 注入面"，两者互补
- alpha.4 已落 **`zIndex`** + **带文本 Node 包 `<g>`**——sugar 派发出的 Path 透传 `zIndex` 即享受这些 emit 层改造
- 同窗口刷新 AST 解析器组件白名单 / `composeSystem` system prompt（rc.2 TODO-4 已铺好的基础）

## IR 改动清单

| 改动 | 涉及 sugar | 字段 / 形态 |
| --- | --- | --- |
| `arc` step 加 `radiusX` / `radiusY`（与 `radius` 三互斥） | Arc / Sector 椭圆形态 | 给 `radius` 时等同 X=Y；给 `radiusX/Y` 时优先；schema 校验互斥 |
| `circlePath` step 加 `startAngle` / `endAngle` / `sweepAngle` / `closed` | Circle 部分裁剪 | 三角键求二；`closed: 'closed' \| 'chord' \| 'open'`，不给角度时强制 `'closed'`、给角度时默认 `'chord'` |
| `ellipsePath` step 加同上字段 | Ellipse 部分裁剪 | 同上 |
| 新增 `rectangle` IR step | Rectangle | 字段 `from` / `to` / `roundedCorners?`；闭合自带，不需要外挂 cycle |
| 不需要新 step | Sector / Grid | Sector 派发待 ADR（见 §`<Sector>`：`move→arc→line→cycle` / `arc` 显式 center / 新增 `sector` step 三选一）；Grid 展开多 Path。候选 RegularPolygon / Star 同属无需新 step，见 §候选追加 |

### `arc` step 字段策略（决策 A）

```ts
// 现状
ArcStepSchema = z.object({
  kind: z.literal('arc'),
  startAngle: z.number(),
  endAngle: z.number(),
  radius: z.number().positive(),
  label: StepLabelSchema.optional(),
})

// v0.2 改后（三互斥）
ArcStepSchema = z.object({
  kind: z.literal('arc'),
  startAngle: z.number(),
  endAngle: z.number(),
  // 以下三选一：radius 单值 = 圆弧；radiusX/Y 双值 = 椭圆弧
  radius: z.number().positive().optional(),
  radiusX: z.number().positive().optional(),
  radiusY: z.number().positive().optional(),
  label: StepLabelSchema.optional(),
}).refine(
  (s) => (s.radius !== undefined) !== (s.radiusX !== undefined && s.radiusY !== undefined),
  { message: 'arc step requires either radius or both radiusX and radiusY' },
)
```

### `circlePath` / `ellipsePath` 部分裁剪字段

```ts
// circlePath v0.2 改后
CirclePathStepSchema = z.object({
  kind: z.literal('circlePath'),
  radius: z.number().positive(),
  // 可选：不给画完整圆；给了画部分（半圆 / 1/4 圆等）
  startAngle: z.number().optional(),
  endAngle: z.number().optional(),
  sweepAngle: z.number().optional(),  // 三键求二（startAngle/endAngle/sweepAngle）
  closed: z.enum(['closed', 'chord', 'open']).optional(),
  // closed 默认值：无角度 → 'closed'（完整圆，原行为）；有角度 → 'chord'
  label: StepLabelSchema.optional(),
})
// ellipsePath 同结构，radius → radiusX/radiusY
```

`closed` 模式说明：

- `'closed'`：完整闭合（不带角度时唯一合法值；原行为）
- `'chord'`：弦闭合（直线连两端点；半圆 / 弓形）
- `'open'`：不闭合（纯弧线）—— 实际用 `<Arc>` 更直接，这里保留是为了让 Circle/Ellipse 也能输出"开放弧"以保持 IR 表达完整

### 新增 `rectangle` step

```ts
RectangleStepSchema = z.object({
  kind: z.literal('rectangle'),
  from: TargetSchema,
  to: TargetSchema,
  roundedCorners: z.number().nonnegative().optional(),  // 单值，四角同半径；缺省 = 直角
  label: StepLabelSchema.optional(),
})
```

为什么新加 step 而非在 sugar 层拼 `move + 4 line + cycle`：

- IR 体积更紧（1 step vs 5 step）
- 编译期可以走专门的 `<rect>` SVG primitive（Scene 已经有 `rect`），不必走 path primitive
- 圆角矩形几何由 compile 一次性算，sugar 不用关心 4 段 arc
- AI 出 IR 时看清"这是个矩形"，不必扫 5 个 step 才能识别意图

## 每个 sugar 的 prop 形态

所有 sugar 都复用 `PathProps` 中除 `children` 外的视觉字段（**以现有 `Path.tsx` 真实命名为准**：`color` / `stroke` / `strokeWidth` / `dashPattern` / `lineCap` / `lineJoin` / `thickness` / `fill` / `fillRule` / `opacity` / `fillOpacity` / `drawOpacity` / `arrow` / `arrowDetail` / `zIndex`）——不另起 `strokeOpacity` / `strokeLinecap` / `strokeLinejoin` 等新名；`dashed` / `dotted` 是 Node 字段，Path 只有 `dashPattern`。下表只列**形状专属 prop**。

### `<Circle>`

| 形态 | prop |
| --- | --- |
| center + radius | `{ center, radius }` |
| center + diameter | `{ center, diameter }`（sugar 算 `radius = diameter/2`） |
| 直径两端 | `{ from, to }`（圆心 = midpoint，半径 = 距离/2） |
| 包围盒两角 | `{ corner1, corner2 }`（圆心 = midpoint，半径 = min(\|dx\|, \|dy\|)/2） |

**可选部分裁剪 prop**（不给画完整圆）：`startAngle` / `endAngle` / `sweepAngle` 三键求二。带角度时默认 chord 闭合（半圆 / 弓形）。想要扇形用 `<Sector>`，想要纯弧线用 `<Arc>`。

派发：`<Path>` + `<Step kind="move" to={center}>` + `<Step kind="circlePath" radius={r} [startAngle] [endAngle]>`。

### `<Ellipse>`

| 形态 | prop |
| --- | --- |
| center + 两半径 | `{ center, radiusX, radiusY }` |
| center + 两直径 | `{ center, diameterX, diameterY }` |
| 包围盒两角 | `{ corner1, corner2 }`（内切椭圆） |

**可选部分裁剪**：同 Circle。派发同 Circle，step 换 `ellipsePath`。

prop 字段名沿用 IR step 字段名（`radiusX` / `radiusY`，不是 `xRadius` / `yRadius`）——避免"两套命名"。

### `<Arc>`

| 形态 | prop |
| --- | --- |
| center + 圆弧（radius） | `{ center, radius, startAngle, endAngle }` 或 `{ center, radius, startAngle, sweepAngle }` 或 `{ center, radius, endAngle, sweepAngle }` |
| center + 椭圆弧（双半径） | `{ center, radiusX, radiusY, ...角度键 }` |

**Arc 必给角度**——与 Circle/Ellipse 带角度的区别 = **不闭合**（纯弧线）。

派发：`<Path>` + `<Step kind="move" to={center}>` + `<Step kind="arc" ...>`。

### `<Sector>`（扇形）

| 形态 | prop |
| --- | --- |
| center + 圆 + 角度 | `{ center, radius, startAngle, endAngle }` 三键求二 |
| center + 椭圆 + 角度 | `{ center, radiusX, radiusY, ...角度键 }` |

**wedge 闭合**（经圆心）——这是 Sector 的唯一形态；想要 chord 闭合用 `<Circle>` 带角度即可。

> ⚠️ **派发待 ADR 定（几何断点）**：retikz 的 `arc` step 语义是「**紧邻前一 step 的 anchor 即圆心**」（`ir/path/step.ts` `ArcStepSchema` 的 describe + `compile/path` `arc` 分支 `center = prev.anchor`，arc 内部把 pen 跳到弧起点、收在弧终点）。因此原拟的 `move(center) → line(arcStart) → arc → cycle` **错**：`line(arcStart)` 让 arc 圆心变成 arcStart 而非 center，扇形整体错位。三选一（ADR 拍板，各自须验证 `cycle` 闭合点）：
>
> 1. `move(center) → arc → line(center) → cycle`：靠 arc 自身「起点跳 + center 紧邻 arc」让圆心正确，wedge 两边由 arc 起点跳 + 末段 line 回 center + cycle 收口——**强依赖 arc 的 startSegment / cycle 内部行为，须测试验证**；
> 2. 给 `arc` step 加显式 `center` / `from` 字段，圆心不再隐式取 prev.anchor；
> 3. 新增专门 `sector` / `wedge` IR step，几何全在 compile 端算。
>
> 解法 2 / 3 同时让 Sector `center` 可接任意 Target（见下「可计算形态 vs 透传形态」）。

### `<Rectangle>`

| 形态 | prop |
| --- | --- |
| 两角 | `{ corner1, corner2 }` |
| 中心 + 宽高 | `{ center, width, height }` |
| 中心 + 边长（正方形） | `{ center, side }` |
| 一角 + 宽高 | `{ corner1, width, height }` |

**可选**：`roundedCorners?: number`（单值，四角同半径；缺省直角）——沿用 Node / IR `rectangle` step 同名字段，不另起 `borderRadius`。

派发：`<Path>` + `<Step kind="rectangle" from={...} to={...} [roundedCorners]>`。

### `<Grid>`

| 形态 | prop |
| --- | --- |
| 两角 | `{ corner1, corner2 }` |
| 中心 + 尺寸 | `{ center, width, height }` |

**步长 prop**（三个都支持，简化形态优先）：

- `step: number` —— 单值，xStep = yStep = step
- `xStep: number` + `yStep: number` —— 分轴
- 三个共存时：`xStep` / `yStep` 覆盖 `step`（缺谁补谁）

派发：横线 `floor(|y2-y1| / yStep) + 1` 条 + 竖线 `floor(|x2-x1| / xStep) + 1` 条；每条一个 `<Path>` + `<Step kind="move">` + `<Step kind="line">`，**多个 Path 不闭合**。视觉 prop 透传到每条 Path。

**phasing**：按 `corner1`（或 `center - size/2`）起算，不跟 TikZ 经原点——更直观，与"用户给的两角"对齐。

**边界规则**：`from` / `to` 不必整除 `step`——严格按 step 步进，最后一条若与对角不重合就不画（不补尾、不裁剪）。

### 候选追加：`<RegularPolygon>` / `<Star>`（无需 IR 改动）

对照 TikZ `shapes.geometric` 最常被要的两个形状缺口（正多边形 / 星形）。**纯几何 path sugar——不动 IR**（与 Sector / Grid 同档：sugar 层拼 `move + N line + cycle`），故可随 alpha.5 一并出，或作紧随的小追加。点位约束同 §可计算形态：`center` 须 literal 笛卡尔（要算顶点）；命名全称（`sides` 不缩 `n`、`outerRadius` 不缩 `or`）。

#### `<RegularPolygon>`

| 形态 | prop |
| --- | --- |
| 中心 + 外接圆半径 + 边数 | `{ center, radius, sides }` |
| 中心 + 边长 + 边数 | `{ center, sideLength, sides }`（sugar 由边长反算外接半径） |

可选 `rotate?: number`（整体起始角，缺省一顶点朝某约定方向，ADR 定）。`sides >= 3` 否则报错。

派发：`<Path>` + `move(顶点0)` + `sides` 条 `line` + `cycle`；顶点 = `center + polar(radius, rotate + k·360/sides)`。

#### `<Star>`

| 形态 | prop |
| --- | --- |
| 中心 + 外/内半径 + 角数 | `{ center, outerRadius, innerRadius, points }` |
| 中心 + 外半径 + 角数（内半径按比例） | `{ center, outerRadius, points, innerRatio? }`（缺省比例 ADR 定，如 0.5） |

`points >= 2` 否则报错。可选 `rotate?: number` 同上。派发：`2·points` 个顶点交替外 / 内半径 `line` + `cycle`。

## 跨 sugar 设计约定

- **多形态用 union 类型 + 在 sugar 内 narrow**——TS 类型层让用户选一种形态，运行时按 prop 在场分支换算
- **prop 名一律全称**（AGENTS.md § 代码风格）——`radius` 不写 `r`、`radiusX` 不写 `rx`、`width` 不写 `w`、`corner1` / `corner2` 不写 `p1` / `p2`、`startAngle` 不写 `start`、`sweepAngle` 不写 `sweep`
- **`Rectangle` 用全称**（不缩 `Rect`）——与 `Coordinate` 不缩 `Coord` 同口径
- **形态之间互斥**——同一个 sugar 不允许混（如 `<Rectangle corner1 width height corner2>`），TS union + 运行时校验都拒，错误信息给具体"应选 N 种形态之一"
- **点位字段类型（按现有 `ir/path/target.ts` `TargetSchema` 为准）**：底层 path target 实际接受 `[x, y]` 笛卡尔 / 极坐标 / 节点 id 字符串 / `{ relative }` / `{ relativeAccumulate }` / `{ of, offset }`——**不含** `{ direction, of }`（那是 Node / Coordinate 的 `position`，不是 path target，不能原样塞 `<Step>`）
- **可计算形态 vs 透传形态**（关键约束）：sugar 内**没有编译期坐标**（`resolvePosition` 是 compile 期工作），凡需在 React 期做 midpoint / 加减宽高 / 三角的形态，其点位**只接 literal 笛卡尔 `[x, y]`**，传 node id / 极坐标 / 相对坐标一律明确报错（不静默兜底）：
  - **透传形态**（点位可为任意 Target，原样塞进 `<Step>`）：Circle / Ellipse / Arc / Sector 的 `center`、Rectangle `{ corner1, corner2 }`（直接作 `rectangle` step 的 `from` / `to`）
  - **可计算形态**（点位只接 literal `[x, y]`）：Circle `{ from, to }`（midpoint + 距离）、Circle / Ellipse `{ corner1, corner2 }`（内切 bbox）、Rectangle `{ center, width, height }` / `{ center, side }` / `{ corner1, width, height }`、Grid 全部形态（展开多线端点）
  - **备选（ADR 可选）**：把这些几何**下沉到 core**（新 IR step / arc 显式 center），让所有形态都能接任意 Target——更贴「sugar 不引入新能力、不在 sugar 解析坐标」原则，但工作量大；alpha.5 倾向先「可计算形态限 literal 笛卡尔」，下沉留后续
- **Circle 与 Node `shape="circle"` 命名歧义**：sugar Circle 是无文本纯路径，Node 是带文本 / 锚点的对象；文档明示差异，命名不让步（短名优于长名）

## 扩展性：用户自定义 sugar

**结论：Path 级 sugar 天生可被用户扩展，且零注册——React 组件模型本身就是扩展点。** 内置 6 个 sugar 与用户自写的形状组件是**同一机制**，不享有特权。

**机制**（`packages/react/src/kernel/builder.ts` `readSceneChildren`）：builder 扫 `<TikZ>` / `<Scope>` 子级时，先按 displayName 命中 Kernel marker（Node / Path / Coordinate / Scope）；未命中的**普通函数组件**（plain function，判据 `typeof type === 'function'`）走兜底分支——同步调用 `child.type(child.props)` 拿渲染出的 JSX，再 `readSceneChildren` 递归展开。所以任何「props → 返回 `<Path>` / `<Node>` / `<Scope>` 子树」的普通 FC 都被透明识别，**无需进白名单、无需 displayName、无需 core 改动**。

> ⚠️ **`memo` / `forwardRef` 包装的组件当前不支持**：它们的 `type` 是对象（带 `$$typeof`）而非 function，`builder.ts` 第 337 行的 `typeof child.type === 'function'` 判据会**静默跳过**——自定义 sugar 暂不能用 `memo` / `forwardRef` 包。要支持需 builder 解包 `$$typeof`（增强项，见 §待定）。

```tsx
// 用户工程内直接写，无需任何注册
const Hexagon: FC<{ center: [number, number]; radius: number }> = ({ center, radius }) => (
  <Path fill="#eee">
    <Step kind="move" to={/* ... */} />
    {/* 6 条 line */}
    <Step kind="cycle" />
  </Path>
);
// <TikZ><Hexagon center={[0, 0]} radius={2} /></TikZ> 直接出图
```

**与 Shape Registry 的分工**（两条独立扩展轴，别混）：

| | Path 级 sugar | Node 级 Shape Registry（alpha.3 已落） |
| --- | --- | --- |
| 扩展方式 | 写返回 kernel JSX 的 React FC | `CompileOptions.shapes` 注入 `ShapeDefinition` |
| 注册 | **零注册** | 显式注入 core |
| 适用 | 装饰性纯路径（hexagon / star / spiral / bracket…） | 可连接节点（有 id / anchor / 边贴边界 / 含文本） |
| 为何如此 | 产出普通 `<Path>`，kernel 本就会编译，无 core 钩子可注册 | shape 几何要在编译期算 boundary / anchor / layout / emit |

**用户 sugar 必须守的约束**（均非人为限制——前 3 条源自 builder 行为，第 4 条源自 IR 边界）：

1. **纯同步函数**：builder 在 React 渲染之外直接 `child.type(child.props)` 调用——**不能用 hooks / context / state**，只能 props → JSX
2. **拿不到编译期坐标**：与上文 §跨 sugar 设计约定「可计算形态」同源——要算 midpoint / bbox / 宽高的形态，点位只能给 literal `[x, y]`
3. **仅 scene 级展开，不支持 step 级**：`readPathChildren`（`builder.ts`）在 `<Path>` 内**只认 displayName === Step** 的子节点，函数组件不展开——即可写「返回 `<Path>` 的形状 sugar」，**不可**写「在 `<Path>` 里展开成多 `<Step>` 的 step-sugar」
4. **受现有 IR step 集封顶**：sugar 只能产出现有 step 能表达的几何（用户碰不到 `@retikz/core` 的 schema，无法扩 IR）。超出现有 step 的几何（如精确部分圆 / 椭圆弧 / 圆角折线）只能用 `line` / `cubic` **近似**逼出（仍纯 sugar，但失真），或向上游提需求加 IR step——这是内置 sugar（库可扩 IR，故能给精确部分圆 / 椭圆弧 / 圆角矩形）与用户 sugar 的关键不对称

**已知缺口：AI / AST 沙箱不接受用户 sugar**。文档站 `retikz-tsx` 块走 AST 白名单（`apps/docs/src/lib/jsx-to-ir/parser.ts` `COMPONENT_REGISTRY`，不执行任意代码、只对白名单组件 `createElement`），用户自定义 sugar 进不去——这是安全边界，sugar / Shape Registry 都绕不开；仅影响「让 AI copilot 认识你的组件」，不影响库的真实使用。

**降低门槛的投入**（落实下文 §待定「共享 prop type 抽出」）：

- 公开 `PathVisualProps` 类型——用户 sugar 一行 `...rest` 透传全部视觉字段；内置 6 sugar 与用户 sugar 共用同一类型
- 公开一小撮几何 helper（polar↔cartesian / midpoint / bbox）——内置 sugar 与用户 sugar 复用，避免人人重写三角换算
- 文档加「写你自己的形状」一节：讲清上述 4 条约束 + 区分「装饰路径 → 写组件 / 可连接节点 → Shape Registry」

## 与 Node shape 的关系

Path 级 sugar 与 Node shape（`shape="..."` + `ShapeDefinition`）共享「形状轮廓」这一几何内核，但**职责与参数化不同**——不是干净的子集关系。

| | sugar shape（`<Circle>` …） | Node shape（`shape="circle"` + `ShapeDefinition`） |
| --- | --- | --- |
| 本质 | 一段**绘制**（path 图元） | 一个**可连接对象** |
| 尺寸来源 | 用户**显式给参数**（radius / sides / angle） | 从**文本 + padding 反推** layout |
| 数学量 | 只要 outline | outline + **anchor + boundaryPoint + layout** |
| 输出 primitive | PathPrim（`<path>`） | EllipsePrim / RectPrim … + GroupPrim（含 text） |
| 有无 | 无 text / anchor / boundary / id | 全有，边贴边界、可被 path 引用 |

> 现状佐证：circle **Node** emit `EllipsePrim`（`<ellipse>`；`geometry/circle.ts` 仅有 `anchor` / `boundaryPoint` / `contains`、无 outline 生成）；sugar `<Circle>` 走 IR `circlePath` → `PathPrim`。同一个圆两边连输出 primitive 都不同，目前零共享。

**两个关键不对称**（所以不是子集）：① sugar 给「显式 radius」这种 Node shape 给不了的控制（Node 圆尺寸由文本定）；② Node shape 有 sugar 没有的 anchor / boundary / text 数学。真正重叠的只有「形状轮廓」。

### 命名约定（收口「Circle 命名歧义」待定）

**不另造词，用「语法位」区分**：

- 形状作**独立组件** = 画图元 sugar：`<Circle>` / `<Rectangle>` / `<RegularPolygon>` …
- 形状作 **`shape=` 字符串值** = 节点形状：`<Node shape="circle">`

同词是**有意的**（词汇表一致），只靠语法位 + 文档分角色；造前缀 / 命名空间会丢短名与 TikZ 习惯，不取。配一页对照文档「形状：sugar vs node shape」讲清上表。

### 复用方向：共享 core 几何层，而非「Node 复用 sugar」

`@retikz/core` **不能 import `@retikz/react`**（依赖单向），sugar 在 react 包里、core 拿不到它——所以「Node 复用 sugar」在依赖方向上不成立。正确形态：**两边并列消费 `packages/core/src/geometry/`**。复用点：

1. **alpha.5 新增几何 = 未来 node shape 的地基**：椭圆弧 / 部分圆椭圆 / 圆角矩形的几何**写进 `core/geometry/`**（见 §实现拆分），sugar 的 compile 路径与未来 `ShapeDefinition.emit`（如圆角矩形节点）共用同一份
2. **RegularPolygon / Star 顶点数学最该共享**：新增 `geometry/polygon.ts`（`center + polar(r, angle)` 顶点生成），sugar 与未来 `regular polygon` node shape（emit + 射线∩多边形 boundaryPoint + 顶点/边中点 anchor）共用同一份
3. **复用不了的**：sugar 的「显式参数」 vs node 的「文本反推 layout」参数化不同；无合理边界的形状（扇形 wedge / grid / 开放 arc）没有 node 对应物，不升级

## 实现拆分

1. **IR 改动**（packages/core）：
   - **几何下沉 `core/geometry/`（复用前提，见 §与 Node shape 的关系）**：新增 outline / 顶点几何一律写成 `geometry/*.ts` 纯函数，**不内联在 `compile/path/` 里**，以便未来 node shape 的 `emit` / `boundaryPoint` / `anchor` 复用
   - `arc` schema：加 `radiusX` / `radiusY` + refine 互斥；椭圆弧几何进 `geometry/arc.ts`
   - `circlePath` / `ellipsePath` schema：加 `startAngle` / `endAngle` / `sweepAngle` / `closed`；部分 outline 几何进 `geometry/{circle,ellipse}.ts`，compile/path 按 closed 模式拼 path d
   - 新加 `rectangle` step schema；圆角矩形 outline 进 `geometry/rect.ts`；可走 SVG `<rect>` primitive 或合并到 path primitive（compile 期决策）
   - （若纳入 RegularPolygon / Star）新增 `geometry/polygon.ts` 顶点生成，sugar 与未来 polygon node shape 共用
2. **6 个 sugar 文件**：`packages/react/src/sugar/{Circle,Ellipse,Arc,Sector,Rectangle,Grid}.tsx`；`sugar/index.ts` 加 6 个 export；`packages/react/src/index.ts` 公开
3. **每个 sugar = React FC**：内部根据 prop 形态算出最终 `<Path> > <Step>` 子树并 return；不动 `kernel/builder.ts`（builder 已会扫 `<Path>` 子树，递归命中 sugar 渲染出的 `<Path>`）
4. **多形态运行时校验**：每个 sugar 入口 if-else 分形态，缺失字段抛明确 Error（如 `'Circle 需要 radius / diameter / { from, to } / { corner1, corner2 } 之一'`），不静默兜底
5. **AST 解析器扩白名单**：`apps/docs/src/lib/jsx-to-ir/parser.ts` 当前 9 个组件（alpha.1 已加 `<Scope>`）→ 加 6 个（共 15）
6. **测试**：
   - 每个 sugar × 每种 prop 形态一个等价性测试（sugar 派发结果 vs 手写 IR diff = 0）
   - 部分裁剪 × 各 closed 模式视觉测试（半圆 / 1/4 椭圆 / 扇形）
   - 多形态互斥错误信息测试
   - AST 解析覆盖每个 sugar 一种典型形态
   - compile 端 IR 改动的 adversarial 测试（椭圆弧 / 圆角矩形 / closed 模式边界）
7. **`composeSystem` system prompt 同步**：组件白名单更新到 15 个 + 每个新 sugar 配最小示例，提示 AI 优先用 sugar 而非 IR-level 拼装

## 文档

- 每个 sugar 一个 component page：`core/components/{circle,ellipse,arc,sector,rectangle,grid}/index.{zh,en}.mdx`，按既有组件页结构 Usage / Examples / API Reference / Related
- API Reference 段**每种 prop 形态各一个最小示例 + 等价 `<Path>` 展开**（让用户看清"这只是 sugar"）
- 6 个 example page：`core/examples/{draw-a-circle,draw-an-ellipse,draw-an-arc,draw-a-sector,draw-a-rectangle,grid-background}/`（各 zh/en）
- `core/components/draw/index.{zh,en}.mdx` Related 段加 6 个 sugar 引用
- 部分裁剪能力（半圆 / 1/4 椭圆）单独写一个 examples 页 `core/examples/half-circle/`

## 验收

- 6 个 sugar × 各自所有 prop 形态：渲染结果与手写 IR 完全等价（diff = 0）
- 部分裁剪 closed 三模式视觉正确：完整 / chord / open（open 等价 Arc）
- Circle 带角度 = chord（半圆）；Sector = wedge（扇形）；Arc = open（纯弧线）三者明确分工，无重叠
- `<Grid>` 展开数严格 = `floor(|y2-y1| / yStep) + 1` 横 + `floor(|x2-x1| / xStep) + 1` 竖
- Rectangle 圆角矩形视觉与 SVG `rect rx="N"` / 等价手拼路径对照通过
- Arc 椭圆弧（`radiusX !== radiusY`）视觉与等价 SVG arc 命令对照通过
- AST 解析器：每个 sugar 至少一种形态能解析；含表达式 / hooks / 非白名单组件时报具体错
- AI `retikz-tsx` 块用任一新 sugar 能端到端渲染
- 现有所有 demo 视觉与 snapshot：除 IR schema 字段扩张影响的（arc / circlePath / ellipsePath schema 测试需更新），用户层用法零变化

## 待定（ADR 阶段敲定）

- **【几何断点·必先定】`<Sector>` 派发**：现有 `arc` 圆心 = prev.anchor，naive `move → line(arcStart) → arc → cycle` 会把圆心移到 arcStart；ADR 须在「dispatch 验证 cycle 闭合 / `arc` 加显式 center / 新增 `sector` step」三者中定一种（详见 §`<Sector>`）
- **【契约断点·必先定】可计算形态的点位类型**：Circle `{ from, to }` / bbox、Rectangle `{ center, w, h }`、Grid 等在 sugar 期要算坐标，是「限 literal 笛卡尔 + 非法点位报错」还是「下沉 core」；并修正点位类型不含 `{ direction, of }`（详见 §跨 sugar 设计约定）
- **`<Circle>` 命名歧义**：与 `<Node shape="circle">` 共名。倾向保留 `<Circle>`（短名优先），文档明示与 Node 的差异
- **`<Arc>` 第三种形态**：是否加 `{ center, fromPoint, toPoint }`（两端点 + 圆心算半径与角度）；容差怎么处理（fromPoint/toPoint 到 center 距离不严格相等时报错 vs 取平均）
- **`<Rectangle>` `roundedCorners` 单值 vs 四角独立**：先做单值；四角独立（`roundedCornersTopLeft` 等）若有强需求再加
- **`<RegularPolygon>` / `<Star>`**（✅ 已纳入 alpha.5，收尾追加）：纯 sugar 无 IR 改动；顶点在 sugar 层算（`_shared` `regularPolygonVertices` / `starVertices`，未下沉 core——暂无 polygon node shape 消费方）；起始角默认 −90°（一顶点朝上）、Star 默认 `innerRatio` 0.5。最终 **8 sugar / 17 白名单 / 文档 +2 页**
- **`closed: 'open'` 模式是否暴露**：Circle/Ellipse 带角度时让 `'open'` 模式可用，等同于 `<Arc>`——冗余但用户心智一致
- **`<Sector>` 是否额外支持 chord 闭合**：当前定 wedge-only；让 `<Circle>` 带角度处理 chord
- **`rectangle` step 是直接走 `rect` primitive 还是 `path` primitive**：圆角时只能走 path；非圆角时可优化到 rect。是否值得分支
- **多形态 union 在 TS 端的可写性**：5 种形态的 Rectangle 在 IDE 自动补全 / 错误信息体验
- **共享 prop type 抽出 + 几何 helper 公开**（见 §扩展性）：是否抽 `PathVisualProps` 公开类型（6 内置 sugar 与用户 sugar 共用、`...rest` 透传视觉字段）+ 公开 polar↔cartesian / midpoint / bbox 等 helper，降低用户写自定义 sugar 的门槛
- **自定义 sugar 是否支持 `memo` / `forwardRef` 包装**（见 §扩展性）：当前 builder 仅展开 `typeof type === 'function'`，memo / forwardRef（type 为对象）被静默跳过；支持需 builder 解包 `$$typeof`——做 / 不做 / 仅文档标注限制三选一
- **AGENTS.md 关于 `corner1` / `corner2` 命名**：是否更倾向 `from` / `to`（与 Path step 一致）或 `topLeft` / `bottomRight`（SVG / CSS 习惯）

## 设计 ADR

v0.2 开工前另起 ADR（位置 `notes/decisions/core/v0/v0.2/alpha.5/`，编号到时定），固化上节全部「待定」项的最终取舍（命名歧义 / `closed` 模式暴露 / Sector 闭合 / rect-vs-path primitive / corner 命名等），并落以下交付物：

- 6 个 sugar 的最终 prop 形态清单 + 等价派发 IR
- IR 改动字段清单（arc 椭圆弧 / circlePath-ellipsePath 部分裁剪 / 新增 rectangle step）
- `<Grid>` 边界规则（严格按 step 步进、不补尾）
- `closed` 模式枚举值 + 各 sugar 默认值
- 多形态互斥的错误信息标准
- AST 白名单 15 个组件清单 + `composeSystem` system prompt "Diagram output protocol" 更新内容
- 测试覆盖矩阵（6 sugar × N 形态 × 等价性 / 错误信息 / AST / snapshot + IR adversarial）
