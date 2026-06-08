# ADR-04：三包 DSL + 文档露出（cartesian1D / polar1D / ternary2D 表面 + 端到端验收）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 frame 角色泛化](./01-coordinate-frame-roles.md) / [ADR-02 cartesian1D](./02-cartesian1d.md) / [ADR-03 ternary2D](./03-ternary2d.md)（IR + lowering 全就位）· 前身：[alpha.4 ADR-05 bindings-dsl](../v0.1-alpha.4/05-bindings-dsl.md)

## 背景

[ADR-01](./01-coordinate-frame-roles.md)~[03](./03-ternary2d.md) 把 cartesian1D / ternary2D 的 IR + lowering 落齐，但**只在 `@retikz/plot` 核心内部**——React `<Plot>` / vanilla builder / 文档站还无法用（沿 alpha.4 的 milestone 粒度 lockstep：坐标系在 DSL 层有意义须等 coordinate + encoding 角色 + guide 都就位，集中本 ADR 收口）。本 ADR 把两套新坐标系 + 角色化位置通道露出到三包用户表面 + 文档，并做端到端验收，alpha.9 才「可交付」。

现状缺口：

- **React `CoordinateInput`** 仅 `'polar2D'` | polar 对象（`buildPlotSpec.ts`），无 cartesian1D / ternary2D。
- **React `PointMarkProps`** x/y 必填、无 a/b/c（`marks.tsx`）——ADR-01/03 已把 schema 侧 x/y 转可选 + 加 a/b/c，React props 须对等。
- **vanilla** 同缺。
- **文档站** 坐标系页（`grammar/coordinate`）只有 cartesian/polar，无 1D / ternary。

## 决策：`CoordinateInput` 扩 cartesian1D / ternary2D，`PointMarkProps` x/y 转可选 + 加 a/b/c，三角/1D 轴表面 + docs；端到端验收

**(1) React 表面**：
- `CoordinateInput` += `'cartesian1D'` | `{ type:'cartesian1D', orientation? }` | `'polar1D'` | `{ type:'polar1D', radius?, startAngle?, endAngle? }` | `'ternary2D'`（ternary 暂无额外几何配置，字符串够用）。
- `PointMarkProps`：`x` / `y` 转**可选**（承 ADR-01）+ 加 `a?` / `b?` / `c?`（承 ADR-03，ternary 用）。buildPlotSpec 收集时按 coordinate 组装对应角色 encoding；缺必填角色由 lowering fail-loud（不在 React 层重复校验）。
- guide：`<Axis dimension="a"|"b"|"c" />`（ternary 三角轴）、cartesian1D 复用 `<Axis />`（单维 x）。

**(2) vanilla**：对等 builder / spec 表面（同 react 角色化，字段派生自 core IR 类型，不手维护第二份）。

**(3) 文档**：`grammar/coordinate` 页加 cartesian1D（rug / timeline）+ polar1D（环形 / 周期）+ ternary2D（三元散点）章节 + demo；坐标系总览补三行；双语并行。维度校验（cartesian 非法 dimension fail-loud，修 cross-review P2）顺带在坐标系页提一句「guide dimension 须匹配坐标系」。

**(4) 端到端验收**：rug / timeline（cartesian1D）+ 三元散点（ternary）经 `<Plot>` 真渲染出 SVG；三包 tsc + 测试 + lint 全绿；docs demo 可渲染。

理由：

1. **milestone 收口**：ADR-01~03 是内部 WIP（不发布），本 ADR 把三包表面 + 文档一次性同步，alpha.9 才四方一致、可交付（同 alpha.4 ADR-05）。
2. **props 角色化对等 schema**：x/y 可选 + a/b/c 是 ADR-01/03 schema 契约的表面投影，React/vanilla 必须跟上，否则 ternary 在 DSL 层不可用。
3. **适配器对等**：react + vanilla 两套都落（develop-implement「适配器对等」硬约束）。

## 待决策点 🔻

- **cartesian1D 字符串 vs 对象**：`orientation` 默认 horizontal 时字符串 `'cartesian1D'` 够用，需垂直时用 `{ type:'cartesian1D', orientation:'vertical' }`。倾向**字符串 + 对象双形态**（同 polar2D）。
- **PointMark a/b/c 与 x/y 互斥提示**：cartesian 给 a/b/c、ternary 给 x/y 属误用——React 层是否提前提示，还是全交 lowering fail-loud？倾向**全交 lowering**（单一真源校验、React 不重复），文档讲清各坐标系用哪组通道。
- **是否新增 rug/timeline 专用 sugar**：还是直接 `<PointMark>` + `coordinate="cartesian1D"`？倾向**直接组合**（不新增 mark；rug = point 在 cartesian1D 的俗名，符合「同 mark × 坐标系」理念），文档用「rug」作 demo 标题即可。

## DSL 表面

```tsx
// rug（cartesian1D + point）
<Plot data={samples} coordinate="cartesian1D"><PointMark x="value" /></Plot>

// 环形 / 周期点（polar1D + point，24h 绕圆）
<Plot data={events} coordinate="polar1D"><PointMark x="hourOfDay" /></Plot>

// 三元散点（ternary2D + point，a/b/c）
<Plot data={soils} coordinate="ternary2D">
  <PointMark a="sand" b="silt" c="clay" color="region" />
</Plot>
```

## 测试设计

`packages/plot/react/tests/components/buildPlotSpec.test.tsx`（扩：cartesian1D / ternary CoordinateInput → 正确 IR；PointMark a/b/c 组装）+ vanilla 对应测试。docs demo 经离线编译 / 渲染验证。见「测试象限」。

## 影响

- **lowering / IR**：无（ADR-01~03 已落）；本 ADR 仅表面 + 文档。
- **react**：`buildPlotSpec.ts`（CoordinateInput 扩 + a/b/c 组装）、`marks.tsx`（PointMarkProps x/y 可选 + a/b/c）、`index.ts` 导出。
- **vanilla**：对应 builder / spec 表面。
- **文档站**：`grammar/coordinate` 页 + cartesian1D / ternary demo + 坐标系总览 + i18n（若新页型）；双语。
- **对外 API**：`coordinate="cartesian1D"|"ternary2D"`、`PointMark` x/y 可选 + a/b/c props——纯新增（x/y 从必填转可选是放宽，不破既有 cartesian/polar 用法）。

## 不在本 ADR 范围

- **新坐标系的 IR / lowering** → [ADR-01](./01-coordinate-frame-roles.md)~[03](./03-ternary2d.md)。
- **cartesian1D/ternary 的 line/area/interval 表面** → 对应坐标系 ADR 顺延（mark 矩阵 point 为主）。
- **rug/timeline/ternary 专用 sugar 组件** → 不做（直接 point × 坐标系）。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/plot/react/src/components/**`（authoring 表面）+ vanilla + docs。无 plot core IR 改动（已在 01~03）。

### Schema 改动

无 IR schema 字段增删（ADR-01/03 已落）。本 ADR 改 **React/vanilla props 表面 + 文档**，props 类型派生自 core IR。

### 文件 scope

- `packages/plot/react/src/components/buildPlotSpec.ts`（改：`CoordinateInput` 扩 cartesian1D/ternary2D + a/b/c 组装 + coordinate IR 装配）
- `packages/plot/react/src/components/marks.tsx`（改：`PointMarkProps` x/y 可选 + a/b/c）
- `packages/plot/react/src/components/index.ts`（按需导出类型）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（改）
- `packages/plot/vanilla/src/**`（改：对等坐标系 + 角色通道表面）+ vanilla 测试
- `apps/docs/src/contents/plot/grammar/coordinate/**`（坐标系页 + cartesian1D/ternary demo + data）
- `apps/docs/src/data/plot.ts` / `i18n/**`（若新章节需注册）

### 测试象限

**Happy path**：
- `cartesian1D CoordinateInput`：`coordinate="cartesian1D"` → IR coordinate.type=cartesian1D
- `ternary CoordinateInput`：`coordinate="ternary2D"` + PointMark a/b/c → IR a/b/c encoding
- `cartesian1D 对象 orientation`：`{ type:'cartesian1D', orientation:'vertical' }` → IR orientation

**边界**：
- `cartesian1D 只 x`：PointMark 只 x（无 y）→ 合法 IR（x/y 可选）
- `cartesian 仍 x/y`：默认 cartesian + x/y → 回归不变

**错误路径**：
- `ternary 缺 c（端到端）`：ternary + PointMark 只 a/b → lowering fail-loud（React 不重复校验，错误透传）
- `cartesian 给 a/b/c`：误用 → lowering fail-loud

**交互**：
- `rug 端到端渲染`：cartesian1D + point → 真出 SVG 刻记
- `三元散点端到端渲染`：ternary + point + color → 真出三角内着色散点
- `vanilla 对等`：vanilla builder 同 spec → 同 IR（react/vanilla parity）

### 依赖的现有元素

- `CoordinateInput` / `buildPlotSpec` / `toPolarConfig`（`react/.../buildPlotSpec.ts`）—— 扩展（加 cartesian1D/ternary 装配）
- `PointMarkProps` / `PointMark`（`react/.../marks.tsx`）—— 扩展（x/y 可选 + a/b/c）
- cartesian1D / ternary IR + lowering（[ADR-02](./02-cartesian1d.md) / [ADR-03](./03-ternary2d.md)）—— 消费（表面装配进对应 IR）
- vanilla builder（`packages/plot/vanilla/src`）—— 扩展（对等表面）
- coordinate 文档页（`apps/docs/.../grammar/coordinate`）—— 扩展（cartesian1D/ternary 章节 + demo）
- docs-doc-principle / docs-doc-component / docs-doc-example SKILL —— 文档流程
