# ADR-08: React axis binding sugar for overlay scopes

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md) 与 [beta.2 ADR-02](../beta.2/02-plot-vanilla-plain-api.md)；axis binding sugar 现由共享 framework-neutral normalization 展开
- 决策日期：2026-06-29
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-06 scope provenance surface](./06-scope-provenance-surface.md) · [ADR-07 axis-level grid targeting](./07-axis-grid-targeting.md)

## 背景

ADR-01 到 ADR-07 已经把 IRPlot 内部的 `composition`、`coordinateScope`、overlay scope、guide binding 和 grid targeting 串起来。这个模型适合作为 IR 和程序化底层契约，但 React DSL 用户写常见双轴图时仍然要理解并手写：

- `composition.defaultScope`
- `composition.scopes`
- `placement: { kind: 'overlay', target: ... }`
- mark / axis 上的 `coordinateScope`

这对“左轴画 temperature，右轴画 rainfall”这类常见图表来说过重。Recharts 的多轴 API 更接近用户心智：先声明 `<YAxis yAxisId="right" />`，再让 `<Line yAxisId="right" />` 绑定到那根轴。用户想表达的是“这条 mark 用哪根轴”，不是“我要先注册哪个 coordinate scope”。

同时，不能把 API 设计成只服务 dual-axis 的临时白名单。facet、track、scope composition 后续也需要类似“mark 绑定到某个结构身份”的 authoring sugar。因此本 ADR 把方案命名为 **axis binding sugar**：第一步只落 overlay 多 y 轴，但模型要能自然扩展到 facet / track binding。

## 决策：adapter 生成 composition，用户绑定 axis id

新增 adapter-level axis binding sugar。用户在 React / Vanilla authoring 层用 axis id 绑定 mark；adapter 在生成 IRPlot 时展开为现有 `composition` 与 `coordinateScope`，不新增 IR schema。

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

展开后的 IRPlot 仍然使用 composition：

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

Vanilla builder 使用同一 sugar 字段，但只在 builder 输入层存在；`build()` 输出的 IRPlot 不保留 `yAxisId`：

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
8. `Axis id` 在 adapter 中承担 binding id；在输出 IRPlot 中仍保留为 guide handle，供 provenance / docs / future anchor 使用。
9. 若同一 dimension 下出现重复 `Axis id`，adapter fail-loud。
10. 若一个 mark 同时写 `coordinateScope` 和 `yAxisId`，adapter fail-loud，避免两个定位入口互相覆盖。

## 理由

1. 常见多轴图的 authoring 心智是“mark 绑定 axis”，不是“mark 绑定 scope”。
2. 不新增 IR schema，保证现有 composition 仍是单一真源。
3. `Axis id` 是用户可命名对象，比 `coordinateScope` 更接近 Recharts / charting 用户经验。
4. 只先做 `yAxisId`，避免一次性设计 x/y overlay 矩阵、facet binding、track binding 过度展开。
5. Vanilla builder 也支持同一 sugar 字段，保持 authoring surface 对等；但字段在 builder 输出前消失，不污染 IR。

## 长期边界

- 不新增 `xAxisId`。
- 不设计 facet sugar，例如 `facetBy`、`facet={{ column: ... }}`。
- 不设计 track sugar，例如 `trackId`、`track={{ scaffold, id }}`。
- 不把 `yAxisId` 写进 `@retikz/plot` IR schema。
- 不做 tooltip / legend / interaction binding。
- 不做完整 `<Composition>` / `<Scope>` 结构化 DSL；它是后续高级 DSL 方向。
