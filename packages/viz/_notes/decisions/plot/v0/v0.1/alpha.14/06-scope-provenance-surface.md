# ADR-06：locator, provenance, and adapters surface

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md)；scope identity 已重命名为 coordinate view，locator / provenance 使用最终 view 与 arrangement 上下文
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides layout](./05-composition-guides-layout.md)

## 背景

ADR-01～05 让 Plot 内部出现多个 coordinate scope、facet panel、overlay axis 和 scaffold track。只让 renderer 画出来还不够：locator / provenance 必须能回答“这个 datum 属于哪个 panel、哪个 coordinate scope、哪个 track”；React / Vanilla authoring surface 也必须能表达同一份 IRPlotSpec，而不是只让手写 JSON 可用。

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
2. JSX / builder 的 mark、axis、plot composition props 只映射到同名 IRPlotSpec 字段，不引入 React-only 或 Vanilla-only 语义。

理由：

1. provenance 与 locator 使用同一套 scope context，避免 render 与 hit-test 漂移。
2. `coordinateScope` / `facet` / `track` 都是 JSON-safe 值，可进入 core IR meta。
3. adapters 同构透传，保持 `@retikz/plot` 是 schema 真源。
4. address string 只是 locator 便捷入口，结构化 opts 才是 AI / 工具调用的主入口。

## 不在本 ADR 范围

- 不实现 tooltip、hover、brush、linked highlighting。
- 不设计高级 `<FacetGrid>` / `<Track>` component sugar。
- 不做外部 dashboard coordination。
- 不改变 core locator / renderer API；plot locator 仍是 plot 包能力。
