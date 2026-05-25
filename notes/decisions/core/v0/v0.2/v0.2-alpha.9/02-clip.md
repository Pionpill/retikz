# ADR-02：clip 裁切（renderer-agnostic ClipResource + clipRef，复用 alpha.7 资源表）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.9 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §6 Scene](../../../../../analysis/tikz-gap-analysis.md) · [alpha.7 ADR-01 Paint](../v0.2-alpha.7/01-paint-basics.md)（`SceneResource` discriminated 资源表 + adapter 物化范式）· [alpha.1 Scope](../v0.2-alpha.1/)（裁剪作用域挂点）· 本 milestone [ADR-01](./01-partway-absolute-target.md) / [ADR-03](./03-viewbox-override.md)

> **前置依赖**：clip 资源进 alpha.7 ADR-01 定下的 `SceneResource` discriminated 资源表（复用同套去重 + 稳定 id + adapter 物化范式）。

## 背景

无任何裁剪机制。TikZ `\clip` 设区域，之后绘制只在区域内可见、外部裁掉。SVG 靠 `<clipPath>` + `clip-path="url(#id)"`。

**关键约束**：`ScenePrimitive` 渲染无关（`packages/core/src/primitive/scene.ts:8`，明列 marker / filter / imageData 等 SVG-only 为禁项），`<clipPath>` 同属 SVG-only。**core 不能直接产 `<clipPath>`**——须 renderer-agnostic 资源 + 引用，adapter 物化（评审 P1#2）。alpha.7 ADR-01 已把 `SceneResource` 定成 discriminated，clip 加 `{ kind:'clip' }` 分支即可，不破契约。

## 选项

### A. `ClipResource`（进 alpha.7 资源表）+ `clipRef` + Scope/Group 级裁剪（**推荐**）

```ts
// primitive/scene.ts —— alpha.7 SceneResource 加 clip 分支
export type SceneResource =
  | { kind: 'paint'; id: string; spec: IRPaintSpec }
  | { kind: 'clip'; id: string; region: ClipRegion };   // 本 ADR 加

export type ClipRegion =     // 渲染无关裁剪区域
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'path'; commands: Array<PathCommand> };      // 任意路径区域

// GroupPrim / primitive 加 clipRef
type WithClip = { clipRef?: string };
```

- `ScopeSchema` 加 `clip?`（裁剪区域）→ 编译成 `GroupPrim.clipRef`（裁组内所有子元素）。
- adapter（react `render/defs.tsx` 扩展）：`ClipResource` → `<clipPath>`，`clipRef` → `clip-path="url(#id)"`。
- 优：复用 alpha.7 资源表（去重 + 稳定 id + 物化范式）；core 无 SVG 泄漏；Scope 级裁剪最实用。
- 缺：`ClipRegion` 渲染无关形态要定（rect / path）。

### B. core 直接产 `<clipPath>` primitive

- 缺：违 `scene.ts` 渲染无关契约（评审 P1#2 反对）。否决。

### C. 仅单 primitive 级 clip（不做 Scope 级）

- 缺：图里"裁一组元素"最常用；单 primitive 级覆盖面窄。Scope 级优先，单 primitive 级可选叠加。

## 决策：A

理由：

1. **复用 alpha.7 资源表**：`SceneResource` 加 `{ kind:'clip' }` 分支，去重 / 稳定 id / adapter 物化全复用，不破契约（评审 P1#1 当初就是为此 discriminated）。
2. **守渲染无关契约（P1#2）**：core 产 `ClipResource` + `clipRef`，`<clipPath>` 物化在 adapter。
3. **Scope 级最实用**：裁一组子元素是主用例，挂 alpha.1 的 Scope / GroupPrim。

## 决策细节

1. **`ClipResource`**：`{ kind:'clip', id, region }` 进 `SceneResource`；`region` 渲染无关（rect / path commands）。
2. **`clipRef`**：`GroupPrim`（首批）+ 可选 primitive 加 `clipRef?: string`。
3. **作用域**：`ScopeSchema.clip?`（裁剪区域）→ 编译成该 scope 的 `GroupPrim.clipRef`，裁组内所有子元素。单 primitive 级裁剪（primitive.clipRef）可选（见待决策）。
4. **裁剪源形态**：首批 `rect`（x/y/w/h）+ `path`（PathCommand 区域）；"引用某 node shape 边界"留扩展（见待决策）。
5. **去重 + 稳定 id**：复用 alpha.7 `compile/paint.ts` 同款资源收集器（或并列 `compile/resources.ts`）：结构相同的 `ClipRegion` 合并、稳定 id。
6. **adapter 物化**：react `render/defs.tsx` 扩展——`ClipResource` 渲 `<clipPath>`（内含 rect / path），`clipRef` → 元素 `clip-path="url(#id)"`。
7. **clip region 坐标系 = scope-local（已写死，评审 P2）**：`Scope.clip` 的 `region` 用 **scope 局部坐标**，随该 Scope 的 `transforms` 一起生效（与组内子元素同坐标系）；adapter SVG 物化 `<clipPath>` 设 `clipPathUnits="userSpaceOnUse"` + 必要 transform，保证裁剪区与被裁内容同系。**不**用 world-space region（否则与 scope transform 脱钩）。
8. **英文 `.describe`**：`ScopeSchema.clip` + `ClipRegion` 各分支字段英文 describe。

## 待决策点

- **裁剪源形态范围**：rect / path 之外是否支持"引用某 node shape 边界当裁剪区"（如裁成圆形头像）。倾向首批 rect + path，shape 引用留扩展。
- **单 primitive 级 clip**：是否本段做（primitive.clipRef）。倾向先只 Scope/Group 级。
- **clip 与 layout 包围盒**：裁剪区超出 / 小于内容时，自动 viewBox（ADR-03）是否受 clip 影响。倾向 clip 不改 layout（裁剪是视觉裁切，不缩包围盒），与 ADR-03 viewBox override 各自独立。
- **嵌套 clip**：scope 套 scope 各带 clip → 交集（SVG clipPath 嵌套天然交集）。

## DSL 表面

```tsx
{/* Scope 级裁剪：组内元素只在矩形区可见 */}
<Scope clip={{ kind: 'rect', x: 0, y: 0, width: 100, height: 60 }}>
  <Node position={[80, 50]}>部分被裁</Node>
</Scope>
{/* 路径区域裁剪 */}
<Scope clip={{ kind: 'path', commands: [/* 圆形等 */] }}>{/* ... */}</Scope>
```

```jsonc
// Scene: GroupPrim.clipRef + resources 含 clip
{ "type": "group", "clipRef": "c1", "children": [/*…*/] }
// resources: [{ "kind": "clip", "id": "c1", "region": { "kind": "rect", "x":0, ... } }]
```

## 影响

- `packages/core/src/primitive/scene.ts`：`SceneResource` 加 `{ kind:'clip' }`；`ClipRegion` 类型；`GroupPrim` / primitive 加 `clipRef?`。
- `packages/core/src/ir/scope.ts`：`ScopeSchema.clip?`（裁剪区域 schema）。
- `packages/core/src/compile/`（scope 编译 + 资源收集）：scope.clip → GroupPrim.clipRef + ClipResource（去重）。
- `packages/react/src/render/defs.tsx`：`ClipResource` → `<clipPath>`；`clipRef` → `clip-path`。
- `packages/core/src/index.ts`：公开 `ClipRegion`（如需）。
- 对外 API：纯叠加（Scope.clip + Scene 资源分支），零破坏。

## 不在本 ADR 范围

- **`SceneResource` 资源表 / 去重 / adapter 物化基建**→ alpha.7 ADR-01（本篇加 clip 分支、复用基建）。
- **partway 定位**→ [ADR-01](./01-partway-absolute-target.md)；**viewBox override**→ [ADR-03](./03-viewbox-override.md)。
- **clip 成圆形头像（shape 引用裁剪）**：留扩展。

---

## 实现契约（必填）

### Level

`red`

- 动 `primitive/scene.ts`（SceneResource clip 分支 + clipRef）+ `ir/scope.ts`（clip 字段）+ `compile/**`（scope.clip → clipRef + 资源）+ `react/render/defs.tsx`
- 取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scope.ts` | 加字段 | `ScopeSchema.clip` | `z.discriminatedUnion('kind', [rect, path]).optional()` | — | 裁剪区域：组内元素只在区内可见（TikZ \clip） |
| `primitive/scene.ts` | 加分支 | `SceneResource` | `\| { kind:'clip', id, region: ClipRegion }` | — | （TS type）clip 资源，adapter 物化 `<clipPath>` |
| `primitive/{group,...}.ts` | 加字段 | `clipRef?` | `string`（TS type） | — | 指向 clip 资源 id |

> `ClipRegion` / `clipRef` 为 TS type（primitive 层）。**英文 `.describe`**：`ScopeSchema.clip` + 其 `rect` / `path` 分支字段必须英文。

### 文件 scope

- `packages/core/src/primitive/scene.ts`（`SceneResource` clip 分支 + `ClipRegion` + `clipRef`）
- `packages/core/src/primitive/group.ts`（`GroupPrim.clipRef?`）
- `packages/core/src/ir/scope.ts`（`ScopeSchema.clip?`）
- `packages/core/src/compile/`（scope.clip → GroupPrim.clipRef + ClipResource，复用 alpha.7 资源收集器）
- `packages/react/src/render/defs.tsx`（`ClipResource` → `<clipPath>`；`clipRef` → `clip-path`）
- `packages/core/src/index.ts`（公开 `ClipRegion`）
- `packages/core/tests/compile/clip.test.ts`（新建）+ `packages/react/tests/render/clip.test.tsx`（新建）
- `apps/docs/src/contents/core/concepts/clip/`（新建 zh+en + demo）

### 测试象限

#### Happy path（≥ 3）

- `scope_clip_rect`：`<Scope clip={rect}>` → `GroupPrim.clipRef` + resources 含 `{ kind:'clip', region:rect }`
- `scope_clip_path`：path 区域裁剪 → ClipResource region.kind='path'
- `adapter_clippath`：含 clip 的 Scene → react 渲 `<clipPath>` + 元素 `clip-path="url(#id)"`
- `clip_hides_outside`：裁剪区外元素视觉裁掉（区内可见）

#### 边界（≥ 2）

- `clip_dedup`：两 scope 同裁剪区域 → 资源表 1 条、clipRef 同 id（复用 alpha.7 去重）
- `nested_scope_clip`：scope 套 scope 各 clip → 交集（嵌套 clipPath）
- `clip_no_layout_change`：clip 不改自动 layout 包围盒（裁切是视觉，不缩 bbox）

#### 错误路径（≥ 2）

- `clip_rect_negative_size`：rect width/height ≤ 0 → schema 拒 / 按拍定
- `clip_invalid_region_kind`：未知 region kind → schema 拒
- `core_no_clippath_leak`：core Scene 输出无 `<clipPath>`（渲染无关，物化在 adapter）

#### 交互（≥ 2）

- `clip_with_paint_resource`：同场景 clip + gradient → 两类资源共存于 `SceneResource` 表、id 不撞
- `clip_with_scope_transform`：clip region 用 scope-local 坐标 + scope transform → 裁剪区与组内内容**同步变换**（评审 P2：region 非 world-space）
- `clip_with_zindex`：clip 组内 zIndex 排序不受裁剪影响

### 依赖的现有元素

- alpha.7 ADR-01 的 `SceneResource`（discriminated）/ `compile/paint.ts` 资源收集器 / `render/defs.tsx` —— **扩展**：加 clip 分支、复用去重 + 物化
- `packages/core/src/primitive/group.ts` 的 `GroupPrim` —— **修改**：加 `clipRef?`
- `packages/core/src/ir/scope.ts` 的 `ScopeSchema` —— **修改**：加 `clip?`
- alpha.1 Scope → GroupPrim 编译 —— **引用**：clipRef 挂 GroupPrim
