# ADR-03：自定义 viewBox override（覆盖自动包围盒的逃生口）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.9 plan §第三部分](../../../plans/v0/v0.2-alpha.9.md) · [tikz-gap-analysis §6 Scene](../../../analysis/2026-05-07-tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-partway-absolute-target.md) / [ADR-02](./02-clip.md)

> **前置依赖**：复用 core 现有 scene `Layout` 计算 + react `formatViewBox`（`packages/react/src/render/viewBox.ts:4`）。本 ADR 只加 override 入口，不改度量。

## 背景

viewBox 现状全自动：core 算 scene `Layout`（`{ x, y, width, height }`，按内容 + padding），react `formatViewBox` 只是 `${x} ${y} ${w} ${h}` 格式化。**无覆盖入口**（"无逃生口"）。

TikZ `\useasboundingbox` 用指定区域当包围盒、覆盖自动范围。用途：固定画布尺寸（内容多少同尺寸）、裁剪显示区域、多图对齐同框、把溢出装饰排除出包围盒。

## 选项

### A. `Layout`（顶层容器）/ Scene 加可选 override 字段，有则跳过自动算（**推荐**）

```ts
// 形态二选一（待决策）：
//   (a) viewBox?: [x, y, w, h]（直给，最简单）
//   (b) boundingBox?: { min:[x,y], max:[x,y] }
// 给定 → compile 用 override 当 Layout（仍可选叠加 padding，见待决策）；未给 → 现行为
```

- 优：计算机器现成，只加 override 分支；react `formatViewBox` 无需改（override 已落到 `Layout`）。
- 缺：override 形态要定（数组 vs min/max vs path-as-bbox）；与 padding 关系要定。

### B. 不做（继续全自动）

- 缺：固定尺寸 / 裁剪 / 多图对齐无逃生口。用户已拍要做。

## 决策：A

理由：

1. **逃生口刚需**：固定画布、裁剪、多图对齐是真实诉求，全自动无法表达。
2. **复用现成 Layout 计算**：有 override 跳过自动算，无 override 零变化；react 端无改动。
3. **低成本**：纯叠加字段 + compile 一个分支。

## 决策细节

1. **override 落点 = IR 顶层 `viewBox` 字段（已拍，评审 P2）**：放 Scene IR **顶层**（可序列化、AI 可生成），**不是**仅 React prop / `CompileOptions`；`Layout` 组件的 `viewBox` prop 透传进 IR 顶层。compile 有 override 则直接用、跳过自动包围盒。一处定，避免 prop / IR / compile 三处同步漏。
2. **形态**（待决策，倾向 (a)）：`viewBox?: [x, y, w, h]`（直给四元组，最直观，与 SVG viewBox 同序）。
3. **与 padding 关系**（待决策）：override 给定时是否仍叠加 `CompileOptions.padding`。倾向 **override = 最终框，不再叠 padding**（用户既然显式给框，应所见即所得）。
4. **未给 → 零变化**：现自动 `Layout` 计算 + padding 不动。
5. **与 clip 独立**（[ADR-02](./02-clip.md)）：viewBox 决定画布范围（坐标系映射），clip 决定可见裁切；两者正交，clip 不改 viewBox、viewBox 不裁元素。
6. **英文 `.describe`**（若为 IR schema 字段）：`viewBox` override 字段英文 describe。

## 待决策点

- **形态**：`[x,y,w,h]`（推荐）vs `{ min, max }` vs 用某 path / node 当 bbox（对齐 `\useasboundingbox` 任意路径）。倾向 `[x,y,w,h]`，path-as-bbox 留扩展。
- **与 padding**：override 时是否叠 padding。倾向不叠（所见即所得）。
- **部分覆盖**：是否允许只固定宽 / 只固定高（其余自动）。倾向首批整框覆盖，部分覆盖留扩展。
- ~~落点~~ **已拍（评审 P2）**：IR 顶层 `viewBox` 字段（`Layout` prop → IR 顶层），非仅 prop / `CompileOptions`（见 §决策细节 #1）。

## DSL 表面

```tsx
{/* 固定画布到指定框（内容多少同尺寸） */}
<Layout viewBox={[0, 0, 200, 120]}>{/* ... */}</Layout>
```

```jsonc
// IR / Scene：override 落到 layout，react formatViewBox 直接用
{ "type": "scene", "viewBox": [0, 0, 200, 120], "children": [/*…*/] }
// → Scene.layout = { x:0, y:0, width:200, height:120 }（跳过自动算）
```

## 影响

- `packages/core/src/ir/`（顶层 scene / Layout schema）：加 `viewBox?`（或 `boundingBox?`）override 字段。
- `packages/core/src/compile/compile.ts`：有 override 则用之当 `Layout`，跳过自动包围盒。
- `packages/react/src/kernel/Layout.tsx`：透传 `viewBox` prop 到 IR。
- `packages/react/src/render/viewBox.ts`：无需改（消费同一 `Layout`）。
- 对外 API：纯叠加字段，零破坏（未给时全自动不变）。

## 不在本 ADR 范围

- **partway**→ [ADR-01](./01-partway-absolute-target.md)；**clip**→ [ADR-02](./02-clip.md)。
- **path-as-bbox（任意路径当包围盒）**：留扩展，首批 `[x,y,w,h]`。
- **libraries 划分**（`\usetikzlibrary`）：非功能缺口，已被注册面策略覆盖，不做。

---

## 实现契约（必填）

### Level

`yellow`

- 动 `ir/`（顶层加一字段）+ `compile/compile.ts`（override 分支）+ `react/kernel/Layout.tsx`（透传）
- 不动 primitive 契约 / render viewBox.ts
- 取最高 = yellow

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/`（scene 顶层） | 加字段 | `viewBox` | `z.tuple([z.number(), z.number(), z.number().finite().positive(), z.number().finite().positive()]).optional()` | 未给 = 自动 | 覆盖自动包围盒：[x, y, width, height]（对齐 SVG viewBox） |

> 形态最终（`[x,y,w,h]` vs `{min,max}`）见待决策。**英文 `.describe`**：`viewBox` 字段必须英文，写明"override auto-computed bounding box; [x,y,width,height]"。

### 文件 scope

- `packages/core/src/ir/`（scene 顶层 schema 加 `viewBox?`）
- `packages/core/src/compile/compile.ts`（override → Layout，跳过自动算）
- `packages/react/src/kernel/Layout.tsx`（透传 `viewBox` prop）
- `packages/core/tests/compile/viewbox-override.test.ts`（新建）
- `apps/docs/src/contents/core/components/layout/`（viewBox override demo）

### 测试象限

#### Happy path（≥ 3）

- `viewbox_override_used`：给 `viewBox:[0,0,200,120]` → `Scene.layout` = 该框（跳过自动算）
- `formatviewbox_matches`：react `formatViewBox` 输出 `"0 0 200 120"`
- `no_override_auto`：未给 → 自动包围盒（现行为）不变

#### 边界（≥ 2）

- `override_smaller_than_content`：override 框小于内容 → 内容溢出框（视觉裁切由 clip 管，viewBox 只定坐标范围）
- `override_no_padding`：override 时不叠 padding（按拍定：所见即所得）
- `fixed_size_same_regardless`：不同内容量 + 同 override → 画布尺寸一致（固定尺寸用例）

#### 错误路径（≥ 2）

- `viewbox_non_positive_size`：width / height ≤ 0 → schema 拒（`.positive()`）
- `viewbox_wrong_arity`：非 4 元组 → schema 拒
- `viewbox_nan`：含 NaN / Infinity → schema 拒

#### 交互（≥ 2）

- `override_with_clip`：viewBox override + clip（ADR-02）→ 两者独立（viewBox 定范围、clip 裁可见）
- `override_with_scope_transform`：override + 内部 scope transform → 内容在固定框内正确变换
- `multi_figure_align`：两图同 override → 同框对齐（多图对齐用例）

### 依赖的现有元素

- core scene `Layout` 计算（`compile/compile.ts`）+ `computeScopeBoundingBox`（`compile/scope.ts`）—— **修改**：override 时跳过
- `packages/react/src/render/viewBox.ts` 的 `formatViewBox` —— **引用**：消费同一 `Layout`，无需改
- `packages/react/src/kernel/Layout.tsx` —— **修改**：透传 `viewBox` prop
- [ADR-02 clip](./02-clip.md) —— **正交**：viewBox 定范围、clip 裁可见，互不影响
