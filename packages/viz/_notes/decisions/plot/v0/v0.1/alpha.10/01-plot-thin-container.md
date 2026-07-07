# ADR-01：退化 `<Plot>` 为薄容器

- 状态：Accepted
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot v0.2 roadmap](../../v0.2/roadmap.md) · [plot-design](../../../../../architecture/plot-design.md)

## 背景

塑造决策的硬约束：

- v0.1 React 绑定定位是「薄 `<Plot>` + 组合 DSL」，但旧实现在 cartesian2D 且无 `<Axis>` 时自动注入默认 x/y 轴与 y 网格，使 `<Plot>` 同时承担底层容器与开箱即用 chart 两种角色。
- 手动控制轴 / 网格须绕 `bare`，且 v0.2 `<Chart>` 缺少干净的上层位置承接开箱即用装饰。

## 决策

`<Plot>` 收敛为底层绘图块：不自动生成可见装饰，轴 / 图例 / 网格由用户显式组合；开箱即用装饰留给 v0.2 `<Chart>`。

1. **移除默认轴注入**：`buildPlotSpec` 不再 fallback 到 `DEFAULT_GUIDES`；不写 `<Axis>` 就没有轴 / 网格。
2. **保留不可见推断**：scale / coordinate / color scale 推断继续存在，用于 mark 定位与 `<Legend>` 绑定。
3. **保留显式 guide**：`<Axis>` / `<Legend>` 正常收集、生效、留边距；网格仍通过 `<Axis grid>` 声明，不新增 `<Grid>`。
4. **删除 `bare`**：薄 Plot 默认态已表达「不写 guide 就只画数据层」，保留 `bare` 会形成第二套忽略显式 guide / margin 的模式。
5. **用 `<Scale>` 替代 `scaleX` / `scaleY`**：显式位置 scale 改由 `<Scale dimension="x|y|angle|radius" type="linear|time|point|log|sqrt" />` 声明；polar 下 `x/y` 可作为 `angle/radius` 别名。
6. **新增 Plot 级调色板**：`PlotSpec.colors` / `<Plot colors>` 控制默认 mark 颜色与分类 color scale range；缺省仍用 `schemeCategory10`。
7. **抽出装饰函数**：默认轴 / 网格补齐逻辑保留为 `decorateDefaultGuides(spec)`，本轮 `<Plot>` 不调用，由后续 v0.2 `<Chart>` 复用。

定稿 schema：

```
PlotSpecSchema.colors: z.array(z.string().min(1)).min(1).optional()
// Plot 级默认调色板；分类 color scale 缺 range 时使用，
// 无 color 编码的 mark 按 layer index 取色
```

### 代价

- **Breaking（alpha 间）**：`<Plot>` 不再自动补 x/y 轴；`bare` / `scaleX` / `scaleY` 从 DSL props 删除。迁移路径为显式加 `<Axis>`、用 `<Scale>` 替代旧 scale prop。
- 依赖默认轴的文档 demo 需补 `<Axis>`。

## 被否决的选项

- **保留 `bare` 作为「只画数据层」开关**：薄 Plot 默认态已等价表达该语义，保留 `bare` 会形成第二套忽略显式 guide / margin 的并行模式。
- **新增 `<Grid>` 组件**：网格语义归并入 `<Axis grid>`，避免拆出独立 guide 实体。

## 不在本 ADR 范围

- 不实现 `<Chart>`、不下沉 chart 装饰模块（开箱即用装饰留待 v0.2 `<Chart>` 复用 `decorateDefaultGuides`）。
- 不新增 `<Grid>`。

## 实现指针

落地于 `@retikz/plot`（`plot/src/ir/plot.ts`、`lower/*`）与 `@retikz/plot-react`（`react/src/Plot.tsx`、`components/build-plot-spec.ts`、`components/scales.tsx`），行为与 schema 覆盖见 `packages/viz/plot-react/tests/**`、`packages/viz/plot/tests/**`；文档同步见 `apps/docs/src/modules/docs/contents/viz/**`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 13765be7:_notes/decisions/plot/v0/v0.1/alpha.10/01-plot-thin-container.md`（封板全文）。
