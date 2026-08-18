# ADR-02：Plot Vanilla plain authoring 与 Tier2 adapter 边界

- 状态：Accepted
- 决策日期：2026-07-12
- 完成日期：2026-07-27
- 关联：[plot v0.1 roadmap](../roadmap.md) · [plot v0.2 roadmap](../../v0.2/roadmap.md) · [kernel vanilla plain spec ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/beta.2/01-vanilla-plain-spec-api.md) · [plot-design.md §13.4 / §16](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot-vanilla` 曾以 `plotBuilder(config).mark(...).axis(...).build()` 作为主要 authoring 入口。builder 最终仍返回 plain `IRPlot`，却把可变收集过程和规范化隐藏在链式对象中，不利于结构化生成、diff、序列化与直接审查。

axis、facet、scaffold 与 track binding 还分别在 Vanilla builder 和 React `buildPlotIR()` 内实现，继续演进 composition 会扩大默认值、错误语义与边界校验的漂移。Plot 应复用 Kernel Vanilla 的 `InputEmbedAdapter` 协议，而不是维护独立作者模型或 renderer。

## 决策

### 共享 framework-neutral authoring

`@retikz/plot-vanilla` 拥有 TypeScript-only `InputPlot`、其 authoring binding 展开和 `normalizePlot()`。`@retikz/plot` 只保留持久化 `IRPlot` schema 与 lowering。React 只收集 JSX / props，再交给 Plot Vanilla 的同一条规范化路径。

`normalizePlot()` 会展开并移除 `facets`、`scaffolds`、axis / topology binding 等 authoring-only 字段，返回完整 `IRPlot`，且不修改调用方对象或数组。已类型化 Input 不重复执行 schema parse；未知外部输入仍由 Plot schema / parser 校验。关键规则：

- `xAxisId` / `yAxisId` 只对 path、point、interval 开放；其它 mark 即使显式传 `undefined` 也 fail-loud。
- facets 与 scaffolds 不混用，topology sugar 与显式 composition 不混用。
- 多轴派生保留显式 coordinate scale name 与完整 base scale 配置。
- scaffold view 按 `track.view`、`viewIdTemplate`、`track.id` 顺序解析，mark、guide 与 default view 复用同一结果。
- 核心错误统一使用 `plot authoring:` 前缀。

### Vanilla 改为 plain helper 与 Tier2 adapter

`@retikz/plot-vanilla` 公开：

- `plot(input)`：委托 `normalizePlot()`，返回无方法的 `IRPlot`。
- `embedPlot(id, spec, datasets, options?)`：返回标准 `InputEmbed`，不执行 lowering。
- `PlotInputEmbedAdapter`：由 Kernel Vanilla 在一次 Scene normalize traversal 中调用；datasets 与 options 保留在 typed embed input，不进入 IR。
- `renderPlot(spec, datasets, options?)`：继续作为独立 DOM-free SSR 与 lineage 入口，签名和返回重载不变。

删除 `plotBuilder`、`PlotBuilder` 与 `PlotBuilderConfig`，不保留 legacy alias。adapter 不重复校验已类型化嵌入 spec，以 embed id 派生 root identity，并在 Vanilla processing 中贡献对应的 Composite provider。

### v0.2 优化边界

本 ADR 只稳定 authoring、identity 与 owner 分层。cache、patch、invalidate、增量 lowering / compile、依赖失效、按需 mark 物化、SVG DOM diff 与 Canvas 局部重绘进入 plot v0.2；v0.1 的 `VanillaView.update()` 仍整图重渲染。

## 迁移

```ts
// 旧
const spec = plotBuilder(config).path(pathMark).point(pointMark).axis(xAxis).axis(yAxis).build();

// 新
const spec = plot({
  ...config,
  marks: [pathMark, pointMark],
  guides: [xAxis, yAxis],
});
```

普通 SSR 继续使用 `plot()` + `renderPlot()`；与其它 Tier1 / Tier2 内容组合时使用 `embedPlot()` + `PlotInputEmbedAdapter`，并把 adapter 传给 Vanilla processing。两条路径消费同一 `IRPlot`，datasets 始终与 Plot IR 分离。

## 兼容性与遗留风险

这是 Vanilla authoring 的 breaking 迁移；Plot IR schema、lowering 几何、Scene schema、React JSX API 与 `renderPlot()` 行为不变。外部 Vanilla 消费方必须把链式 builder 改为 plain `plot({ marks, guides, facets, scaffolds })`。增量更新与 lineage 重复 lowering 是已明确延期的性能能力，不构成 v0.1-beta.2 契约。

## 长期边界

- 不修改 Plot IR、Core IR 或 Scene schema。
- 不新增 mark、guide、scale、coordinate 或 transform 能力。
- 不实现增量 compile / lowering、dependency graph、cache、patch、invalidate 或 scheduler。
- 不实现 renderer diff、dirty rectangle、batching 或 GPU 后端。
- 不把 datasets 或 lineage 写入 Plot IR。
