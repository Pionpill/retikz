# ADR-02：facet grid data routing

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [plot-design.md §7](../../../../architecture/plot-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/graph/_notes/decisions/v0/v0.1/alpha.14/02-facet-grid-data-routing.md`

## 背景

分面（facet）解决的是“按数据字段把一张图拆成多个小图”。它不是双轴，也不是 shared scaffold track：facet 会拆数据、生成多个 panel、每个 panel 有自己的 coordinate scope；双轴不拆 panel；track 共享坐标骨架但不一定按数据字段拆行。

当前 `PlotSpec` 只能绑定一份 transform 后的数据和一个默认 coordinate scope。用户若想画小多图，只能手写多张 Plot 或在上层组合里复制 spec。这会导致 scale 共享、panel 排序、空 panel、guide 布局和 provenance 都散在外层，Plot 内部无法知道“这些 panel 属于同一个 facet grid”。

ADR-01 已经给 Plot 内部 coordinate scope 建立了 identity 和 mark / axis guide 绑定。ADR-02 在其上增加 facet grid 的数据路由：从一份 PlotSpec 数据中按 row / column 字段派生 panel key，给每个 panel 生成局部 rows 和 coordinate scope，再按共享或独立 position scale 策略训练坐标。

本 ADR 只定义 facet 的数据拆分、panel key、排序、空 panel 与 position scale sharing。panel 之间的统一外轴、标题、间距和 label 视觉策略由 ADR-05 收敛。

## 决策：在 composition 下引入 facet grid 生成器

`PlotSpec.composition` 新增 `facets`，每个 facet grid 生成一组 panel coordinate scope。facet grid 至少声明一个维度：`row` 或 `column`。每个维度绑定一个数据字段，生成稳定的 panel key；panel scope id 由 `id` 和 key 规范化得到，mark 默认在每个 panel 内以该 panel rows lower。

```ts
type FacetValue = string | number | boolean | null;

type FacetDimensionSpec = {
  field: string;
  order?: Array<FacetValue>;
};

const FacetScaleSharing = {
  Shared: 'shared',
  Independent: 'independent',
} as const;

type FacetScaleSharingValue = ValueOf<typeof FacetScaleSharing>;

type FacetScaleSharingSpec = {
  roles?: Record<string, FacetScaleSharingValue>;
};

type FacetGridSpec = {
  id: string;
  row?: FacetDimensionSpec;
  column?: FacetDimensionSpec;
  empty?: 'drop' | 'show';
  scales?: FacetScaleSharingSpec;
  coordinate?: CoordinateOperation;
  scopeIdTemplate?: string;
};

type CoordinateCompositionSpec = {
  facets?: Array<FacetGridSpec>;
};
```

facet grid 的规范化产物不是用户手写的 `composition.scopes` 列表，而是 lowering 内部生成的 panel scopes。生成规则：

1. `row` / `column` 从 transform 后 rows 取值，按 `order` 或首次出现顺序确定 panel 顺序。
2. `empty: 'drop'` 默认只生成有 rows 的 panel；`empty: 'show'` 会按 row × column 全组合生成空 panel。
3. `coordinate` 省略时继承 `composition.defaultScope` 对应的 coordinate；显式给 `coordinate` 时所有 panel 使用该 coordinate operation。
4. `scales.roles[role]` 默认 `FacetScaleSharing.Shared`。`shared` 代表该 role 的 domain 由所有 panel rows 一起训练，`independent` 代表每个 panel 只用自己的 rows 训练。实现时按 const object enum 定义 `FacetScaleSharing`，schema 用 `z.enum(FacetScaleSharing)`，避免散落裸字符串 union。
5. 每个 panel lower 成 core `Scope`，scope id 稳定包含 facet id 和 key；provenance 记录 facet key。

理由：

1. facet 是数据路由问题，入口放在 `composition.facets`，避免把“多个 coordinate scope”误解成必须手写每个 panel。
2. `row` / `column` 都用字段对象而不是裸字符串，给 `order`、title、format 后续扩展留位置。
3. scale sharing 只先覆盖 position role 的最小集合，color / size / opacity 等非位置 scale 的共享策略留给后续 milestone。
4. panel scope id 由规则生成，保持 JSON-safe、可被 locator / provenance 使用，也避免要求用户手写大量 id。


## DSL 表面

单字段 facet：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'sales' },
  scales,
  composition: {
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'month', y: 'revenue' } }],
    facets: [
      {
        id: 'region',
        column: { field: 'region', order: ['north', 'south', 'east', 'west'] },
        scales: { roles: { y: 'independent' } },
      },
    ],
  },
  marks: [{ type: 'path', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};
```

二维 facet：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'penguins' },
  scales,
  composition: {
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D' } }],
    facets: [
      {
        id: 'species-sex',
        row: { field: 'species' },
        column: { field: 'sex' },
        empty: 'show',
        scales: { roles: { x: 'shared', y: 'shared' } },
      },
    ],
  },
  marks: [{ type: 'point', encoding: { x: { field: 'billLength' }, y: { field: 'bodyMass' } } }],
};
```

## 测试设计

`packages/viz/plot/tests/composition/facet-grid-data-routing.test.ts` 覆盖：

- 单字段 column facet 生成多个 panel scope，panel 数等于 distinct field values。
- row × column facet 按 row-major 顺序生成稳定 panel。
- `order` 覆盖首次出现顺序，未列出的值追加到末尾。
- `empty: 'drop'` 不生成没有 rows 的组合；`empty: 'show'` 生成空 panel。
- shared y scale 时所有 panel 使用同一个 domain；independent y scale 时每个 panel domain 只来自自己的 rows；ternary / custom coordinate 可通过 `roles.z` 或自定义 role 名使用同一枚举。
- mark-local transform 在 facet rows 内执行，不能跨 panel 泄漏数据。
- facet 字段缺失或值不可 JSON 化时 fail-loud。
- facet id 重复或和显式 scope id 冲突时 fail-loud。
- custom coordinate 在 facet panel 中仍走 coordinate registry。
- provenance 中包含 facet id / row key / column key，locator 后续可区分同 datum key 的不同 panel。

## 影响

- `PlotSpec.composition` 新增 facet grid 生成器，lowering 需要在 resolveFrame 前完成 panel rows 分组。
- scale/domain 训练需要支持“全局 rows”和“panel rows”的选择。
- mark lowering 需要在 facet panel 内重复实例化 mark layers，生成稳定 panel scope。
- locator / provenance 需要接收 facet key，本 ADR 先写入 lower 输出 meta，ADR-06 收口 public locator API。
- 文档需要解释 facet 与 overlay / track 的区别，并给至少一个小多图 demo。

## 不在本 ADR 范围

- 不定义 panel label、外侧统一 axis、panel gap、grid 合并策略；这些由 ADR-05 处理。
- 不支持 per-mark 选择“是否参与 facet”或跨 panel reference line；后续如需要另开 ADR。
- 不做 nested facet、free layout、wrap facet 或 dashboard layout。
- 不做非位置 scale 的 per-panel 独立训练。
- 不做 React / Vanilla 高级 sugar；ADR-06 统一收口 authoring surface。
