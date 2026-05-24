# ADR-01：Paint 基础（PaintValue 词汇表 + SceneResource discriminated 资源表 + gradient）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第一部分](../../../plans/v0/v0.2-alpha.7.md) · [tikz-gap-analysis §1 Node](../../../analysis/2026-05-07-tikz-gap-analysis.md) · [alpha.2 样式继承](../v0.2-alpha.2/)（`fill` 级联）· 下游 [alpha.8 ADR-01 ArrowDefinition](../v0.2-alpha.8/)（复用 `PaintValue.contextStroke`）· [alpha.9 ADR-02 clip](../v0.2-alpha.9/)（复用 `SceneResource` 资源表）· 本 milestone [ADR-02](./02-max-text-width.md) / [ADR-03](./03-pin.md) / [ADR-04](./04-pattern-image-deferred.md)

> **跨段契约**：本 ADR 定下的 `PaintValue` 词汇表与 `SceneResource` 资源表是 alpha.7–9 共享的地基——alpha.8 arrow 颜色继承用 `PaintValue.contextStroke`，alpha.9 clip 把 `ClipResource` 加进同一 `SceneResource` 表。**故 alpha.7 必须先把这两个契约定稳**（评审 P1#1 / P2#1）。

## 背景

`fill` 现状是**纯字符串**：`NodeSchema.fill`（`packages/core/src/ir/node.ts:145`）、`PathSchema.fill`（`ir/path/path.ts:42`）、`ScopeSchema.fill`（`ir/scope.ts:169`）全为 `z.string().optional()`；primitive 层 `RectPrim.fill` / `EllipsePrim.fill` / `PathPrim.fill` 同为 `string`。render 端 `paintAttr` / `paintStyle`（`packages/react/src/render/renderPrim.tsx:44-55`）把含 `var(` 的值塞 inline style、其余走 attribute。

痛点：只能单色。渐变 / 图案 / 图片在 SVG 都靠 `fill="url(#id)"` 引用 `<defs>` 里的 paint server，而 core 无任何 defs / 资源管理。

**关键约束**：`ScenePrimitive` 是"渲染目标无关的最大公约子集，不允许 SVG-only 特性（filter / marker / imageData）"（`packages/core/src/primitive/scene.ts:8-10`）。所以 **core 不能产 `<defs>` primitive**——必须 renderer-agnostic 资源 + 引用，由 adapter 物化。

## 选项

### A. primitive `fill` 升 `PaintValue` union + Scene 级 `SceneResource` discriminated 资源表（**推荐**）

```ts
// primitive/scene.ts —— paint attribute value（任何 paint 属性的取值，fill / stroke 共用）+ 资源表
export type PaintValue =                 // 不绑定 fill：fill / stroke 都用它；alpha.8 arrow stroke 也用（评审 P1）
  | string                              // 纯色（任意 CSS color；含 var() 走 inline style）
  | { kind: 'resourceRef'; id: string } // 指向资源表（gradient / 后续 pattern·image）
  | { kind: 'contextStroke' };          // 继承所在元素描边（adapter → SVG context-stroke；alpha.8 arrow 用）

export type SceneResource =
  | { kind: 'paint'; id: string; spec: IRPaintSpec };
  // alpha.9 追加： | { kind: 'clip'; id: string; region: ClipRegion }

export type Scene = {
  primitives: Array<ScenePrimitive>;
  layout: Layout;
  resources?: Array<SceneResource>;     // 渲染无关；adapter 物化（SVG → <defs>）
};
```

`fill?: PaintValue`（`RectPrim` / `EllipsePrim` / `PathPrim`）；compile 把 IR 的 `PaintSpec` 收进资源表（去重 + 稳定 id）、primitive 写 `{ kind:'resourceRef', id }`；纯色仍 `string`。

- 优：单字段 union 无双字段 invariant；资源表 discriminated 后 alpha.9 加 `clip` 不破契约（评审 P1#1）；`contextStroke` 给 alpha.8 arrow 留好继承位（评审 P2#1）；core 无 SVG 泄漏。
- 缺：primitive `fill` 类型从 `string` 升 union（向后兼容，`string` 仍合法）；compile 多一个资源收集 pass。

### B. primitive `fill: string` + 新增 `fillRef?: string` 双字段

- 缺：两字段互斥需编译期 invariant（"只设一个"）；alpha.8 的 contextStroke 无处安放（又得加第三字段 / 魔法字符串）。比 A 啰嗦，否决。

### C. core 直接产 `<defs>` primitive

- 缺：**违反 `scene.ts` 渲染无关契约**（SVG-only 泄漏 core）；Canvas / PDF adapter 无法消费。否决（评审 P1#2 正是反对这条）。

## 决策：A

理由：

1. **守 `ScenePrimitive` 渲染无关契约**：core 只产 renderer-agnostic 资源表 + `PaintValue` 引用，`<defs>` 物化在 adapter；Canvas / PDF 可各自实现。
2. **一次定稳跨段契约**（评审 P1#1 / P2#1）：`SceneResource` discriminated → alpha.9 clip 加分支不破契约；`PaintValue.contextStroke` → alpha.8 arrow 颜色继承不悬空。
3. **纯色零破坏**：`fill` 仍接受 `string`；union 只叠加分支。
4. **去重 + 稳定 id 在 core（确定性）**：同输入同 id，快照稳定、SSR / CSR 一致。

## 决策细节

> 主选项已锁；以下随讨论 / review 收敛，下游按此执行。

1. **`PaintValue` = paint 属性通用取值（fill / stroke 共用，非 fill-only，评审 P1）**：`string`（纯色）/ `{ kind:'resourceRef', id }`（资源引用）/ `{ kind:'contextStroke' }`（继承描边）。本段 primitive `fill?: PaintValue`；alpha.8 arrow 的 stroke / fill 同用此类型。命名 + `.describe` / 注释按"可用于 fill 与 stroke 的 paint value"写，避免 alpha.8 像借用 fill-only 类型。
2. **`SceneResource` discriminated**：本段只 `{ kind:'paint', id, spec }`；alpha.9 加 `{ kind:'clip', ... }`。`Scene.resources?: Array<SceneResource>`，无资源时省略。
3. **`PaintSpec` 分阶段（评审 P2#1）**：本 ADR 定 `linearGradient` / `radialGradient` 基础；**pattern / image 由 [ADR-04](./04-pattern-image-deferred.md) 实现**（wiring 落地后管线成本归零，讨论后 alpha.7 一并做，image 暂 URL-only）。
4. **去重 + 稳定 id 在 core**：`compile/paint.ts` 对 `PaintSpec` 结构化深比较合并、派稳定 id（hash / 递增序号，见待决策）；primitive 写 `resourceRef`。
5. **纯色与 `var()` 不进资源表**：`fill` 是 `string` 时不收集；`var(--x)` 仍走 react inline style（现 `paintStyle` 逻辑不动）。
6. **scope 级联 PaintSpec**：alpha.2 的 `fill` 级联默认值若是 `PaintSpec`，继承链解析后再进资源收集（去重兜底，避免每继承点重复收集）。
7. **adapter 物化**：react 新增 `render/defs.tsx`——`scene.resources` → `<defs><linearGradient>/<radialGradient>`；`renderPrim` 按 `PaintValue` 分派：`string` → 现 `paintAttr`/`paintStyle`、`resourceRef` → `fill="url(#id)"`、`contextStroke` → `fill="context-stroke"`。
8. **`contextStroke` 留给 alpha.8**：本段 node / path fill 不主动产 `contextStroke`（它是 arrow marker 的继承语义），但词汇表此处定稳，alpha.8 直接用。
9. **英文 `.describe` 硬要求**：`PaintSpecSchema`（顶层）+ `GradientStopSchema` 各字段（`offset` / `color` / `opacity`）+ gradient 方向 / center / radius 字段，逐一带英文 `.describe`（schema reference + LLM tool schema 来源）。

## 待决策点（实现期已敲定）

- **linear gradient 方向**：✅ 用 `angle`（度，polar 约定 0=左→右 / 90=上→下）；react `angleToLine` 过中心 (0.5,0.5) 沿方向画长 1 渐变线。
- **radial center / radius 坐标系**：✅ `objectBoundingBox`（0..1 相对形状，随缩放）；缺省 center (0.5,0.5)、radius 0.5。
- **stop `color`**：✅ 支持 `currentColor`（SVG `<stop stop-color>` 天然继承元素 color）；`var()` 在 `<defs>` 内未特殊处理（留待）。
- **资源 id 策略**：实现选**递增首见序**（`paint-1`/`paint-2`…，Map<jsonKey,id> 去重）——**偏离 ADR 原"倾向内容 hash"**：首见序对同一 IR 同样确定性（SSR/CSR 一致），且短、可读、无需 hash 依赖；跨 SVG 唯一性由 react adapter 加 `useId` 前缀解决，hash 的"跨编译稳定"优势在 scene-local id 场景用不上。
- **`PaintValue` 是否需要 `contextFill`**：本段未加；alpha.8 arrow 评估（`contextStroke` 已够 node/path fill 不用）。

## DSL 表面

```tsx
{/* 纯色（零破坏） */}
<Node fill="lightblue">A</Node>

{/* 线性 / 径向渐变 */}
<Node fill={{ type: 'linearGradient', angle: 90, stops: [
  { offset: 0, color: '#4f8' }, { offset: 1, color: '#08f' },
] }}>A</Node>
<Path fill={{ type: 'radialGradient', stops: [
  { offset: 0, color: 'white' }, { offset: 1, color: 'navy' },
] }} /* + cycle */ />
```

```jsonc
// 序列化 IR：fill 为 PaintSpec；编译后 primitive.fill 为 resourceRef + scene.resources 收 spec
{ "type": "node", "id": "A", "fill": { "type": "linearGradient", "angle": 90, "stops": [/*…*/] } }
// → Scene: primitive.fill = { "kind": "resourceRef", "id": "g1" }；resources: [{ "kind":"paint", "id":"g1", "spec": {…} }]
```

## 测试设计

`packages/core/tests/ir/paint.test.ts`（schema）+ `packages/core/tests/compile/paint.test.ts`（资源收集 / 去重 / id）+ `packages/react/tests/render/defs.test.tsx`（物化 `<defs>` + `url(#)`）。详见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/paint.ts`（新建）：`PaintSpecSchema`（linear/radial gradient）+ `GradientStopSchema` + `IRPaintSpec`。
- `packages/core/src/ir/node.ts` / `ir/path/path.ts` / `ir/scope.ts`：`fill` 升 `z.union([z.string(), PaintSpecSchema])`。
- `packages/core/src/primitive/scene.ts`：`PaintValue` + `SceneResource` + `Scene.resources?`。
- `packages/core/src/primitive/{rect,ellipse,path}.ts`：`fill?: PaintValue`（原 `string`）。
- `packages/core/src/compile/paint.ts`（新建）：收集 / 去重 / 派 id。
- `packages/core/src/compile/{node,path,scope}`：fill 是 `PaintSpec` 时接入收集器（含级联）。
- `packages/react/src/render/defs.tsx`（新建）+ `renderPrim.tsx`：物化资源表 + `PaintValue` 分派。
- `packages/core/src/index.ts` / `packages/react/src/index.ts`：公开 `IRPaintSpec` / `PaintValue` / `SceneResource`。
- 文档：`core/concepts/paint/`（新）+ Node/Path/Scope `fill` 字段补 gradient。
- 对外 API：`fill` 类型扩张（向后兼容，`string` 仍合法）；primitive `fill` 类型升 union（消费 Scene 的 adapter 需处理 `PaintValue`——本仓库 react adapter 同步改）。

## 不在本 ADR 范围

- **pattern / image**→ [ADR-04](./04-pattern-image-deferred.md)（复用本 ADR 基建实现）。
- **maxTextWidth 折行**→ [ADR-02](./02-max-text-width.md)；**pin 引脚**→ [ADR-03](./03-pin.md)。
- **arrow 颜色继承用 `contextStroke`**→ alpha.8 ADR-01（本篇只定 `PaintValue` 词汇表，不产 arrow marker）。
- **clip 资源**→ alpha.9 ADR-02（本篇只把 `SceneResource` 定成 discriminated，clip 分支在 alpha.9 加）。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（paint.ts + fill union）
- 动 `packages/core/src/primitive/**`（scene.ts 资源表 + PaintValue；rect/ellipse/path fill 类型）
- 动 `packages/core/src/compile/**`（paint.ts 收集器 + node/path/scope 接入）
- 动 `packages/*/src/index.ts`（公开类型）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/paint.ts` | 新建 schema | `GradientStopSchema` | `z.object({ offset: 0..1, color: string, opacity?: 0..1 })` | — | 渐变 stop：位置 0..1 + 颜色 + 可选透明度 |
| `ir/paint.ts` | 新建 schema | `PaintSpecSchema` | `z.discriminatedUnion('type', [linearGradient, radialGradient])` | — | paint server（渐变）；纯色仍是 `fill` 上的 string |
| `ir/paint.ts` | 新建 type | `IRPaintSpec` | `z.infer<typeof PaintSpecSchema>` | — | paint server 类型 |
| `ir/node.ts` | 改 schema | `NodeSchema.fill` | `z.union([z.string(), PaintSpecSchema]).optional()` | — | 节点填充：纯色（CSS color）或渐变 PaintSpec |
| `ir/path/path.ts` | 改 schema | `PathSchema.fill` | 同上 | — | 闭合区填充：纯色或渐变 |
| `ir/scope.ts` | 改 schema | `ScopeSchema.fill` | 同上 | — | scope 级联默认填充：纯色或渐变 |

> primitive 层（非 zod，TS type）：`PaintValue` / `SceneResource` / `Scene.resources` / `{rect,ellipse,path}.fill: PaintValue`。
>
> **英文 `.describe` 硬要求**：`PaintSpecSchema` / `GradientStopSchema` 及其全部字段 + 三处 `fill` union 落地 `.describe(...)` 必须英文。

### 文件 scope

- `packages/core/src/ir/paint.ts`（新建：2 schema + 1 type）
- `packages/core/src/ir/node.ts` / `ir/path/path.ts` / `ir/scope.ts`（`fill` union）
- `packages/core/src/primitive/scene.ts`（`PaintValue` / `SceneResource` / `resources`）
- `packages/core/src/primitive/{rect,ellipse,path}.ts`（`fill: PaintValue`）
- `packages/core/src/compile/paint.ts`（新建：收集 / 去重 / id）
- `packages/core/src/compile/{node,path,scope}.ts`（接入收集器 + 级联）
- `packages/core/src/index.ts`（公开 `IRPaintSpec` / `PaintValue` / `SceneResource`）
- `packages/react/src/render/defs.tsx`（新建）+ `renderPrim.tsx`（`PaintValue` 分派）
- `packages/react/src/index.ts`（re-export 类型）
- `packages/core/tests/ir/paint.test.ts`（新建）
- `packages/core/tests/compile/paint.test.ts`（新建）
- `packages/react/tests/render/defs.test.tsx`（新建）
- `apps/docs/src/contents/core/concepts/paint/index.{zh,en}.mdx`（新建）+ Node/Path/Scope 页 fill demo

### 测试象限

#### Happy path（≥ 3）

- `fill_solid_string_unchanged`：`fill: 'lightblue'` → primitive `fill: 'lightblue'`、`scene.resources` 省略（零破坏）
- `fill_linear_gradient_to_resource`：`fill: { type:'linearGradient', ... }` → primitive `fill: { kind:'resourceRef', id }` + `resources` 含 1 条 `{ kind:'paint', id, spec }`
- `fill_radial_gradient`：径向渐变同上，spec 形态正确
- `adapter_materializes_defs`：含 gradient 的 Scene → react 渲出 `<defs>` + 元素 `fill="url(#id)"`

#### 边界（≥ 2）

- `dedup_same_spec_one_resource`：两个 node 用结构相同的 `PaintSpec` → `resources` 仅 1 条、两 primitive `resourceRef.id` 相同
- `stable_id_deterministic`：同一 IR 编译两次 → 资源 id 完全一致（快照稳定）
- `var_color_stays_inline`：`fill: 'var(--bg)'`（string）→ 不进资源表、react 走 inline style（现行为不退）

#### 错误路径（≥ 2）

- `gradient_stops_min_two`：`stops` 少于 2 → schema 拒
- `stop_offset_out_of_range`：`offset: 1.5` / `-0.1` → schema 拒（`.min(0).max(1)`）
- `paintspec_non_json_rejected`：`PaintSpec` 含 function / 非 JSON 字段 → TS / zod 拒（守 IR 可序列化）

#### 交互（≥ 2）

- `scope_cascade_paintspec`：`<Scope fill={gradient}>` 内 node 无显式 fill → 继承 scope 渐变、正确收进资源表（去重）
- `path_fill_gradient_with_cycle`：`<Path fill={gradient}>` + cycle → 闭合区渐变填充
- `mixed_solid_and_gradient`：场景里既有纯色又有渐变 node → 纯色不进表、渐变进表，互不干扰

### 依赖的现有元素

- `packages/core/src/primitive/scene.ts` 的 `ScenePrimitive` / `Scene` —— **修改**：加 `PaintValue` / `SceneResource` / `resources`
- `packages/core/src/ir/node.ts` / `ir/path/path.ts` / `ir/scope.ts` 的 `fill` —— **修改**：升 union
- `packages/react/src/render/renderPrim.tsx` 的 `paintAttr` / `paintStyle` —— **引用 + 扩展**：`PaintValue` 分派，`string` 分支保留现逻辑
- `packages/core/src/compile/{node,path,scope}.ts` 的 fill 处理 —— **修改**：接入资源收集器
- alpha.2 的 `fill` 级联（`compile/scope` 样式继承）—— **引用**：级联解析后进资源收集
