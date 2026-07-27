# ADR-01：plot 提供图元链路

- 状态：Accepted
- 决策日期：2026-07-08
- 完成日期：2026-07-08
- 关联：[plot v0.1 roadmap](../roadmap.md) · [data beta.2 ADR-02](../../../../data/v0/v0.1/beta.2/02-data-lineage-trace.md) · [plot beta.1 ADR-01](../beta.1/01-data-package-adapter.md) · [plot-design.md §3.3 Transform / §8 lowering](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot` 已有轻量 provenance / locator：`lowerPlots` 可以写 root、layer、datum meta，`createPlotLocator` 可以按相同 spec 与 datasets 解析 datum / series anchor。这些能力适合命中测试和稳定 id，但不足以解释 BI 用户关心的“某个柱、点或路径段为什么这样生成”。

plot 不应复制 data transform，也不应保存 SQL、权限或 AI prompt。plot 的职责是把 data lineage 与可视语义拼起来：mark identity、encoding field、scale / layout 摘要、locator address，以及宿主显式传入的 metadata。

## 决策

新增 runtime-only `PlotLineageOptions`、`PlotLineageRun`、`lowerPlotWithLineage()` 与 `createPlotLineageLocator()`。完整图元链路只通过返回值暴露，不写入 PlotSpec，不塞进 Scene meta；Scene meta 继续只承载当前轻量 provenance。

默认规则：

1. 不传 `lineage` 时保持 `lowerPlots()` 与现有 `provenance` / `datumProvenance` 行为。
2. `lineage: {}` 只记录 data source / transform step、mark identity、mark encoding、root / mark-local transform scope。
3. `scaleMappings`、`layoutContext`、`locatorAnchors`、`rowValues`、`hostMetadata` 独立开关，默认关闭。
4. `rowValues` 必须给 `maxRows` 与非空 `fields`，不允许因为打开 encoding 就复制最终行值。
5. `hostLineageMetadata` 只透传 query id、dataset version、AI plan id、prompt hash、权限策略 id 或 JSON-safe extra。
6. React 与 Vanilla adapter 需要暴露同一组链路配置，避免用户为了审计绕到底层 plot API。

## 公开契约

底层 plot API：

```ts
const { children, lineage } = lowerPlotWithLineage(spec, datasets, {
  lineage: {
    scaleMappings: true,
    rowValues: { maxRows: 3, fields: ['region', 'revenue'] },
    hostMetadata: { query: true },
  },
  hostLineageMetadata: { queryId: 'q-sales', datasetVersion: 'sales-v3' },
});
```

React adapter：

```tsx
<Plot
  id="salesPlot"
  data={sales}
  lineage={{ scaleMappings: true, hostMetadata: { query: true } }}
  hostLineageMetadata={{ queryId: 'q-sales' }}
  onLineage={setLineage}
>
  <IntervalMark id="revenueBars" x="region" y="revenue" />
</Plot>
```

Vanilla / SSR adapter：

```ts
const { svg, lineage } = renderPlot(
  spec,
  { sales },
  {
    width: 420,
    height: 260,
    lineage: { scaleMappings: true, rowValues: { maxRows: 3, fields: ['region'] } },
  },
);
```

## 被否决选项

- **把完整链路写入 Scene meta**：会让每个 Node / Path 挂大对象，影响 renderer 与序列化成本。
- **plot 自己重做 data trace**：会与 `@retikz/data` 的 transform 真源漂移。
- **只暴露底层 `lowerPlotWithLineage()`**：React / Vanilla 用户仍需绕开 adapter，体验不完整。

## 最终实现

plot contract 新增图元链路类型；pipeline 新增 `lowerPlotWithLineage()` 与 `createPlotLineageLocator()`，复用 `lowerPlots()`、data lineage、locator 与现有 provider 语义。`lowerPlots()` 返回 shape 不变。

`@retikz/plot-react` 新增 `<Plot lineage hostLineageMetadata onLineage>` 与 `resolvePlotLineage(props)`；`@retikz/plot-vanilla` 新增 `renderPlot(..., { lineage })` 的 `{ svg, lineage }` 返回形态，未开启链路时继续返回 SVG 字符串。

## 验证

- 最小 mark lineage、mark-local transform scope、host metadata、scale mapping、layout context、row value cap 均有测试覆盖。
- locator lineage 与 anchor meta 对齐。
- Scene meta 不写完整 lineage。
- React / Vanilla adapter 覆盖链路 API 与默认关闭行为。
- 完成提交：`9bfdafac6`、`0eed8d58a`。

## 遗留风险

`lowerPlotWithLineage()` 为保持 `lowerPlots()` shape 不变，会独立执行一次链路记录。自定义 transform 必须保持确定性；随机或有状态 transform 应由宿主先固化输入或通过自定义 definition 记录额外审计信息。

## 实现指针

本 ADR 已在 plot v0.1 RC 收尾时压缩；当前真源以代码、测试、文档站和 changelog 为准。完整施工契约保留在该 ADR 的 Accepted 历史版本中。
