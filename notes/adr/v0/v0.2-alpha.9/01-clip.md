# ADR-01：clip 裁切（Scope 级裁剪区 + renderer-agnostic ClipResource / clipRef）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0 roadmap §v0.2](../../../plans/v0/roadmap.md) · [tikz-gap-analysis §6 Scene](../../../analysis/2026-05-07-tikz-gap-analysis.md) · [v0.2 计划 §alpha.9](../../../plans/v0/v0.2.md) · [DESIGN.md](../../../architecture/DESIGN.md)

## 背景

retikz 目前没有裁剪能力。TikZ 用 `\clip` 把后续绘制限制在一个区域内（区域内可见、区域外裁掉），常用于：开"取景窗口"只露出大图一角、做圆形/矩形遮罩、把溢出内容裁齐到固定边框。`\begin{scope}\clip (0,0) rectangle (4,3); ... \end{scope}` 是最典型的写法——裁剪作用于整个 scope 内的元素。

retikz 已有 Scope（`\begin{scope}` 的对应物，编译成 `GroupPrim`）和 alpha.7 引入的 renderer-agnostic 资源表（`Scene.resources` + primitive 经 `{ kind:'resourceRef', id }` 引用，`<defs>` 物化只在 SVG adapter）。`SceneResource` 的类型注释当初就预留了"后续 clip 加 `{ kind:'clip' }` 分支"。所以 clip 的落点很清楚：Scope 挂一个裁剪区，compile 把裁剪区去重成 `ClipResource` 进同一张资源表、给 scope 的 `GroupPrim` 挂 `clipRef`，adapter 把 `ClipResource` 物化成 `<clipPath>`、把 `clipRef` 物化成 `clip-path="url(#id)"`。

核心约束（评审 P1，alpha.7–9 共同遵守）：**ScenePrimitive 渲染无关**——core 不允许产 SVG-only 的 `<clipPath>`，必须产 renderer-agnostic 的资源 + ref，物化只在 adapter。

## 选项

### A. Scope 挂结构化裁剪区 `ClipSpec`，compile 产 ClipResource + GroupPrim.clipRef（**推荐**）

```ts
// ir/clip.ts —— 裁剪区：4 种结构化形状，纯数值 JSON（无 SVG path 迷你语言）
ClipSpecSchema = z.discriminatedUnion('kind', [
  { kind: 'rect',    x, y, width(>0 finite), height(>0 finite) },
  { kind: 'circle',  cx, cy, r(>0 finite) },
  { kind: 'ellipse', cx, cy, rx(>0 finite), ry(>0 finite) },
  { kind: 'polygon', points: [number, number][] (≥3, 每点 finite) },
]);

// ir/scope.ts —— Scope 加可选 clip 字段
clip?: ClipSpec

// DSL：<Scope clip={{ kind:'circle', cx:0, cy:0, r:80 }}> ... </Scope>
```

- compile：scope 分支构 `GroupPrim` 时，若 `child.clip` 存在 → 调 clip 登记表 `resolve(clip)` 去重派稳定 id（`clip-1` / `clip-2`…）→ `group.clipRef = id`；裁剪区坐标按 Scene precision round，与 paint 资源同一张 `Scene.resources` 表合并输出。
- 裁剪区坐标系 = **scope 局部坐标系**（与 scope children 同一帧）：SVG `<g transform>` 先建立局部用户空间，`clip-path`（`clipPathUnits=userSpaceOnUse`）与 children 都在这个局部空间里解释——直觉一致，对齐 TikZ scope 内 `\clip` 用 scope 局部坐标。
- 渲染无关：core 只产 `ClipResource = { kind:'clip', id, shape }`；adapter 物化 `<clipPath>` 内对应 `<rect>`/`<circle>`/`<ellipse>`/`<polygon>`，并把 `GroupPrim.clipRef` 物化成 `<g clip-path="url(#id)">`。
- 4 种形状全是纯数值字段，不发明 SVG path 命令语法，LLM 直生成友好；`polygon` 兜底任意直边区域。

### B. clip 接受任意 path 命令序列（move/line/cubic/arc/close）

```ts
{ kind: 'path', commands: PathCommandSchema[] }   // 需为 IR 新发明一套 path-command zod
```

更通用（含贝塞尔曲线裁剪），但要为 IR 引入一套 path-command 迷你语法（现有 IR 只有"step"层，PathCommand 是 primitive 层无 zod），blast radius 大、LLM 生成易错、与"纯数值 JSON"取向相悖。**否决**：v0.2 用 A 的 4 形状覆盖绝大多数；任意曲线裁剪推迟。

### C. clip 直接在 react adapter 用 SVG `<clipPath>`，core 零改动

违反 P1 渲染无关契约（core 产物泄漏 SVG 概念 / Scene 不自包含裁剪信息，Canvas/PDF adapter 无从复刻）。**否决**。

## 决策：A

理由：

1. 复用 alpha.7 资源表 + ref 机器（去重 / 稳定 id / adapter 物化边界），与 paint 同构，架构一致、Scene 自包含、renderer-agnostic。
2. Scope 级裁剪是 TikZ `\begin{scope}\clip` 的直接对应，是裁剪最主流的用法；scope→GroupPrim 是天然的 clip 载体。
3. 4 种结构化形状纯数值 JSON，AI-first 友好；不发明 path 迷你语言，控制 blast radius。

## 待决策点

- **作用域只到 Scope 级**：clip 只挂 Scope（→ GroupPrim.clipRef）。单个 Node / Path / primitive 级裁剪**不做**——用 `<Scope clip>` 包一层即可（文档给出包裹范式）。倾向：v0.2 只 Scope 级，明确写进"不在本 ADR 范围"。
- **裁剪区形状集 = rect / circle / ellipse / polygon**：覆盖取景窗、圆形/椭圆遮罩、任意直边区域；任意贝塞尔曲线裁剪路径推迟。
- **clip 与 transformed scope 内 path 的交互**：retikz 现有行为——**带 transforms 的 scope** 内声明的 path 会被 hoist 到顶层 primitives（不进该 scope 的 GroupPrim），因此不被该 scope 的 clipRef 裁剪；**无 transforms 的 scope** 内 path 留在 GroupPrim 内、正常被裁。这是既有 compile 架构 quirk，本 ADR 不改它，写进文档与"已知限制"。
- **id 命名空间**：clip 资源用 `clip-N`，与 paint 的 `paint-N` 共存于 `Scene.resources`，不撞。react adapter 加独立 `clipIdFor` 前缀（与 `paintIdFor` 并列，复用同一 `useId` 基）。
- **空 / 退化裁剪区**：rect/circle/ellipse 的尺寸字段 `.positive().finite()` schema 守门；polygon 少于 3 点 schema 拒；compile（手搓 IR 绕过 schema）再加 finite 守卫，非法即 throw（清晰错），守 Scene JSON 可序列化。

## DSL 表面

```tsx
// 圆形取景窗：只露出大网格的一个圆形区域
<Layout width={320} height={320}>
  <Scope clip={{ kind: 'circle', cx: 0, cy: 0, r: 120 }}>
    <Path stroke="#cbd5e1" thickness="thin">{/* 一大片网格 */}</Path>
    <Node id="c" position={[0, 0]} fill="#2563eb" textColor="white">clip</Node>
  </Scope>
</Layout>
```

## 测试设计

`packages/core/tests/compile/clip.test.ts` + `packages/core/tests/ir/clip.schema.test.ts` + `packages/react/tests/render/clipDefs.test.tsx` 覆盖：

- schema：4 形状各自接受 / 退化拒绝
- compile：clip → ClipResource 进 resources、GroupPrim.clipRef 挂上、相同 clip 去重为一个资源、不同 clip 各自资源
- compile：无 transforms scope 带 clip 也产 GroupPrim（不被 prune）
- render：ClipResource → `<clipPath>` 子元素正确、GroupPrim.clipRef → `<g clip-path>`
- finite 守卫：手搓非 finite 坐标 throw

具体 case 见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/scope.ts`：Scope 加可选 `clip` 字段（零破坏，向后兼容）。
- `packages/core/src/primitive/paint.ts`：`SceneResource` 由单一 `{kind:'paint'}` 升为 `PaintResource | ClipResource` 联合（`kind` 已是判别字段，消费方按 kind 分流；现有 paint 消费不破）。
- `GroupPrim` 加可选 `clipRef`——Scene 输出多一个可选字段，旧消费方忽略即可。
- react：`PaintDefs` 旁边加 `ClipDefs`；`renderPrim` group 分支加 `clip-path`；`RenderContext` 加 `clipRefUrl`；`Layout` 加 `clipIdFor` + 资源按 kind 分流。
- 文档：Scope 页 / 新建 reference 或组件页补 clip demo + API；写明"Scope 级、4 形状、transformed scope 内 path 不被裁"限制。

## 不在本 ADR 范围

- 单 Node / Path / primitive 级 clip（用 `<Scope clip>` 包裹替代）。
- 任意贝塞尔曲线裁剪路径（`{ kind:'path', commands }`，选项 B）。
- 多区域并集 / 求差裁剪（`clipPath` 多子元素是并集，但本 ADR 只单形状）。
- clip-rule（nonzero / evenodd）、clip 与 mask（软遮罩 / alpha）的区分。
- 裁剪区引用某已存在 shape/node 的几何（`clip to node A`）。

---

## 实现契约（必填）

### Level

`red`——动 `packages/core/src/ir/**`（新建 clip.ts + 改 scope.ts）、`packages/core/src/compile/**`（新建 clip 登记表 + 改 compile.ts）、`packages/core/src/index.ts`（导出新类型）。跨级含 yellow（react render/kernel）+ green（docs）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/clip.ts` | 新建 | `ClipSpecSchema` | `discriminatedUnion('kind', [rect, circle, ellipse, polygon])` | — | 裁剪区：4 种结构化形状之一 |
| `ir/clip.ts` | 新建 | `rect` 分支 | `{ kind:'rect', x:finite, y:finite, width:finite>0, height:finite>0 }` | — | 矩形裁剪区（scope 局部坐标） |
| `ir/clip.ts` | 新建 | `circle` 分支 | `{ kind:'circle', cx:finite, cy:finite, r:finite>0 }` | — | 圆形裁剪区 |
| `ir/clip.ts` | 新建 | `ellipse` 分支 | `{ kind:'ellipse', cx:finite, cy:finite, rx:finite>0, ry:finite>0 }` | — | 椭圆裁剪区 |
| `ir/clip.ts` | 新建 | `polygon` 分支 | `{ kind:'polygon', points: tuple[finite,finite][] (min 3) }` | — | 多边形裁剪区（≥3 点） |
| `packages/core/src/ir/scope.ts` | 加字段 | `clip` | `ClipSpecSchema.optional()` | `undefined` | scope 裁剪区；裁其内所有子元素（scope 局部坐标） |
| `packages/core/src/primitive/clip.ts` | 新建（type） | `ClipShape` / `ClipResource` | `ClipResource = { kind:'clip', id, shape: ClipShape }` | — | 渲染无关裁剪资源（adapter 物化 `<clipPath>`） |
| `packages/core/src/primitive/paint.ts` | 改 type | `SceneResource` | `PaintResource \| ClipResource` | — | 资源表升为 paint+clip 联合（按 kind 分流） |
| `packages/core/src/primitive/group.ts` | 加字段（type） | `clipRef` | `string?` | `undefined` | 指向 `Scene.resources` 里 ClipResource 的 id |

> `ClipSpec`（IR、zod）与 `ClipShape`（primitive、纯 type）形状一致；IR 是输入校验面，primitive 是 Scene 输出数据面。允许两处定义同形（与 paint 的 `IRPaintSpec` ↔ 资源 `spec` 同模式）。

### 文件 scope

- `packages/core/src/ir/clip.ts`（新建）
- `packages/core/src/ir/scope.ts`（改：加 clip 字段 + import）
- `packages/core/src/ir/index.ts`（改：导出 ClipSpecSchema / IRClipSpec）
- `packages/core/src/primitive/clip.ts`（新建：ClipShape / ClipResource type）
- `packages/core/src/primitive/paint.ts`（改：SceneResource 升联合，原对象改名 PaintResource）
- `packages/core/src/primitive/group.ts`（改：GroupPrim 加 clipRef）
- `packages/core/src/primitive/index.ts`（改：导出 clip type）
- `packages/core/src/primitive/scene.ts`（改：re-export 同步）
- `packages/core/src/compile/clip.ts`（新建：createClipRegistry 去重派 id + finite 守卫）
- `packages/core/src/compile/compile.ts`（改：建 clip 登记表 + scope 分支挂 clipRef + 合并 resources + scope 带 clip 不 prune）
- `packages/core/src/index.ts`（改：导出 ClipSpecSchema / IRClipSpec / ClipShape / ClipResource）
- `packages/core/tests/ir/clip.schema.test.ts`（新建）
- `packages/core/tests/compile/clip.test.ts`（新建）
- `packages/core/tests/compile/clip.adversarial.test.ts`（新建，Stage 3）
- `packages/react/src/render/clipDefs.tsx`（新建：ClipDefs 物化 `<clipPath>`）
- `packages/react/src/render/renderPrim.tsx`（改：group 分支加 clip-path + RenderContext 加 clipRefUrl）
- `packages/react/src/kernel/Layout.tsx`（改：clipIdFor + 资源按 kind 分流 + ClipDefs 挂入 + context 传 clipRefUrl）
- `packages/react/src/kernel/Step.tsx` 或 Scope 组件（改：Scope 透传 clip prop）
- `packages/react/src/index.ts`（改：re-export ClipSpec 类型如需要）
- `packages/react/tests/render/clipDefs.test.tsx`（新建）
- `apps/docs/src/contents/core/components/layout/scope/`（改 mdx + 新 demo）
- `apps/docs/src/data/changelog.ts` / `core.ts` / i18n（收尾阶段）

### 测试象限（≥ 9）

**Happy（≥3）**：
- `clip-rect-resource`：`<Scope clip={rect}>` → resources 含 `{kind:'clip', shape:{kind:'rect',...}}`，scope 的 GroupPrim.clipRef = 该 id。
- `clip-circle-render`：ClipResource(circle) → `<clipPath>` 内 `<circle cx cy r>`，`<g clip-path="url(#...)">`。
- `clip-dedup`：两个 scope 用结构相同 clip → 一个 ClipResource、两个 GroupPrim 同 clipRef。

**边界（≥2）**：
- `clip-no-transform-scope-not-pruned`：无 transforms / 无 id 但带 clip 的 scope 仍产 GroupPrim（携 clipRef），不被 prune。
- `clip-polygon-3pts`：polygon 恰 3 点接受 → `<polygon points>`。

**错误路径（≥2）**：
- `clip-rect-nonfinite-throws`：手搓 `{kind:'rect', width:Infinity}` → compile throw（含清晰信息），不泄漏进 Scene。
- `clip-polygon-too-few`：polygon 2 点 → schema 拒 / compile throw。

**交互（≥2）**：
- `clip-with-paint`：同一 scene 既有 paint 资源又有 clip 资源 → `Scene.resources` 两类共存、id 不撞（paint-N / clip-N）。
- `clip-transformed-scope-path-hoist`：带 transforms 的 scope 内 path 被 hoist 到顶层、不进 GroupPrim（记录既有限制；断言 path primitive 不在该 group.children 内）。

### 依赖的现有元素

- `SceneResource` / `createPaintRegistry`（`primitive/paint.ts` / `compile/paint.ts`）——扩展：资源表升联合、仿照建 clip 登记表。
- `GroupPrim`（`primitive/group.ts`）——扩展：加 clipRef。
- Scope 编译（`compile/compile.ts` scope 分支 + `isPrunable`）——修改：带 clip 不 prune、挂 clipRef。
- react `PaintDefs` / `RenderContext` / `Layout.paintIdFor`（render/paintDefs.tsx / renderPrim.tsx / kernel/Layout.tsx）——扩展：并列加 clip 物化。
- `makeRound`（`compile/precision.ts`）——仅引用：clip 坐标 round。
