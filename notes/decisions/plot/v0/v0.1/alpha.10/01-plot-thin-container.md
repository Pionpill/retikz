# ADR-01：退化 `<Plot>` 为薄容器

- 状态：Accepted
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot v0.2 roadmap](../../v0.2/roadmap.md) · [plot-design](../../../../../architecture/plot-design.md)

## 背景

v0.1 的 React 绑定定位是「薄 `<Plot>` + 组合 DSL」，但旧实现会在 cartesian2D 且用户未写 `<Axis>` 时自动注入默认 x/y 轴与 y 网格。这样 `<Plot>` 同时承担底层容器和开箱即用 chart 两种角色，导致手动控制轴 / 网格时要绕 `bare`，也让 v0.2 `<Chart>` 缺少干净的上层位置。

alpha.10 将 `<Plot>` 收敛为底层绘图块：不自动生成可见装饰，轴 / 图例 / 网格由用户显式组合；开箱即用装饰留给 v0.2 `<Chart>`。

## 决策

1. **移除默认轴注入**：`buildPlotSpec` 不再 fallback 到 `DEFAULT_GUIDES`。不写 `<Axis>` 就没有轴 / 网格。
2. **保留不可见推断**：scale / coordinate / color scale 推断继续存在，用于 mark 定位和 `<Legend>` 绑定。
3. **保留显式 guide**：`<Axis>` / `<Legend>` 正常收集、生效、留边距；网格仍通过 `<Axis grid>` 声明，不新增 `<Grid>`。
4. **删除 `bare`**：薄 Plot 默认态已经表达「不写 guide 就只画数据层」；继续保留 `bare` 会形成第二套忽略显式 guide / margin 的模式。
5. **用 `<Scale>` 替代 `scaleX` / `scaleY`**：显式位置 scale 改由 `<Scale dimension="x|y|angle|radius" type="linear|time|point|log|sqrt" />` 声明，polar 下 `x/y` 可作为 `angle/radius` 别名。
6. **新增 Plot 级调色板**：`PlotSpec.colors` / `<Plot colors>` 控制默认 mark 颜色与分类 color scale range；缺省仍使用 `schemeCategory10`。
7. **抽出装饰函数**：默认轴 / 网格补齐逻辑保留为 `decorateDefaultGuides(spec)`，本轮 `<Plot>` 不调用，后续 v0.2 `<Chart>` 复用。

```tsx
// alpha.10 后：不写 Axis 就只画数据层
<Plot data={rows}>
  <LineMark x="t" y="v" />
</Plot>

// 需要轴 / 网格时显式组合
<Plot data={rows}>
  <LineMark x="t" y="v" />
  <Axis dimension="x" />
  <Axis dimension="y" grid />
</Plot>
```

## 影响

- **Breaking（alpha 间）**：`<Plot>` 不再自动补 x/y 轴；`bare` / `scaleX` / `scaleY` 从 DSL props 删除。
- **迁移**：显式添加 `<Axis>`；删除 `bare`；用 `<Scale>` 替代 `scaleX` / `scaleY`。
- **新增 API**：`<Scale>`、`<Plot colors>`、`PlotSpec.colors`。
- **文档**：依赖默认轴的 demo 需要补 `<Axis>`；Plot 文档需说明薄容器语义与迁移方式。
- **非目标**：不实现 `<Chart>`、不下沉 chart 装饰模块、不新增 `<Grid>`。

## 实现契约

### Level

`red`

原因：本轮不只是装配层行为变更，还包含 `PlotSpec.colors` schema / lowering 与 `<Scale>` / `colors` 公开 API 收口。

### Schema 改动

| Schema | 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `PlotSpecSchema` | `colors` | `z.array(z.string().min(1)).min(1).optional()` | 否 | Plot 级默认调色板；分类 color scale 缺 range 时使用，无 color 编码 mark 按 layer index 取色 |

### 文件 Scope

- `packages/plot/react/src/components/build-plot-spec.ts`：移除默认轴注入，抽 `decorateDefaultGuides`。
- `packages/plot/react/src/components/scales.tsx`：新增 `<Scale>`。
- `packages/plot/react/src/Plot.tsx`：删除 `bare` / `scaleX` / `scaleY`，透传 `colors`。
- `packages/plot/react/src/index.ts`、`packages/plot/react/src/components/index.ts`：导出 `<Scale>`，移除旧 scale prop 类型。
- `packages/plot/plot/src/ir/plot.ts`：新增 `PlotSpec.colors`。
- `packages/plot/plot/src/lower/expand.ts`、`lower/mark.ts`、`lower/scale.ts`：接入默认调色板。
- `packages/plot/react/tests/**`、`packages/plot/plot/tests/**`：覆盖行为和 schema。
- `apps/docs/src/contents/plot/**`、`apps/docs/src/data/changelog.ts`：同步文档与 changelog。

### 测试矩阵

- `thin_plot_no_default_axes`：DSL 无 `<Axis>` 时 `guides` 不含默认 x/y 轴。
- `thin_plot_explicit_axis_kept`：显式 `<Axis>` 进入 `guides` 并影响边距。
- `thin_plot_inference_unchanged`：scale / coordinate / color 推断保持。
- `bare_removed`：类型与文档不再暴露 `bare`。
- `scale_child_override`：`<Scale>` 装配到对应维度，重复 / 非法维度 fail-loud。
- `decorate_default_guides_equivalent`：抽出的装饰函数产物等价旧默认轴注入产物。
- `plot_colors_palette`：`colors` 控制 mark 默认颜色与 ordinal color range。
- `spec_entry_zero_regression`：`<Plot spec data>` 全显式入口不受默认轴变更影响。
