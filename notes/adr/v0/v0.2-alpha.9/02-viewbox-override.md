# ADR-02：自定义 viewBox override（IR 根可选 viewBox 覆盖自动算范围）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0 roadmap §v0.2](../../../plans/v0/roadmap.md) · [tikz-gap-analysis §6 Scene](../../../analysis/2026-05-07-tikz-gap-analysis.md) · [v0.2 计划 §alpha.9](../../../plans/v0/v0.2.md)

## 背景

retikz 的 `Scene.layout`（`{ x, y, width, height }`）目前**全自动**：compile 收集所有点（node 4 角、label 外接点、path 端点）算 AABB + padding，react `formatViewBox(layout)` 拼成 `<svg viewBox>`。没有逃生口。

但有几类需求自动算覆盖不了：① **固定尺寸画布**——不管内容多大都用一个定死的视框；② **故意裁剪**——只展示内容的某一块（配合 clip）；③ **多图对齐**——几张图共用同一 viewBox 才能并排比较 / 做动画帧；④ **排除溢出**——某些装饰性元素不希望撑大 viewBox。TikZ 用 `\useasboundingbox` 显式指定 bounding box 覆盖自动估算。

计算机器现成（core `computeLayout`、react `formatViewBox`），只缺一个"有显式值就跳过自动算"的口子。

## 选项

### A. IR 根 `SceneSchema` 加可选 `viewBox`，compile 有值则跳过 computeLayout（**推荐**）

```ts
// ir/scene.ts —— 根 Scene 加可选 viewBox
ViewBoxSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
SceneSchema = z.object({ version, type, children, viewBox: ViewBoxSchema.optional() });

// compile.ts
layout: ir.viewBox ? roundViewBox(ir.viewBox) : computeLayout(allPoints, padding, round)

// DSL：<Layout viewBox={{ x:-100, y:-100, width:200, height:200 }}> ... </Layout>
```

- viewBox 是 IR 根的一个可选字段——**IR 自包含**（AI 生成的图能自带视框、存盘 round-trip 不丢、多图对齐时各 IR 显式写同一 viewBox）。
- 字段形态 = 命名对象 `{ x, y, width, height }`，与 `Layout` 同构、与 svg viewBox 四元组语义一一对应；LLM 友好（具名 > 顺序敏感的四元数组）。
- override 是**绝对**的：有 viewBox 则 `Scene.layout` 直接用它，**padding 不再叠加**（用户给的是精确边界）。
- 加可选字段，`version` 不变（非破坏；旧 IR 无此字段照常 parse）。

### B. `CompileOptions.viewBox` 编译选项（不进 IR）

把 viewBox 当纯渲染选项放 `CompileOptions`。好处：IR schema / version 零改动。坏处：**IR 不自包含**——存盘再 load 丢 viewBox、AI 生成的图无法自描述视框，逆 AI-first 原则。**否决**（presentation 与 content 的边界这里更偏 content：视框是图的一部分语义）。

### C. tuple `[x, y, w, h]` / `{ min, max }` / path-as-bbox

tuple 顺序敏感、LLM 易错位；`{min,max}` 要额外换算 w/h；path-as-bbox（`\useasboundingbox` 式用某 path 当框）灵活但要先 resolve 那条 path 的 bbox、blast radius 大。**否决形态 C**；只取 A 的具名四字段，path-as-bbox 推迟。

## 决策：A

理由：

1. IR 自包含、AI-first（图自带视框、round-trip 稳定、多图对齐显式可写）。
2. 具名 `{x,y,width,height}` 与 `Layout` / svg viewBox 同构，LLM 友好、零换算。
3. 加可选字段非破坏，复用现成 `computeLayout` / `formatViewBox`，blast radius 最小。

## 待决策点

- **形态 = 具名对象 `{ x, y, width, height }`**：不用 tuple / `{min,max}` / path-as-bbox。
- **override 绝对、padding 不叠加**：有 viewBox 即精确边界，忽略 `CompileOptions.padding`。文档写明。
- **width / height 必须 `>0 finite`，x / y `finite`**：schema 守门；compile 收手搓 IR 时 viewBox 字段同样过 finite/正 守卫（绕过 schema 的手搓 / LLM IR 是唯一真实关口），非法即 throw 清晰错，守 Scene round-trip。
- **react `<Layout viewBox>` prop → 写进 IR 根**：Layout 组件把 `viewBox` prop 注入构造出的 IR 的根（`ir.viewBox`）后再 compile；用户直接传 `ir` prop 且自带 viewBox 时尊重 IR 内的值（prop 缺省不覆盖）。冲突时 prop 优先（显式 > IR 内置），写进实现契约。
- **viewBox 与 clip 正交**：viewBox 改视框范围（看多大），clip 裁元素（露哪块）；两者独立可叠加。

## DSL 表面

```tsx
// 固定 200×200 视框，不随内容缩放；内容只画了一个小圆，但视框定死
<Layout width={240} height={240} viewBox={{ x: -100, y: -100, width: 200, height: 200 }}>
  <Node id="o" position={[0, 0]} shape="circle" minimumSize={40} fill="#2563eb" />
  <Node id="c" position={[60, 60]} shape="circle" minimumSize={20} fill="#f59e0b" />
</Layout>
```

## 测试设计

`packages/core/tests/ir/scene-viewbox.schema.test.ts` + `packages/core/tests/compile/viewbox-override.test.ts` + `packages/react/tests/kernel/Layout.viewbox.test.tsx` 覆盖：

- schema：合法 viewBox 接受、退化（width≤0 / 非 finite）拒
- compile：有 viewBox → Scene.layout 等于它（round 后）、忽略 padding；无 viewBox → 回退 computeLayout（既有行为不变）
- react：`<Layout viewBox>` → `<svg viewBox="x y w h">`、prop 与 ir 内置的优先级

具体 case 见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/scene.ts`：SceneSchema 加可选 `viewBox`（零破坏）；`IR` 类型多一个可选字段。
- `packages/core/src/compile/compile.ts`：`layout` 计算加 override 分支 + finite 守卫。
- react `Layout`：加 `viewBox` prop，注入 IR 根。
- 文档：Layout 概览页补 viewBox demo + API 行（固定尺寸 / 配合 clip 裁剪 / 多图对齐）。

## 不在本 ADR 范围

- path-as-bbox（`\useasboundingbox` 用某条 path 的 bbox 当视框）。
- `{ min, max }` / tuple 形态。
- 单 Scope 级 viewBox（只 IR 根 / 顶层 Layout 一个视框）。
- 与 width/height（svg 渲染尺寸属性）的耦合——它们正交，本 ADR 不动 width/height 语义。

---

## 实现契约（必填）

### Level

`red`——动 `packages/core/src/ir/scene.ts`、`packages/core/src/compile/compile.ts`、`packages/core/src/index.ts`（导出 ViewBoxSchema / 类型）。跨级含 yellow（react kernel/Layout.tsx）+ green（docs）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/scene.ts` | 新建 schema | `ViewBoxSchema` | `z.object({ x:finite, y:finite, width:finite>0, height:finite>0 })` | — | 显式视框，覆盖自动算的 layout 范围 |
| `packages/core/src/ir/scene.ts` | 加字段 | `viewBox` | `ViewBoxSchema.optional()` | `undefined` | 可选；有值则 Scene.layout 用它（忽略 padding），无值回退自动 AABB |

> `version` 保持 `literal(1)`（加可选字段非破坏，不 bump）。

### 文件 scope

- `packages/core/src/ir/scene.ts`（改：ViewBoxSchema + SceneSchema.viewBox + 导出 IRViewBox 类型）
- `packages/core/src/ir/index.ts`（改：re-export）
- `packages/core/src/compile/compile.ts`（改：layout override 分支 + finite 守卫）
- `packages/core/src/index.ts`（改：导出 ViewBoxSchema / IRViewBox）
- `packages/core/tests/ir/scene-viewbox.schema.test.ts`（新建）
- `packages/core/tests/compile/viewbox-override.test.ts`（新建）
- `packages/core/tests/compile/viewbox-override.adversarial.test.ts`（新建，Stage 3）
- `packages/react/src/kernel/Layout.tsx`（改：viewBox prop 注入 IR 根）
- `packages/react/tests/kernel/Layout.viewbox.test.tsx`（新建）
- `apps/docs/src/contents/core/components/layout/overview/`（改 mdx + 新 demo）
- `apps/docs/src/data/changelog.ts` / i18n（收尾阶段）

### 测试象限（≥ 9）

**Happy（≥3）**：
- `viewbox-override-used`：`ir.viewBox = {x:-100,y:-100,width:200,height:200}` → `Scene.layout` 严格等于它。
- `viewbox-absent-fallback`：无 viewBox → `Scene.layout` = computeLayout（既有 AABB+padding 行为，回归断言）。
- `viewbox-react-prop`：`<Layout viewBox={...}>` → `<svg viewBox="-100 -100 200 200">`。

**边界（≥2）**：
- `viewbox-ignores-padding`：同一 IR 给 viewBox + `padding:50` → layout 用 viewBox，padding 不叠加。
- `viewbox-rounded`：viewBox 含多位小数 → 按 Scene precision round。

**错误路径（≥2）**：
- `viewbox-zero-width-rejected`：`width:0` → schema 拒。
- `viewbox-nonfinite-throws`：手搓 `{width:Infinity}` 经 compileToScene → throw 清晰错（不泄漏 Infinity 进 Scene）。

**交互（≥2）**：
- `viewbox-prop-over-ir`：`<Layout ir={带viewBox的IR} viewBox={另一个}>` → prop 优先。
- `viewbox-with-content-overflow`：内容超出 viewBox 范围时 layout 仍只用 viewBox（不被内容撑大）。

### 依赖的现有元素

- `SceneSchema` / `IR` / `CURRENT_IR_VERSION`（`ir/scene.ts`）——扩展：加可选 viewBox 字段。
- `computeLayout`（`compile/layout.ts`）——仅引用：无 viewBox 时回退。
- `makeRound`（`compile/precision.ts`）——仅引用：viewBox 坐标 round。
- react `formatViewBox` / `Layout`（render/viewBox.ts / kernel/Layout.tsx）——扩展：prop 注入。
