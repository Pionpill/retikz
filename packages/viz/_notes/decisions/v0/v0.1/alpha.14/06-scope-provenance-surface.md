# ADR-06：locator, provenance, and adapters surface

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides layout](./05-composition-guides-layout.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/graph/_notes/decisions/v0/v0.1/alpha.14/06-scope-provenance-surface.md`

## 背景

ADR-01～05 让 Plot 内部出现多个 coordinate scope、facet panel、overlay axis 和 scaffold track。只让 renderer 画出来还不够：locator / provenance 必须能回答“这个 datum 属于哪个 panel、哪个 coordinate scope、哪个 track”；React / Vanilla authoring surface 也必须能表达同一份 PlotSpec，而不是只让手写 JSON 可用。

当前 locator 以 markIndex / transformedIndex / series 为主，默认假设单 coordinate frame。多 scope 后，同一个 datum key 可能在多个 panel 或 track 中出现；同一 mark 也可能被 facet 复制多次。若 locator 不带 scope identity，hit-test、外部连线、交互高亮都会歧义。

本 ADR 收口三个方面：core IR meta 的 provenance shape、locator public API、React / Vanilla adapters surface。它不新增新的图形能力，只保证前面 ADR 定义的能力在交互和 authoring 层可用。

## 决策：所有多 scope 输出统一携带 scope context，adapters 只做同构薄壳

lowering 输出的 plot-related Scope / Node / Path meta 新增 `coordinateScope`，并按需要附加 `facet`、`scaffold`、`track`。locator 的 `datum` / `series` / `resolve` 支持通过这些 key disambiguate。React / Vanilla surface 不发明平行概念，只透传同一份 `composition`、`coordinateScope`、guide fields。

```ts
type PlotScopeContext = {
  coordinateScope?: string;
  facet?: {
    id: string;
    row?: JsonScalar;
    column?: JsonScalar;
  };
  scaffold?: string;
  track?: string;
};

type ResolvedAnchor = {
  position: [number, number];
  meta: JsonObject & PlotScopeContext;
  id?: string;
};

type PlotLocator = {
  datum: (
    transformedIndex: number,
    opts?: { markIndex?: number; coordinateScope?: string; facet?: FacetAddress; track?: string },
  ) => ResolvedAnchor | null;
  series: (
    value: string | number,
    opts?: { markIndex?: number; coordinateScope?: string; facet?: FacetAddress; track?: string },
  ) => ResolvedAnchor | null;
  resolve: (address: string) => ResolvedAnchor | null;
};
```

React / Vanilla 只提供两类薄壳：

1. 手写 `spec` 仍可完整传入。
2. JSX / builder 的 mark、axis、plot composition props 只映射到同名 PlotSpec 字段，不引入 React-only 或 Vanilla-only 语义。

理由：

1. provenance 与 locator 使用同一套 scope context，避免 render 与 hit-test 漂移。
2. `coordinateScope` / `facet` / `track` 都是 JSON-safe 值，可进入 core IR meta。
3. adapters 同构透传，保持 `@retikz/plot` 是 schema 真源。
4. address string 只是 locator 便捷入口，结构化 opts 才是 AI / 工具调用的主入口。


## DSL 表面

React 透传同名字段：

```tsx
<Plot
  data={{ reference: 'weather' }}
  scales={scales}
  composition={{
    defaultScope: 'temp',
    scopes: [
      { id: 'temp', coordinate: { type: 'cartesian2D', y: 'temp' } },
      { id: 'rain', coordinate: { type: 'cartesian2D', y: 'rain' }, placement: { kind: 'overlay', target: 'temp' } },
    ],
  }}
>
  <Path encoding={{ x: { field: 'day' }, y: { field: 'temperature' } }} />
  <Interval coordinateScope="rain" encoding={{ x: { field: 'day' }, y: { field: 'rainfall' } }} />
  <Axis dimension="y" coordinateScope="temp" placement={{ kind: 'side', side: 'left' }} />
  <Axis dimension="y" coordinateScope="rain" placement={{ kind: 'side', side: 'right' }} />
</Plot>
```

Vanilla builder 透传同名字段：

```ts
const plot = plotBuilder({
  data: { reference: 'weather' },
  scales,
  composition,
})
  .path({ encoding: { x: { field: 'day' }, y: { field: 'temperature' } } })
  .interval({ coordinateScope: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } })
  .axis({ dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } })
  .axis({ dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'right' } });
```

Locator：

```ts
const locator = createPlotLocator(spec, datasets);

locator.datum(4, {
  markIndex: 1,
  coordinateScope: 'rain',
  facet: { id: 'region', column: 'north' },
});
```

## 测试设计

`packages/viz/plot/tests/composition/scope-provenance-surface.test.ts` 覆盖：

- lower 输出 mark layer meta 带 coordinateScope。
- facet panel 下 datum meta 带 facet id / row / column。
- scaffold track 下 datum meta 带 scaffold / track。
- locator.datum 可用 coordinateScope disambiguate。
- locator.datum 可用 facet key disambiguate。
- locator.series 在 facet / track 中返回对应 scope context。
- resolve address 兼容旧地址，并支持 scope / facet 扩展地址。
- React surface 生成的 PlotSpec 与手写 spec 等价。
- Vanilla builder 生成的 PlotSpec 与手写 spec 等价。
- adapters 不接受 ReactNode / 函数进入 PlotSpec composition。

## 影响

- provenance meta shape 扩展，但保持 JSON-safe。
- locator public API 增加可选 opts 字段。
- React / Vanilla adapters 需要透传 `composition`、`coordinateScope`、`placement`、`title` 等字段。
- docs demo 需要并列展示手写 PlotSpec、React、Vanilla 三种表面，证明同源。

## 不在本 ADR 范围

- 不实现 tooltip、hover、brush、linked highlighting。
- 不设计高级 `<FacetGrid>` / `<Track>` component sugar。
- 不做外部 dashboard coordination。
- 不改变 core locator / renderer API；plot locator 仍是 plot 包能力。
