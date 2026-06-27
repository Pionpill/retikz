# ADR-02：clip 裁切（renderer-agnostic ClipResource + clipRef，复用 alpha.7 资源表）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.9 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §6 Scene](../../../../../analysis/tikz-gap-analysis.md) · [alpha.7 ADR-01 Paint](../alpha.7/01-paint-basics.md)（`SceneResource` discriminated 资源表 + adapter 物化范式）· [alpha.1 Scope](../alpha.1/)（裁剪作用域挂点）· 本 milestone [ADR-01](./01-partway-absolute-target.md) / [ADR-03](./03-viewbox-override.md)

## 背景 / 约束

retikz 原先无任何裁剪机制。TikZ `\clip` 设区域，之后绘制只在区域内可见、外部裁掉；SVG 靠 `<clipPath>` + `clip-path="url(#id)"`。

关键约束：`ScenePrimitive` 必须渲染无关（`primitive/scene.ts` 明列 marker / filter / imageData 等 SVG-only 为禁项），`<clipPath>` 同属 SVG-only——**core 不能直接产 `<clipPath>`**，须 renderer-agnostic 资源 + 引用，由 adapter 物化。alpha.7 ADR-01 已把 `SceneResource` 定成 discriminated（正是为此可扩展性），clip 加 `{ kind:'clip' }` 分支即可，不破契约。

## 决策：`ClipResource` 进 alpha.7 资源表 + `clipRef` + Scope 级裁剪

core 产 renderer-agnostic 的 `ClipResource`（`{ kind:'clip', id, region }`，`region` 为 rect / path commands 等渲染无关形态）+ 在 `GroupPrim` 上挂 `clipRef`；`ScopeSchema.clip?` 编译成该 scope 的 `GroupPrim.clipRef`，裁组内所有子元素。adapter 物化：`ClipResource` → `<clipPath>`，`clipRef` → `clip-path="url(#id)"`。去重 / 稳定 id 复用 alpha.7 同款资源收集器。

理由：

1. **复用 alpha.7 资源表**：`SceneResource` 加 `{ kind:'clip' }` 分支，去重 / 稳定 id / adapter 物化全复用，不破契约。
2. **守渲染无关契约**：core 只产 `ClipResource` + `clipRef`，`<clipPath>` 物化在 adapter；core Scene 输出无 SVG 泄漏。
3. **Scope 级最实用**：裁一组子元素是主用例，挂 alpha.1 的 Scope / GroupPrim。

设计细节（具体决策）：

- **clip region 坐标系 = scope-local**（评审 P2 已写死）：`Scope.clip` 的 `region` 用 scope 局部坐标，随该 Scope 的 `transforms` 一起生效（与组内子元素同坐标系）；adapter SVG 物化 `<clipPath>` 设 `clipPathUnits="userSpaceOnUse"` + 必要 transform，保证裁剪区与被裁内容同系。**不**用 world-space region（否则与 scope transform 脱钩）。
- **裁剪源形态**：首批 `rect`（x/y/w/h）+ `path`（PathCommand 区域）。
- **clip 不改 layout 包围盒**：裁剪是视觉裁切，不缩 bbox；与 ADR-03 viewBox 各自独立。
- **嵌套 clip**：scope 套 scope 各带 clip → 交集（SVG clipPath 嵌套天然交集）。

### 被否决的选项

- **B：core 直接产 `<clipPath>` primitive**——违 `scene.ts` 渲染无关契约（SVG-only 泄漏进 core）。否决。
- **C：仅单 primitive 级 clip（不做 Scope 级）**——"裁一组元素"是最常用场景，单 primitive 级覆盖面窄。Scope 级优先，单 primitive 级作可选叠加。

## 不在本 ADR 范围

- **单 primitive 级 clip**（`primitive.clipRef`）：首批只做 Scope/Group 级。
- **shape 引用裁剪**（引用某 node shape 边界当裁剪区，如裁成圆形头像）：留扩展。
- **`SceneResource` 资源表 / 去重 / 物化基建**→ alpha.7 ADR-01（本篇加 clip 分支、复用基建）。
- **partway 定位**→ [ADR-01](./01-partway-absolute-target.md)；**viewBox override**→ [ADR-03](./03-viewbox-override.md)。

---

> **实现指针**：level `red`（动 `primitive/scene.ts` 的 `SceneResource` clip 分支 + `clipRef` + `ir/scope.ts` clip 字段 + `compile/**` scope.clip → clipRef + 资源收集 + react adapter 物化），向后兼容纯叠加、零破坏。真源以代码为准——`ClipResource` / `ClipRegion` / `clipRef`（`core/src/primitive/clip.ts`、`core/src/primitive/scene.ts`）、`ScopeSchema.clip`（`core/src/ir/scope.ts`）、scope.clip 编译 + 资源去重（`core/src/compile/clip.ts`）、`<clipPath>` 物化（`react/src/render/clipDefs.tsx`，引用 `renderPrim.tsx` / `svgToReact.ts`）。测试在 `core/tests/ir/clip.schema.test.ts`、`core/tests/compile/clip*.test.ts`、`react/tests/render/clipDefs*.test.tsx`。DSL 表面见文档站 clip 概念页。完整原文（选项 A/B/C 详情 / 评审 P1/P2 坑位 / Schema 改动表 / 文件 scope / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `133ad7c1`；压缩前完整施工蓝图 = `git show 133ad7c1^:notes/decisions/core/v0/v0.2/alpha.9/02-clip.md`。
