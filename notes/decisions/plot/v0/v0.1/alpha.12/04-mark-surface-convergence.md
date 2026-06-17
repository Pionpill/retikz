# ADR-04：mark 公开表面收敛 —— react/vanilla 组件改名 + 合并，build-plot-spec 映射到抽象 IR，文档按数据几何重组

- 状态：Proposed
- 决策日期：2026-06-17
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [前置：本里程碑 ADR-03 抽象 mark 模型](./03-mark-abstraction-registry.md) · [plot v0.1 roadmap §三包 lockstep](../roadmap.md) · [docs-doc-principle skill](../../../../../../.agents/skills/docs-doc-principle/SKILL.md)

> ⚠️ 草案：本 ADR 由 2026-06-17 设计讨论产出，实现契约为 AI 起草建议稿，待人工 review + 红级多 LLM 评审后定稿。
> 本 ADR 是 [ADR-03](./03-mark-abstraction-registry.md) 的表面层配套：ADR-03 把引擎层（`ir/` + `lower/`）收敛为 6 个抽象 mark + registry，本 ADR 把 react/vanilla authoring 表面与文档对齐到同一抽象，**与 ADR-03 同里程碑、依赖 ADR-03 先落**。

## 背景

ADR-03 把 IR mark 收敛为 6 个抽象数据几何 mark（`point`/`path`/`region`/`interval`/`link`/`reference`），删 `sector`/`rect`/`text`、改 `line`/`area`/`rule`/`ribbon`。但公开 authoring 表面仍是旧形态：

- **react 组件按图表形状命名**：`@retikz/plot-react` 导出 `<BarMark>`/`<LineMark>`/`<AreaMark>`/`<RectMark>`/`<RuleMark>`/`<TextMark>`/`<RibbonMark>`/`<PointMark>`（`react/src/components/marks.tsx`）。其中 `<BarMark>` 已身兼多职（`x/y` 柱、`angle` 饼 / 环、`x0/x1` histogram、`stack` 堆叠），`build-plot-spec` 据 props 装配进旧 `interval`/`sector` IR；`<RectMark>` → 旧 `rect` IR。
- **vanilla / 文档同源旧名**：`renderPlot` 纯 spec 驱动（随 IR 自动跟随），但 docs（`apps/docs`）按图表形状（bar / pie / heatmap / line / area）组织 grammar 页，与「抽象数据几何」分类错位。

v0.1「三包 lockstep」硬原则要求 plot 本体、react、vanilla、docs 同一改动集交付。IR 已变（ADR-03），表面必须同步，否则 `<Plot>` 内省装配会产无效 spec。0.x 未发布、不留别名。

## 决策：react/vanilla 组件对齐 6 抽象 mark，build-plot-spec 把便捷 props 映射到抽象 IR，文档按数据几何重组

### (1) react 组件：6 个抽象 mark 组件

| 新组件 | 取代 | 说明 |
| --- | --- | --- |
| `<PointMark>` | `PointMark` + **`<TextMark>`** | 加 `text` / `format` / `dx` / `dy` props：给了 `text` → 无边框文本 glyph、否则散点 |
| `<PathMark>` | `<LineMark>` | 1D 轨迹（props 不变：x/y/order/series/closed/color/label…） |
| `<RegionMark>` | `<AreaMark>` | 2D 区域（props 不变：x/y/order/series/baseline/closed/color/label…） |
| `<IntervalMark>` | **`<BarMark>` + `<RectMark>`** | 统一区间：`x/y`（柱）、双 band（heatmap）、`series`（dodge 子带）、显式 `bounds` props；堆叠 / 饼累积 / histogram 经 `<Transform>` + `extent` bounds 表达，**不自动装配 transform**（一字开关归 chart） |
| `<LinkMark>` | `<RibbonMark>` | source→target 关系（props 不变：sourceX/Y、targetX/Y、value…） |
| `<ReferenceMark>` | `<RuleMark>` | 参考标注（props 不变：x/y/xTo/yTo/extent…） |

删 `<TextMark>`（并入 `<PointMark>`）、`<RectMark>`（并入 `<IntervalMark>`）；`<BarMark>` 改名 `<IntervalMark>`。

### (2) build-plot-spec：便捷 props → 抽象 IR（纯几何糖，不自动装配 transform）

`build-plot-spec` 把 react 便捷 props **1:1 映射到 ADR-03 抽象 IR**，**不产生数据 transform 副作用**——这是 plot-react「底层 grammar authoring」与 chart「friendly preset」的硬分界，也消除 ADR-03「arrangement 不进 plot」与本 ADR 的潜在矛盾：凡是要**自动注入 transform** 的便捷开关（`stack` 自动加 stack transform、`angle` 自动累积、`percent` 归一化）一律归 v0.2 chart，**不进 plot-react**。

plot-react 保留的便捷 props（皆为纯几何 / 编码糖，无 transform 副作用）：

- `<IntervalMark x y>` → `bounds` 省略（引擎推断 band×span）。
- `<IntervalMark x y color>` 双 band → `bounds: { x: band, y: band }`（heatmap，取代旧 `<RectMark>`）。
- dodge：`<IntervalMark series>` → `bounds.x: band{group:series}`（band 切子带，纯几何、无 transform）。
- 显式区间：直接传 `bounds` prop，或扁平糖指向**已存在字段**的 `extent`——堆叠 `bounds.y=extent('y0','y1')`、histogram `bounds.x=extent('binStart','binEnd')`、饼 `bounds.x=extent('y0','y1')`+`bounds.y=full`。这些字段须由用户先用 `<Transform>`（stack / bin / normalize / derive-interval）产出，plot-react 不替用户加 transform。
- `<PointMark text format dx dy>` → `encoding.text`（+ Node 微调）。

> 由此，v0.1 用 plot-react 画堆叠柱 / 饼 / histogram = 显式 `<Transform>` + interval `bounds` props；一字开关（`stacked` / `grouped` / `percent`）的开箱即用体验由 v0.2 `<Chart>` 提供。**与 ADR-03「arrangement 不进 plot」严格一致**——plot-react 是底层 grammar authoring，无 transform 魔法。

### (3) vanilla + 文档

- `renderPlot` 纯 spec 驱动、随 IR 自动跟随；vanilla 测试更新到新 spec。
- docs grammar 段按**抽象数据几何**重组：point / path / region / interval / link / reference 各自成页；图表形态（bar / pie / heatmap / line / area）保留为示例，但解释改为「X 是抽象 mark 在某坐标系下的实现」（bar = interval × cartesian、pie = interval extent 角界 × polar、heatmap = interval 双 band、line = path × cartesian、area = region）。zh / en 同步、contents + data + i18n 同步。

理由：

1. **三包 lockstep 硬原则**：IR（ADR-03）已变，表面与文档必须同改动集交付，否则用户按旧文档写出与新 IR 不一致的代码（docs-doc-principle 判断口诀）。
2. **便捷 props 是糖、不是平行能力**：`angle`/`stack`/`x0` 等映射到抽象 `bounds`，与手写抽象 IR 等价，不绕开 ADR-03 抽象（AGENTS.md「不造平行机制」）。
3. **文档按数据几何重组兑现抽象**：把「图表类型 = 底层 mark」纠正为「图表类型 = 抽象 mark × coordinate 实现」，用户心智与 grammar 对齐。

## 待决策点 🔻

- **扁平 bounds 糖形态**：显式 `bounds` 用嵌套对象 prop（`bounds={{x,y}}`，与 IR 1:1）还是扁平糖（`xExtent={['y0','y1']}` 等）？倾向先支持嵌套 `bounds` prop（最少糖、与 IR 同形），扁平糖按需补。（注：transform-coupled 开关 `stack`/`angle`/`percent` **不在 plot-react**、归 chart——此点已定、非待决策。）
- **heatmap authoring**：`<IntervalMark>` 双 band 由 `build-plot-spec` 自动推断（同旧 `<RectMark>`），还是需显式 `bounds` props？倾向**自动推断**（x/y 皆 band scale → 双 band），与旧 `<RectMark>` 行为等价。
- **docs grammar 分组落点**：interval 页是否含子页（bar / radial / pie / heatmap 各 SubPage），还是单页多 demo？倾向**单页多 demo 起步**（受 `data/plot.ts` 两层结构约束），增长后再升组。
- **`<TextMark>` 删除 vs 保留薄壳**：倾向**删除**、并入 `<PointMark text>`（0.x 不留别名；标注他 mark datum 仍首选宿主 `label` 通道）。

## DSL 表面

```tsx
// bar / heatmap 同一组件，纯几何糖决定形状（无 transform 副作用）
<Plot data={rows}>
  <IntervalMark x="q" y="sales" />                          {/* bar：bounds 推断 band×span */}
  <Axis dimension="x" /><Axis dimension="y" grid />
</Plot>

<Plot data={rows}>
  <IntervalMark x="day" y="hour" color="v" />              {/* heatmap：双 band 自动推断 */}
</Plot>

// 饼 / 堆叠 = 底层 grammar：显式 <Transform> + interval extent/full bounds（一字 angle/stack 归 v0.2 chart）
<Plot data={rows} coordinate={{ type: 'polar2D' }}>
  <Transform type="normalize" /* 产 y0/y1 累积角界字段 */ />
  <IntervalMark color="region" bounds={{ x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }} />
</Plot>

// point 吸收 text
<PointMark x="q" y="sales" text="sales" format=".0f" />
```

## 测试设计

`packages/plot/react/tests/` + `packages/plot/vanilla/tests/` 覆盖：

- `<IntervalMark x y>` / 双 band / `series`(dodge) / 显式 `bounds` 经 build-plot-spec 装配出的 PlotSpec 与手写抽象 IR 等价；plot-react **不自动注入 transform**（饼 / 堆叠须显式 `<Transform>`）。
- `<PointMark text>` → `encoding.text`；旧 `<TextMark>` 已删（import 失败 / 类型不存在）。
- `<PathMark>`/`<RegionMark>`/`<LinkMark>`/`<ReferenceMark>` 装配出对应 `path`/`region`/`link`/`reference` IR。
- vanilla `renderPlot` 与 react `<Plot>` 同 spec 产物 parity（SSR）。
- 现有 demo（bar / pie / heatmap / line / area）迁移到新组件后渲染产物等价。

具体 case 见「实现契约 § 测试象限」。

## 影响

- **`@retikz/plot-react`**：`marks.tsx` 6 组件改名 / 合并；`build-plot-spec.ts` 便捷 props → 抽象 `bounds` IR 映射；`components/index.ts` + `src/index.ts` 导出调整（⚠️ 公开 API breaking）。
- **`@retikz/plot-vanilla`**：`renderPlot` 随 IR 跟随；测试更新。
- **`apps/docs`**：grammar 段按抽象数据几何重组；图表形态示例解释改写；**现有用 `<BarMark angle>` / `<BarMark stack>` 的饼 / 堆叠 demo 迁移为显式 `<Transform>` + `<IntervalMark bounds>`**；zh / en + contents + data + i18n 同步。
- **core**：无影响。
- **⚠️ BREAKING（公开 API）**：`<BarMark>`/`<RectMark>`/`<TextMark>`/`<LineMark>`/`<AreaMark>`/`<RuleMark>`/`<RibbonMark>` 改名 / 删除。未发布、不留别名（0.x）。

## 不在本 ADR 范围

- **IR / lowering / registry**：[ADR-03](./03-mark-abstraction-registry.md)。
- **chart 层 `<Chart>` + 友好 arrangement 开关（stacked / grouped）**：v0.2（plot react 的便捷 props 是底层 authoring 糖、不等于 chart preset）。
- **docs 自定义 mark / registry 扩展页**：需求驱动。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字 + 红级多 LLM 评审后定稿。

### Level

`red`

判级：动 `packages/plot/{react,vanilla}/src/index.ts`（公开组件导出改名 / 删除）。docs / 测试为 green，跨级取最高 → red。

### Schema 改动

无。本 ADR 不动 IR / schema（消费 ADR-03 的抽象 IR）；便捷 props → `bounds` 的映射在 `build-plot-spec`，不进 IR schema。本表写「无」。

### 文件 scope

- `packages/plot/react/src/components/marks.tsx`（修改：6 组件改名 / 合并、props 调整）
- `packages/plot/react/src/components/build-plot-spec.ts`（修改：便捷 props → 抽象 `bounds` IR 映射）
- `packages/plot/react/src/components/index.ts` / `packages/plot/react/src/index.ts`（修改：导出调整）
- `packages/plot/vanilla/tests/**`（修改：新 spec / parity）
- `packages/plot/react/tests/**`（新建 / 修改：组件装配 + 等价性）
- `apps/docs/src/contents/plot/grammar/**`（修改 / 新建：抽象 mark 页 + 图表示例改写，zh/en）
- `apps/docs/src/contents/plot/**` 的 `data/plot.ts` + i18n（修改：contents + data + i18n 同步）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量。

**Happy path（≥ 3）**：

- `interval_bar_props_to_spec`：`<IntervalMark x y>` → 抽象 interval IR（bounds 省略 / band×span）
- `interval_pie_bounds_to_ir`：`<IntervalMark bounds={{x:extent,y:full}}>` polar → 对应 interval IR，**不附带任何 transform**
- `point_text_prop_to_encoding`：`<PointMark text format>` → `encoding.text` + format

**边界（≥ 2）**：

- `interval_heatmap_double_band`：`<IntervalMark x y color>` 双 band → heatmap cell IR（取代旧 RectMark）
- `interval_dodge_series_subband`：`<IntervalMark series>` → `bounds.x=band{group:series}`（纯几何、无 transform）

**错误路径（≥ 2）**：

- `legacy_components_removed`：import 旧 `BarMark`/`RectMark`/`TextMark` → 不存在（编译 / 类型失败）
- `interval_no_auto_transform`：`<IntervalMark bounds={extent}>` 引用的字段无 `<Transform>` 产出 → plot-react 不自动补 transform，lowering 对缺字段 fail-loud（不静默装配）

**交互（≥ 2）**：

- `vanilla_react_parity`：同 spec 下 `renderPlot` 与 `<Plot>` 产物 parity
- `demo_migration_equivalence`：现有 bar/pie/heatmap/line/area demo 迁移到新组件后渲染产物等价

### 依赖的现有元素

- `BarMark` / `RectMark` / `TextMark` / `LineMark` / `AreaMark` / `RuleMark` / `RibbonMark` / `PointMark`（`react/src/components/marks.tsx`）—— 修改：改名 / 合并为 6 抽象组件
- `build-plot-spec`（`react/src/components/build-plot-spec.ts`）—— 修改：便捷 props → 抽象 `bounds` IR；**移除现 `<BarMark angle>` 累积 / `<BarMark stack>` 自动 transform 装配**（这些转 chart 层），plot-react 不再产 transform 副作用
- `renderPlot`（`vanilla/src/render-plot.ts`）—— 仅引用：纯 spec 驱动、随 IR 跟随
- ADR-03 的抽象 IR（`@retikz/plot` `point`/`path`/`region`/`interval`/`link`/`reference` schema + `bounds`）—— 仅消费：表面装配产物目标
- `apps/docs` grammar contents / `data/plot.ts` / i18n —— 修改：按抽象数据几何重组 + 图表示例改写
