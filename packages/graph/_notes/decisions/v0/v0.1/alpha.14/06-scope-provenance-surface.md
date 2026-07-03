# ADR-06：locator, provenance, and adapters surface

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides layout](./05-composition-guides-layout.md)

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

## 待决策点 🔻

- **locator address string 是否扩展**：本草案倾向保留旧形式，并新增可选段：`<plotId>.scope.<scope>.datum.<i>`、`<plotId>.facet.<facetKey>.datum.<i>`。结构化 opts 优先，字符串只做兼容便捷。
- **React / Vanilla 是否提供高级 Facet 组件 / builder**：本草案只做薄壳，不做 `<FacetGrid>` 等高级 sugar。高级组件留 v0.2 / v0.3 composite。
- **provenance meta 字段名**：本草案使用 `coordinateScope`、`facet`、`scaffold`、`track`，与 PlotSpec 字段同名，便于 LLM 对齐。
- **locator 默认命中策略**：如果 opts 未指定且存在多个候选，本草案倾向返回第一个声明序候选，并在文档中建议多 scope 场景显式指定；是否改成歧义时报错需人工裁决。

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

`packages/graph/plot/tests/composition/scope-provenance-surface.test.ts` 覆盖：

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

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`yellow`。

原因：主要扩展 locator / provenance / adapters public surface；不新增 PlotSpec 核心图形语义。若实现发现必须改 lowering schema 或 core IR 契约，升级为 `red` 并回本 ADR 增补。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/*/schema.ts` | 无 | 无 | 无 | 无 | 本 ADR 不新增 PlotSpec 字段，只消费 ADR-01～05 已定义字段 |

### 文件 scope

- `packages/graph/plot/src/pipeline/provenance.ts`
- `packages/graph/plot/src/features/interaction/locate.ts`
- `packages/graph/plot/src/pipeline/expand.ts`
- `packages/graph/plot-react/src/components/**`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot-vanilla/src/**`
- `packages/graph/plot-vanilla/tests/**`
- `packages/graph/plot/tests/composition/scope-provenance-surface.test.ts`
- `apps/docs/src/contents/graph/**`（文档阶段）
- `apps/docs/src/data/**`（文档阶段）

### 测试象限

**Happy path**：

- `locator by coordinateScope`：同 datum 在两个 scope 中可区分。
- `locator by facet`：同 transformedIndex 在不同 facet panel 中可区分。
- `locator by track`：track scope 返回对应 scaffold / track meta。
- `react surface parity`：React 产物与手写 PlotSpec 等价。
- `vanilla surface parity`：Vanilla 产物与手写 PlotSpec 等价。

**边界**：

- `legacy locator address`：旧地址仍可 resolve。
- `ambiguous locator default`：opts 省略时默认命中声明序第一候选。
- `root single scope meta`：单图 meta 不强制增加多 scope 字段或保持兼容。

**错误路径**：

- `unknown locator scope`：不存在的 coordinateScope 返回 null 或 fail-loud，按现有 locator 契约统一。
- `invalid facet address`：facet id / key 不存在时返回 null。
- `adapter non json value`：React / Vanilla 阻止函数 / ReactNode 进入 PlotSpec。

**交互**：

- `facet overlay locator`：facet panel 内 overlay mark 可定位。
- `scaffold guide provenance`：track guide meta 带 scaffold / track。
- `docs demo parity`：docs demo 使用的 React / Vanilla spec 和手写 spec round-trip 等价。

### 依赖的现有元素

- ADR-01 coordinateScope：scope context 的主身份。
- ADR-02 facet key：locator / provenance 的 panel 维度。
- ADR-03 axis placement：adapter 需要透传 guide 字段。
- ADR-04 scaffold / track：provenance 需要记录 track identity。
- ADR-05 layout / guidePolicy：adapter 需要透传 composition 配置。
- `createPlotLocator`：扩展 opts 和 address parsing。
- React / Vanilla plot adapters：保持同构薄壳。
