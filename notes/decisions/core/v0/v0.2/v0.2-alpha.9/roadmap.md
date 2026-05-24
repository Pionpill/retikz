# v0.2.0-alpha.9 实施待办：Scene / Position 能力完善

> 写于 2026-05-23。v0.2「能力补全阶段」末段（gap §5 定位 + §6 Scene）。三块能力，均低中成本：**clip 裁切**（renderer-agnostic 裁剪资源）、**自定义 viewBox override**（覆盖自动包围盒的逃生口）、**比例 partway 定位**（两点间 t 比例点）。本段后 v0.2 转入收尾 / beta / rc。
>
> 关联：[`v0.2 总计划 §alpha.9 设计预想`](../roadmap.md) · [`tikz-gap-analysis §5 定位 / §6 Scene`](../../../../../analysis/2026-05-07-tikz-gap-analysis.md) · 前一段 [`v0.2-alpha.8.md`](../v0.2-alpha.8/roadmap.md)
>
> **依赖**：clip 的资源管理复用 alpha.7 Paint 的 renderer-agnostic 资源表 + 稳定 id；partway 复用 alpha.6 Target 解析 + `geometry/_edge.ts` lerpPoint；viewBox 复用现有 layout 计算。无新硬前置。
>
> **贯穿约束（评审 P1）**：① ScenePrimitive 渲染无关——clip 由 core 产 `ClipResource` + `clipRef`，`<clipPath>` 物化只在 adapter；② 端点类型避免 schema 递归——partway 端点用自包含 `AbsoluteTarget`，排除 path-relative。

## 背景

### 比例 partway 定位

`OffsetPosition`（`packages/core/src/ir/position/offset-position.ts:5`）现状 = `{ of, offset:[dx,dy] }` 纯向量加法（对齐 TikZ `($(A)+(1,2)$)`）。`TargetSchema`（`ir/path/target.ts:64-72`）= union(`Position`/`Polar`/`NodeTarget`/`Relative`/`RelativeAccumulate`/`Offset`)。

TikZ calc 还有：**比例 partway** `($(A)!t!(B)$)`（A、B 间 t 处 = lerp）、**投影** `($(A)!(P)!(B)$)`（垂足）、**完整 affine**。retikz 只对齐了加法。

痛点：缺"边中点 / A→B 三分之一处"这类高频定位。lerp 现成（alpha.6 `geometry/_edge.ts` 的 `lerpPoint`）。

**评审 P1#1 的坑**：若把 partway 端点定成 `TargetSchema`，而 `TargetSchema` 已含 `PositionSchema` + relative 形态——`PositionSchema` 再引 `TargetSchema` 会 **schema 循环 / 被迫 `z.lazy`**；且 `{ relative }` / `{ relativeAccumulate }` 需要"上一段终点"游标，在 Node.position / partway 端点里无意义。**解法**：用更窄、自包含的 `AbsoluteTarget`。

**评审 P1#3 的坑**：`AbsoluteTarget` 也**不能直接塞 legacy `OffsetPositionSchema`**——它的 `of` 仍含 `z.string().min(1)`（`offset-position.ts:8`），会把 core 字符串节点引用绕回 partway 端点，与 alpha.6「IR 对象主契约」打架。**解法**：新增 `AbsoluteOffsetPositionSchema`，`of` 仅对象 / 字面量（无字符串）。

### clip 裁切

无任何裁剪机制。TikZ `\clip` 设区域，之后绘制只在区域内可见。SVG 靠 `<clipPath>` + `clip-path="url(#id)"`。

**关键约束**：`ScenePrimitive` 渲染无关（`primitive/scene.ts:8`，明列 marker / filter / imageData 等 SVG-only 为禁项），`<clipPath>` 同属 SVG-only。正解：core 产 renderer-agnostic 资源 + 引用，adapter 物化（**与 alpha.7 Paint 资源表同源、复用同一套去重 + 稳定 id**）。

### 自定义 viewBox override

viewBox 现状全自动：core 算 scene `Layout`（`{ x, y, width, height }`，按内容 + padding），react `formatViewBox`（`packages/react/src/render/viewBox.ts:4`）只是 `${x} ${y} ${w} ${h}` 格式化。**无覆盖入口**（"无逃生口"）。

TikZ `\useasboundingbox` 用指定区域当包围盒、覆盖自动范围。用途：固定画布尺寸 / 裁剪 / 多图对齐 / 排除溢出装饰。

---

## 第一部分：比例 partway 定位（评审 P1#1 修订）

### `AbsoluteTarget` + `BetweenPosition`

```ts
// ir/position/absolute-target.ts（新）—— 自包含、无 path-relative、无环
export const AbsoluteTargetSchema: z.ZodType = z.lazy(() =>
  z.union([
    PositionSchema,                // [x, y]
    PolarPositionSchema,           // 极坐标
    NodeTargetSchema,              // { id, anchor?, offset? }（对象引用，alpha.6 主契约）
    AbsoluteOffsetPositionSchema,  // { of, offset } —— of 为对象（见下，禁 legacy 字符串）
    BetweenPositionSchema,         // { between, t } —— 可嵌套
  ]),
);

// AbsoluteOffsetPosition：of 不复用 legacy OffsetPositionSchema（其 of 仍含 z.string().min(1)，
// 见 offset-position.ts:8——会把 core 字符串节点引用绕回端点，违 alpha.6 对象主契约；评审 P1#3）
export const AbsoluteOffsetPositionSchema = z.object({
  of: z.union([PositionSchema, PolarPositionSchema, NodeTargetSchema]),  // 对象 / 字面量，无字符串
  offset: z.tuple([z.number().finite(), z.number().finite()]),
});

// ir/position/between-position.ts（新）
export const BetweenPositionSchema = z.object({
  between: z.tuple([AbsoluteTargetSchema, AbsoluteTargetSchema])
    .describe('Two absolute endpoints A, B'),
  t: z.number().describe('Proportion from A to B; 0 = A, 1 = B (extrapolation t<0 / t>1: ADR)'),
}).describe('Partway point: lerp(A, B, t). Endpoints are AbsoluteTarget (no path-relative).');

export type IRAbsoluteTarget = z.infer<typeof AbsoluteTargetSchema>;
export type IRBetweenPosition = z.infer<typeof BetweenPositionSchema>;
```

> **递归说明**：`BetweenPosition` 自身属 `AbsoluteTarget`（可嵌套，如三等分 = between of between），`z.lazy` 处理这层**自包含**递归——与"`Position` ↔ `Target` 互相引用"的环不同：`AbsoluteTarget` **不含** `Relative` / `RelativeAccumulate`，也不被 `TargetSchema` 反向引用，闭包内自洽。

### 落点：Position union + Step.to 共用

- 加入 `Node.position` / `Coordinate` 的 union（`ir/node.ts:115` / `ir/coordinate.ts:25`）。
- 也作 Step.to 的 Target——`TargetSchema` 追加 `BetweenPositionSchema`（其端点 `AbsoluteTarget` 已排除 relative，不引入环）。
- 落点范围（仅 Position / 也进 Target）ADR 定；倾向两者（与 §5"Node/Step 共用坐标"一致）。

### compile

- resolve `{ between:[A,B], t }`：先各自 resolve A、B 到世界坐标点（复用 `resolvePosition` / target lookup），再 `lerpPoint(A, B, t)`（复用 `geometry/_edge.ts`）。
- 嵌套 between 递归 resolve。
- A / B 含 NodeTarget 时走 alpha.6 anchor / edgePoint 解析。

---

## 第二部分：clip 裁切（评审 P1#2 修订）

### renderer-agnostic 资源（复用 alpha.7 资源表）

core **不**产 `<clipPath>`。复用 alpha.7 的 Scene 资源表机制：

```ts
// primitive/scene.ts —— 与 PaintResource 并列（同一资源表 / 同套去重 + 稳定 id）
export type ClipResource = {
  id: string;
  /** 渲染无关的裁剪区域描述（rect / path 命令 / 引用某 shape 边界） */
  region: ClipRegion;   // 形态 ADR 定
};
// Scene.resources 容纳 PaintResource | ClipResource（discriminated）
```

- primitive / `GroupPrim` 加 `clipRef?: string` 指向资源。
- adapter（react 新 `render/defs.tsx` 扩展）把 `ClipResource` 物化成 `<clipPath>`，`clipRef` → `clip-path="url(#id)"`。

### IR / 作用域

- **Scope / Group 级**最实用：`ScopeSchema` 加 `clip?`（裁剪区域），裁其内所有子元素 → 对应 `GroupPrim.clipRef`。
- 单 primitive 级裁剪可选（ADR 定是否本段做）。
- 裁剪源形态：rect / path / 引用某 node shape 边界（ADR 定）。

---

## 第三部分：自定义 viewBox override

### IR / compile

- `Layout`（顶层容器）/ Scene 加可选 override 字段。形态（ADR 二选一）：
  - `viewBox?: [x, y, w, h]`（直给，最简单）；或
  - `boundingBox?: { min:[x,y], max:[x,y] }` / 用某 path 当 bbox（对齐 `\useasboundingbox`）。
- compile：有 override 则跳过自动 `Layout` 计算、直接用 override（仍可选叠加 padding，ADR 定关系）；无则现行为不变。
- react `formatViewBox`（`render/viewBox.ts`）消费同样的 `Layout`，无需改（override 在 core 已落到 `Layout`）。

### 用途

固定画布尺寸（内容多少同尺寸）、裁剪显示区域、多图对齐同框、把溢出装饰排除出包围盒。

---

## 实现拆分

每片一个语义闭环、独立可验收、单独 commit（commit 前按用户当次确认逐条执行）。

1. **`AbsoluteTarget` + `AbsoluteOffsetPosition` + `BetweenPosition` schema**（新 `ir/position/{absolute-target,absolute-offset-position,between-position}.ts`）：自包含 union（`z.lazy`，排除 relative）+ offset 端点用 `AbsoluteOffsetPositionSchema`（`of` 仅对象）+ `BetweenPosition`；导出类型；`src/index.ts` 公开。**测试**：接受 Cartesian/Polar/Node/**AbsoluteOffset**/Between 端点；**reject** `{ relative }` / `{ relativeAccumulate }` 作端点（P1#1）+ **reject** offset 的 `of` 为字符串（P1#3）；嵌套 between 合法；schema 无循环（构造不抛栈溢出）。
2. **partway 落 Position + Target**（`ir/node.ts` / `ir/coordinate.ts` position union + `ir/path/target.ts` TargetSchema 追加 `BetweenPosition`）。**测试**：`Node.position = { between, t }` 合法；`Step.to = { between, t }` 合法；union 判别无歧义（`between` key 不撞 `id`/`of`/`relative`）。
3. **partway compile**（`compile/position.ts` / target resolve + `geometry/_edge.ts` lerp）：resolve A/B → lerp；嵌套递归；A/B 含 NodeTarget 走 anchor 解析。**测试**：两 literal 点中点 = lerp；t=0/1 = 端点；NodeTarget 端点（A.north → B.south 中点）；嵌套 between；t 外插（ADR 定后补）。
4. **clip 资源 + clipRef**（`primitive/scene.ts` `ClipResource` + `GroupPrim.clipRef` + `ScopeSchema.clip` + compile 收集进资源表 + react `defs.tsx` 物化）：复用 alpha.7 资源表去重 / 稳定 id。**测试**：Scope clip → `GroupPrim.clipRef` + 资源表 1 条；相同裁剪区域去重；react 渲 `<clipPath>` + `clip-path="url(#id)"`；裁剪生效（区域外不可见）。
5. **viewBox override**（`Layout` / Scene override 字段 + compile 跳过自动算）。**测试**：override 给定 → `Layout` = override（react `formatViewBox` 输出对应 viewBox）；未给 → 自动算不变；与 padding 关系（ADR 定后补）。
6. **全量验收 + ADR 落档**：三包测试全绿；ADR 集合（`notes/decisions/core/v0/v0.2/v0.2-alpha.9/`）固化待定项。

---

## 测试

- **AbsoluteTarget**：接受 5 类绝对端点；**拒** path-relative；嵌套 between；无 schema 循环（`z.lazy` 闭包自洽，构造 / parse 不栈溢出）。
- **partway compile**：literal 中点 / 端点 / t 任意比例；NodeTarget 端点（复用 anchor / edgePoint）；嵌套 between（三等分）；t 外插语义（ADR）。
- **clip**：Scope clip → GroupPrim.clipRef + 资源表；去重 + 稳定 id（复用 alpha.7）；react `<clipPath>` 物化；裁剪可见性正确；core 无 `<clipPath>` 泄漏。
- **viewBox**：override → Layout / viewBox 字符串正确；未给行为不变；padding 关系。
- **回归**：alpha.1–8 全部测试通过；现有 position / target / layout 用法零破坏（union 只叠加分支）。

## 文档

- `core/concepts/positioning/`（扩）：partway `{ between, t }`（边中点 / 三等分 demo）；`AbsoluteTarget` 说明（为何端点不含 relative）；投影 / 完整 calc 标注"不做"。
- `core/concepts/clip/`（新，zh+en）：Scope clip demo；renderer-agnostic 资源 → `<clipPath>` 说明。
- Layout / Scene 页：`viewBox` override（固定尺寸 / 裁剪 demo）。
- IR Schema 参考：`BetweenPosition`、`AbsoluteTarget`、Scope `clip`、Layout `viewBox` override。

## 验收

- partway `{ between:[A,B], t }` 端到端可用（Position + Step.to），端点为自包含 `AbsoluteTarget`、**排除 path-relative**、无 schema 递归（满足 P1#1）。
- clip 经 Scope 可裁其内子元素；core 产 renderer-agnostic `ClipResource` + `clipRef`（复用 alpha.7 资源表），react 物化 `<clipPath>`，**core 无 SVG-only 泄漏**（满足 P1#2）。
- viewBox override 可覆盖自动包围盒（固定尺寸 / 裁剪 / 对齐）；未给时零变化。
- 投影 / 完整 calc / libraries 划分**不做**（前两者学术、后者已被注册面策略覆盖）。
- 三包测试全绿；现有用法零破坏。

## 已决策（讨论确认）

- **partway 端点 = 自包含 `AbsoluteTarget`**（Cartesian / **AbsolutePolarPosition** / NodeTarget / **AbsoluteOffsetPosition** / BetweenPosition），排除 `{ relative }` / `{ relativeAccumulate }`（避免 `Position`↔`Target` 递归，P1#1）；**offset / polar 端点都用 absolute 变体**（`AbsoluteOffsetPositionSchema.of` / `AbsolutePolarPositionSchema.origin` 仅对象，不复用含 `z.string()` 的 legacy `OffsetPositionSchema` / `PolarPositionSchema`，P1#3 + P1）。absolute 闭包无字符串节点引用。
- **clip / viewBox renderer-agnostic**：clip 产 `ClipResource` + `clipRef`（复用 alpha.7 Paint 资源表），`<clipPath>` 物化只在 adapter（P1#2）。
- **明确不做**（gap §5/§6）：投影 projection（几何作图，学术）、完整 calc 表达式（字符串小语言，重且逆 alpha.6 结构化方向）、libraries 划分（非功能缺口——retikz 等价物已是 npm 包 + 注册注入面）。

## 待定（ADR 阶段敲定）

- **partway**：字段命名（`between`/`t` vs `lerp`/`at`）；`t` 是否允许外插（<0 / >1）；落点（仅 Position / 也进 Target——倾向两者）。
- **clip**：裁剪源形态（rect / path 命令 / 引用 node shape 边界）；作用域（Scope/Group / 单 primitive 是否本段做）；与 `ClipResource.region` 的渲染无关表达。
- **viewBox**：override 形态（`[x,y,w,h]` / `{min,max}` / path-as-bbox）；与 padding 的叠加关系；是否允许只覆盖部分（如只固定宽）。

## 设计 ADR

开工前另起（`notes/decisions/core/v0/v0.2/v0.2-alpha.9/`，编号到时定）：

- **ADR-01 partway / AbsoluteTarget**：`AbsoluteTarget` 成员集 + 排除 relative 的理由（避免递归，P1#1）+ `AbsoluteOffsetPositionSchema`（`of` 仅对象，不复用含字符串的 legacy，P1#3）+ `BetweenPosition` 字段 + `t` 范围 + 落点（Position / Target）+ compile lerp 路径。
- **ADR-02 clip**：裁剪源形态 + 作用域 + renderer-agnostic `ClipResource` / `clipRef`（复用 alpha.7 资源表）+ adapter 物化边界。
- **ADR-03 viewBox override**：override 形态 + 与 padding / 自动 Layout 计算的关系。
