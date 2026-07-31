# ADR-08：Ranged Dot 的双端点与 projected Relation

- 状态：Proposed（core variant 可设计；public adapters / docs 受 ADR-04 Kernel gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-07](./07-regression.md)

## 背景

Ranged Dot 比较同一类别的起点与终点。其本体不是 reshape 后的两行 Scatter，也不需要新的 range 几何：Plot 已能用两个 Point Mark 投影同一 row 的不同字段，并用 Relation Mark 的 projected source / target 连接两端。

## 决策：每行生成 start、end 两个 Point 与一条 projected Relation

```ts
type RangedDotChartSpec = ChartCommon & {
  type: 'ranged-dot';
  encoding: {
    category: { field: string };
    start: { field: string };
    end: { field: string };
    color?: StrictColorChannel;
  };
  mark?: RangedDotSharedPointPatch;
  components?: {
    start?: RangedDotPointPatch;
    end?: RangedDotPointPatch;
    range?: RangedDotRelationPatch;
  };
};
```

缺省使用 horizontal 配方：category 绑定 y，start / end 绑定 x。三个位置角色都是 strict `{field:string}`，不接受会被 Plot 静默忽略的 binding-level `scale`。recipe 的 exact marks 为：

```ts
[
  {
    type: 'point',
    id: '__chart.ranged-dot.mark.start',
    encoding: {
      x: { field: spec.encoding.start.field },
      y: { field: spec.encoding.category.field },
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
  {
    type: 'point',
    id: '__chart.ranged-dot.mark.end',
    encoding: {
      x: { field: spec.encoding.end.field },
      y: { field: spec.encoding.category.field },
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
  {
    type: 'relation',
    id: '__chart.ranged-dot.mark.range',
    source: {
      project: { x: spec.encoding.start.field, y: spec.encoding.category.field },
    },
    target: {
      project: { x: spec.encoding.end.field, y: spec.encoding.category.field },
    },
    layer: { zIndex: -1 },
    ...(resolvedColorChannel ? { encoding: { color: resolvedColorChannel } } : {}),
  },
];
```

marks 的语义顺序固定为 start、end、range，保证 Plot 默认 `locator.datum` 指向 start Point；Relation 用正式 `layer.zIndex=-1` 位于两个 Point 之后声明、之前绘制。顶层 `mark` patch 同时应用到 start / end，随后 `components.start` / `end` 分别覆盖。Ranged Dot 在 ADR-04 strict Point patch 上继续排除 `layer`，两个 endpoint 的 effective layer 固定使用 Plot Mark 默认值，不能被降到 range 以下。

`components.range` 用重建的 strict schema，只允许：

- `style`：Relation primitive style 去掉 `zIndex`
- `path.routing`、`path.label`
- `path.options` 只允许 `dashPattern`、`fillRule`、`lineCap`、`lineJoin`、`roundedCorners`、`marks`，排除会独立移动 Relation 的 `rotate` / `scale`
- 顶层 geometry `label`

不允许 `kind`、`ribbon`、`source`、`target`、`id`、`layer`、`coordinateView`、`transform`、`encoding`、`path.via`、`path.route` 或任何 projected-target extra。它可以调整直线的样式与正式 routing，但不能添加目标、切换 ribbon、改变核心层级或身份。

缺省 `scales:[]`，x / y 位置 scale 由 Plot 从两个 Point 与 Relation projected fields 联合推断。coordinate shorthand / composition 逐字复用 ADR-04 的 scope 解析与 `resolveCoordinateRegistry(options.plot?.coordinates)`，要求 active/default definition `roles === ['x','y']`；同一 options 原样传给 `lowerPlots`。shorthand 下三个 marks 与 axes 都省略 `coordinateView`；composition 下全部固定为 `defaultView`。当前 Plot facet lowering 不应用 semantic mark layer，因此 composition 只要包含 `kind:'facet'` arrangement 就以 `core-recipe-violation` 拒绝；Chart 不重排 lowered children。color 使用 ADR-04 strict union，并写入两个 Point 与 Relation 的正式 `encoding.color`。

patch 优先级固定为：type color < shared point patch < endpoint patch；Relation 侧为 type color < range style patch。range style patch 不能改 `encoding.color`，但可通过 `style.color/stroke/...` 覆盖最终绘制。

`validateCore` 复验三个 marks 的 reserved ids、type、数组顺序、range `layer.zIndex=-1`、两个 Point 没有 layer override且保留 exact encoding、Relation exact source/target（只含 project）、同一 coordinateView、无 facet arrangement、color mapping 与 patch 后仍存在的两个 endpoints。任一破坏抛 `core-recipe-violation`。

`start === end` 时保留两个重合 Point；Relation 仍按 Plot default route 生成 move + line 两个 step，零长度不被 Chart 删除。

## Locator / provenance 边界

- 默认 `locator.datum(i)` 固定读取 markIndex 0 的 start Point
- end Point 使用 `locator.datum(i,{markIndex:1})`
- 两个 Point 对同一 row 保持相同 transformedIndex / sourceIndex，但位置分别来自 start / end field
- Relation（markIndex 2）不是 datum-bearing mark，不承诺 per-row datum locator；其 mark lineage 仍来自同一 root rows
- exact `{project}` refs 没有 `anchorId`，当前 lowering 直接生成 position targets与空 Coordinates，因此不产生 source / target per-row Coordinate owner
- presentation 包裹前后上述 payload 不变；Chart 不为 Relation 私造与 Point 相同的 anchor identity

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "ranged-dot",
  "data": { "reference": "change" },
  "encoding": {
    "category": { "field": "department" },
    "start": { "field": "before" },
    "end": { "field": "after" }
  },
  "components": {
    "start": { "color": { "kind": "constant", "value": "#94a3b8" } },
    "end": { "color": { "kind": "constant", "value": "#2563eb" } }
  }
}
```

## 测试设计

- exact recipe：projected Relation + two Points
- patch precedence：shared point patch < endpoint patch
- invariant：三个核心 marks 与 endpoint projection 不可撤销

## 影响

- 扩展 ChartSpec union
- 首次复用 Relation target projection
- docs 新增 Ranged Dot canonical 页面

## Chart 封装完备性检查

- 核心 recipe：start Point + end Point + Relation
- 数据：同一根 rows，不 reshape、不复制 dataset
- coordinate：三者经同一 coordinate roles 投影
- extension：可追加 Reference / label 等 Plot marks
- 本轮结论：组合 Plot Point + Relation，无新 transform

## 不在本 ADR 范围

- dumbbell / lollipop 的独立 type 判定
- 多于两个端点
- 自动计算 start / end 或补数据算法
- direction pattern 的公共 API；alpha.1 只冻结 horizontal 默认

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 ChartSpec variant。

### Schema 改动

| 文件                                           | 操作 | 字段名                                | 类型                           | 默认值 | describe 中文摘要    |
| ---------------------------------------------- | ---- | ------------------------------------- | ------------------------------ | ------ | -------------------- |
| `packages/viz/chart/src/schemas/ranged-dot.ts` | 新增 | `type`                                | `z.literal('ranged-dot')`      | —      | Ranged Dot 判别值    |
| 同上                                           | 新增 | `encoding.category` / `start` / `end` | strict field-only channel      | —      | 类别与两个端点字段   |
| 同上                                           | 新增 | `encoding.color`                      | ADR-04 strict color union      | —      | 三个 marks 共享颜色  |
| 同上                                           | 新增 | `mark`                                | strict Point patch optional    | —      | 两端共享 Point patch |
| 同上                                           | 新增 | `components.start` / `end`            | strict Point patch optional    | —      | 单端覆盖             |
| 同上                                           | 新增 | `components.range`                    | strict Relation patch optional | —      | 连接线样式 / routing |
| `packages/viz/chart/src/schemas/chart.ts`      | 修改 | root union                            | 加入 Ranged Dot                | —      | 扩展封闭 union       |

### 文件 scope

- `packages/viz/chart/src/schemas/ranged-dot.ts`
- `packages/viz/chart/src/schemas/chart.ts`
- `packages/viz/chart/src/providers/recipes/ranged-dot.ts`
- `packages/viz/chart/src/providers/recipes/index.ts`
- `packages/viz/chart/tests/**/ranged-dot*`
- `packages/viz/chart-react/tests/ranged-dot.test.tsx`
- `packages/viz/chart-vanilla/tests/ranged-dot.test.ts`
- `apps/docs/**`（Ranged Dot 中英文 canonical 页面 / demo）

### 测试象限

**Happy path（≥ 3）**

- 最小 spec 生成 range、start、end 三个核心 marks
- 顶层 mark patch 同时作用两端，endpoint patch 后覆盖
- start > end 时 Relation 仍按 authored 角色连接，不擅自交换
- strict color 写入三个 marks 的 `encoding.color`，Point / Relation style patch 按固定优先级覆盖

**边界（≥ 2）**

- start === end 时两个点重合、Relation 保留 move + line 零长度 steps
- 单 datum 生成一组完整端点与连接

**错误路径（≥ 2）**

- 缺 category / start / end 任一角色被 schema 拒绝
- 位置 binding 携带 `scale` 被 strict schema 拒绝
- range patch 试图改 source / target / type / layer / coordinateView、添加 via / route 或切换 ribbon 被拒绝
- endpoint patch 试图设置 layer，或 composition 含 facet arrangement 时被拒绝

**交互（≥ 2）**

- root transform 后三 marks 使用同一 rows 与 lineage
- Polar2D coordinate 仍由 projected role map 生成两端与 Relation
- default locator 指向 start，end 必须指定 markIndex 1，Relation 无 datum locator / projected Coordinate owner；presentation 前后 mark / root-row lineage 保持
- inspection 固定 `[mark.start, mark.end, mark.range]` targets / sources，reserved id 与追加 mark 不替换核心
- ADR-04 Kernel gate 解除后 JSON / React / Vanilla 对 ChartSpec、resolved PlotSpec 与 final composition exact parity；gate 前只实现 core variant

### 依赖的现有元素

- Plot Point / Relation schemas 与 definitions
- `PlotTargetRefSchema` projected target
- Plot coordinate `projectRoles`、scope / definition registries与 Relation locator / provenance
