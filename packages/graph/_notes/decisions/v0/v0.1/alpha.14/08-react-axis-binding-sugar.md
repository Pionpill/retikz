# ADR-08: React axis binding sugar for overlay scopes

- 状态：Proposed
- 决策日期：2026-06-29
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-06 scope provenance surface](./06-scope-provenance-surface.md) · [ADR-07 axis-level grid targeting](./07-axis-grid-targeting.md)

## 背景

ADR-01 到 ADR-07 已经把 PlotSpec 内部的 `composition`、`coordinateScope`、overlay scope、guide binding 和 grid targeting 串起来。这个模型适合作为 IR 和程序化底层契约，但 React DSL 用户写常见双轴图时仍然要理解并手写：

- `composition.defaultScope`
- `composition.scopes`
- `placement: { kind: 'overlay', target: ... }`
- mark / axis 上的 `coordinateScope`

这对“左轴画 temperature，右轴画 rainfall”这类常见图表来说过重。Recharts 的多轴 API 更接近用户心智：先声明 `<YAxis yAxisId="right" />`，再让 `<Line yAxisId="right" />` 绑定到那根轴。用户想表达的是“这条 mark 用哪根轴”，不是“我要先注册哪个 coordinate scope”。

同时，不能把 API 设计成只服务 dual-axis 的临时白名单。facet、track、scope composition 后续也需要类似“mark 绑定到某个结构身份”的 authoring sugar。因此本 ADR 把方案命名为 **axis binding sugar**：第一步只落 overlay 多 y 轴，但模型要能自然扩展到 facet / track binding。

## 决策：adapter 生成 composition，用户绑定 axis id

新增 adapter-level axis binding sugar。用户在 React / Vanilla authoring 层用 axis id 绑定 mark；adapter 在生成 PlotSpec 时展开为现有 `composition` 与 `coordinateScope`，不新增 IR schema。

第一版只支持 cartesian2D 下的“共享 x + 多 y axis overlay”。`xAxisId`、facet binding、track binding 进入后续 ADR；本 ADR 只新增 `yAxisId`。

React DSL：

```tsx
<Plot data={weatherRows}>
  <Scale dimension="x" type="linear" />

  <Axis dimension="x" placement={{ kind: 'side', side: 'bottom' }} title="day" />
  <Axis id="temperature" dimension="y" placement={{ kind: 'side', side: 'left' }} title="temperature" />
  <Axis id="rainfall" dimension="y" placement={{ kind: 'side', side: 'right' }} title="rainfall" />

  <PathMark x="day" y="temperature" yAxisId="temperature" />
  <PathMark x="day" y="rainfall" yAxisId="rainfall" />
</Plot>
```

展开后的 PlotSpec 仍然使用 composition：

```ts
{
  composition: {
    defaultScope: 'temperature',
    scopes: [
      { id: 'temperature', coordinate: { type: 'cartesian2D', x: '__x', y: '__y.temperature' } },
      {
        id: 'rainfall',
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y.rainfall' },
        placement: { kind: 'overlay', target: 'temperature' },
      },
    ],
  },
  marks: [
    { type: 'path', coordinateScope: 'temperature', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'path', coordinateScope: 'rainfall', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'y', id: 'temperature', coordinateScope: 'temperature' },
    { type: 'axis', dimension: 'y', id: 'rainfall', coordinateScope: 'rainfall' },
  ],
}
```

Vanilla builder 使用同一 sugar 字段，但只在 builder 输入层存在；`build()` 输出的 PlotSpec 不保留 `yAxisId`：

```ts
const spec = plotBuilder({ data, scales: [] })
  .axis({ type: 'axis', id: 'temperature', dimension: 'y', placement: { kind: 'side', side: 'left' } })
  .axis({ type: 'axis', id: 'rainfall', dimension: 'y', placement: { kind: 'side', side: 'right' } })
  .path({ type: 'path', yAxisId: 'temperature', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } })
  .path({ type: 'path', yAxisId: 'rainfall', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } })
  .build();
```

规则：

1. `yAxisId` 是 adapter-only sugar，不能进入 `@retikz/plot` IR schema。
2. `yAxisId` 必须引用同一 Plot 内存在的 `Axis id`，且该 axis 的 `dimension` 必须是 `y`。
3. 只要出现 `yAxisId`，adapter 就进入 axis binding mode。
4. binding mode 仅支持 `cartesian2D`。非 cartesian2D 下使用 `yAxisId` fail-loud。
5. 如果用户显式传入 `composition`，第一版不再自动生成 overlay composition；`yAxisId` 只允许绑定到已有 `Axis id` 与同名 scope。找不到同名 scope 时 fail-loud。
6. 如果用户没有传入 `composition`，adapter 自动生成 overlay composition：
   - 第一个被 y mark 引用的 y axis 成为 `defaultScope`。
   - 其它 y axis 生成 `placement: { kind: 'overlay', target: defaultScope }`。
   - 每个 y axis 使用独立 y scale name，建议为 `__y.<axisId>`。
   - 所有生成 scope 共享 x scale name `__x`。
7. 未写 `yAxisId` 的 position mark 绑定默认 y axis。默认 y axis 可以是无 `id` 的 `<Axis dimension="y" />`，也可以是在 binding mode 中第一个 y axis。
8. `Axis id` 在 adapter 中承担 binding id；在输出 PlotSpec 中仍保留为 guide handle，供 provenance / docs / future anchor 使用。
9. 若同一 dimension 下出现重复 `Axis id`，adapter fail-loud。
10. 若一个 mark 同时写 `coordinateScope` 和 `yAxisId`，adapter fail-loud，避免两个定位入口互相覆盖。

## 理由

1. 常见多轴图的 authoring 心智是“mark 绑定 axis”，不是“mark 绑定 scope”。
2. 不新增 IR schema，保证现有 composition 仍是单一真源。
3. `Axis id` 是用户可命名对象，比 `coordinateScope` 更接近 Recharts / charting 用户经验。
4. 只先做 `yAxisId`，避免一次性设计 x/y overlay 矩阵、facet binding、track binding 过度展开。
5. Vanilla builder 也支持同一 sugar 字段，保持 authoring surface 对等；但字段在 builder 输出前消失，不污染 IR。

## 待决策点

- **默认 y axis 选择**：本 ADR 倾向“第一个被 y mark 引用的 y axis 是默认 scope”。如果没有任何 mark 写 `yAxisId`，沿用现有单坐标输出。
- **scale name 派生**：建议使用 `__y.<axisId>`，可读且稳定。axis id 必须是非空字符串；如果未来允许任意字符，scale name 需要 slug 化。
- **显式 `composition` + `yAxisId`**：第一版选择保守策略，不自动修改用户传入的 composition；只做同名 axis/scope 绑定校验。
- **`xAxisId` 是否一起做**：本 ADR 不做。x 轴共享是常见双轴的最小形态；x/y 双向 overlay 需要单独设计 scale domain 合并与 axis collision。
- **Reference / Relation mark 是否支持**：第一版只覆盖有常规 x/y position encoding 的 mark；reference line / relation projection 后续再加。

## DSL 表面

React 双 y 轴：

```tsx
<Plot data={data}>
  <Axis dimension="x" title="name" />
  <Axis id="left" dimension="y" placement={{ kind: 'side', side: 'left' }} title="pv" />
  <Axis id="right" dimension="y" placement={{ kind: 'side', side: 'right' }} title="uv" />
  <PathMark x="name" y="pv" yAxisId="left" />
  <PathMark x="name" y="uv" yAxisId="right" />
</Plot>
```

React 仍可使用底层 composition：

```tsx
<Plot data={data} composition={composition}>
  <PathMark coordinateScope="rainfall" x="day" y="rainfall" />
</Plot>
```

Vanilla builder：

```ts
const spec = plotBuilder({ data: { reference: 'weather' }, scales: [] })
  .axis({ type: 'axis', id: 'left', dimension: 'y' })
  .axis({ type: 'axis', id: 'right', dimension: 'y', placement: { kind: 'side', side: 'right' } })
  .path({ type: 'path', yAxisId: 'left', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } })
  .path({ type: 'path', yAxisId: 'right', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } })
  .build();
```

## 测试设计

- schema 层确认 `yAxisId` 不进入 `@retikz/plot` IR；输出 PlotSpec 仍由 `PlotSpecSchema` 解析。
- React adapter 测试确认 `<PathMark yAxisId>` 生成 overlay composition 与 mark `coordinateScope`。
- Vanilla builder 测试确认 `.path({ yAxisId })` 输出同构 PlotSpec。
- 错误路径覆盖缺失 axis、dimension 不匹配、重复 axis id、`coordinateScope` 与 `yAxisId` 同时出现。
- docs demo 用双 y 轴 sugar 替换当前手写 composition 的多坐标 scope 示例。

## 影响

- `@retikz/plot` IR schema 不变。
- `@retikz/plot-react` position mark props 增加 `yAxisId`，`buildPlotSpec` 增加 axis binding normalization。
- `@retikz/plot-vanilla` builder 输入类型增加 adapter-only `yAxisId`，`build()` 前展开为 PlotSpec。
- docs coordinate composition 页需要把多坐标 scope demo 改成 axis binding sugar，并在正文解释“底层仍会展开为 composition”。
- 现有显式 composition 写法继续可用，适合 facet / track / advanced scope control。

## 不在本 ADR 范围

- 不新增 `xAxisId`。
- 不设计 facet sugar，例如 `facetBy`、`facet={{ column: ... }}`。
- 不设计 track sugar，例如 `trackId`、`track={{ scaffold, id }}`。
- 不把 `yAxisId` 写进 `@retikz/plot` IR schema。
- 不做 tooltip / legend / interaction binding。
- 不做完整 `<Composition>` / `<Scope>` 结构化 DSL；它是后续高级 DSL 方向。

---

## 实现契约（必填）

### Level

本 ADR 自评 level：`yellow`。

原因：不改 `@retikz/plot` IR schema，但新增 React / Vanilla authoring surface，并让 adapter 自动生成 composition。若实现发现必须修改 `@retikz/plot` lowering 才能保证共享 x domain，应升级为 `red` 并回到设计阶段补充契约。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/**` | 无 | 无 | 无 | 无 | 不修改 PlotSpec / MarkOperation / AxisGuide IR schema |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `PathMarkProps.yAxisId` | `string | undefined` | 无 | React adapter 绑定 y axis 的 sugar，不进 IR |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `PointMarkProps.yAxisId` | `string | undefined` | 无 | React adapter 绑定 y axis 的 sugar，不进 IR |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `IntervalMarkProps.yAxisId` | `string | undefined` | 无 | React adapter 绑定 y axis 的 sugar，不进 IR |
| `packages/graph/plot-vanilla/src/plot-builder.ts` | 加 | builder mark input `yAxisId` | `string | undefined` | 无 | Vanilla builder 绑定 y axis 的 sugar，build 输出前移除 |

### 文件 scope

- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/src/plot-builder.ts`
- `packages/graph/plot-vanilla/tests/plot-builder.test.ts`
- `apps/docs/src/contents/graph/grammar/coordinate/composition/**`
- `packages/graph/_notes/decisions/v0/v0.1/alpha.14/roadmap.md`

### 测试象限

**Happy path**

- `react_y_axis_binding_generates_overlay_composition`：两个 y axis id 生成 default scope + overlay scope。
- `react_axis_binding_marks_receive_coordinate_scope`：不同 `yAxisId` 的 mark 输出不同 `coordinateScope`。
- `vanilla_axis_binding_matches_react_plot_spec`：Vanilla builder 输出与 React sugar 同构。

**边界**

- `axis_binding_omitted_keeps_single_coordinate`：没有 `yAxisId` 时不生成 composition。
- `explicit_composition_with_same_named_scope_accepts_y_axis_id`：已有同名 scope 时只做绑定校验，不改 composition。
- `axis_id_scale_name_is_stable`：`Axis id="rainfall"` 派生 `__y.rainfall`。

**错误路径**

- `missing_y_axis_id_rejected`：mark 引用不存在的 y axis id fail-loud。
- `y_axis_id_dimension_mismatch_rejected`：引用到非 y axis fail-loud。
- `duplicate_axis_id_rejected`：同 dimension 下重复 axis id fail-loud。
- `coordinate_scope_and_y_axis_id_conflict_rejected`：mark 同时写 `coordinateScope` 与 `yAxisId` fail-loud。

**交互**

- `axis_binding_preserves_axis_grid_targeting`：带 `grid` 的 y axis 在生成 scope 后仍按 ADR-07 行为投放 grid。
- `axis_binding_provenance_uses_generated_scope`：lowering 后 mark / axis meta 带生成的 coordinateScope。
- `axis_binding_with_default_x_axis_shares_x_scale`：生成 scopes 共享 `__x` scale name。

### 依赖的现有元素

- ADR-01：coordinate scope registry 与 `coordinateScope` 引用机制（扩展使用）。
- ADR-03：same-panel overlay scope 语义（扩展使用）。
- ADR-06：React / Vanilla adapter surface 与 provenance scope 输出（扩展使用）。
- ADR-07：axis-level grid targeting；axis binding 不得破坏 `Axis.grid` 的目标选择语义（兼容使用）。
- `PlotSpecSchema`：验证 adapter 输出仍是合法 IR（引用）。
