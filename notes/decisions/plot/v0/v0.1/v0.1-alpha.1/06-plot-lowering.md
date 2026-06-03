# ADR-06：最薄 lowering 纵向闭环（lowerPlots：Plot IR + 数据 → core IR）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot-design.md §8 / §8.1 / §8.2 / §8.3](../../../../../architecture/plot-design.md) · 依赖：[ADR-01](./01-plot-spec-root.md) · [ADR-02](./02-plot-data.md) · [ADR-03](./03-plot-scale.md) · [ADR-04](./04-plot-coordinate.md) · [ADR-05](./05-plot-encoding-mark.md)

## 背景

ADR-01~05 定了 Plot IR（配置）但**零行为**。本 ADR 落「逻辑」层(plot-design §8.2)：把 `(Plot IR + 外部数据)` 下沉成 core IR(`Scope` / `Node` / `Path` / `Step`)，跑通最薄端到端——单 mark(point / line)· linear scale · cartesian2D，产出无轴散点 / 折线。这是 plot-design §13.1「最薄纵向闭环」的收口。

数据不进 IR(§3.1)：`lowerPlots(datasets)` 闭包 `datasets`，经 core `CompileOptions.composites` 注册，`compileToScene` 第一步 `lowerComposites` 调 `expand` 展开。renderer 后端只见 lowered core IR。

## 决策：`lowerPlots(datasets, options?)` → `CompositeDefinition[]`，expand 投影下沉

```ts
// packages/plot/plot/src/lowering/lowerPlots.ts
import { defineComposite, type CompositeDefinition } from '@retikz/core';
import { PlotSpecSchema } from '../ir';
import type { ExternalDatasets } from '../ir';

export type LowerPlotsOptions = {
  width?: number;   // 绘图区宽，默认 480（尺寸是渲染选项、不进 IR）
  height?: number;  // 绘图区高，默认 300
};

export const lowerPlots = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): Array<CompositeDefinition> => [
  defineComposite({
    schema: PlotSpecSchema,
    expand: node => expandPlot(node, datasets, options),
  }),
];
```

`expandPlot(node, datasets, options)` 步骤：

1. `rows = datasets[node.data.ref]`；缺则抛含 ref 名的清晰错。
2. 建 scale 求值：对 cartesian2D 的 `coordinate.x` / `coordinate.y` 找对应命名 scale；
   - domain：用 `scale.domain`，否则从「绑到该轴的 mark 字段值」求 `[min, max]`(绑定期推断)；
   - range：x = `[0, width]`，y = `[height, 0]`(screen y-down，数据大值在上)；用 `scale.range` 覆盖；
   - 线性映射 `v ↦ r0 + (v - d0)/(d1 - d0) * (r1 - r0)`(d1=d0 时取区间中点防除零)。
3. 字段取值：`field` 路径 `a.b.c` 对 row 解析(`resolveFieldPath`)；`value` 取常量。结果须为有限数(位置通道)。
4. 投影每行 → `[xScale(xv), yScale(yv)]`。
5. mark 下沉：
   - **point** → 每行一个 circle `Node`(`{ type:'node', shape:'circle', position, minimumSize, fill }`)；
   - **line** → 一条 `Path`，steps = `move`(首点) + `line`(后续点)；点序按 `order` 字段升序，否则数据数组序。
6. 用一个 `localNamespace` `Scope` 包裹所有 mark 产物；`Scope.id` = `node.id`(§8.1：root id → 外层 Scope.id 外部句柄)；mark `id` 暂记入 `<plotId>.` 前缀的子 Scope（alpha.1 仅埋，不解析）。
7. 返回该 Scope(`IRChild`)。

理由：

1. **复用 core 既有通道**：`CompositeDefinition` + `CompileOptions.composites`，零 core 改动(§8.2)。
2. **尺寸是渲染选项、不进 IR**：`LowerPlotsOptions.width/height` 带默认；保持 IR 纯数据-配置，未来要进 IR 可非破坏迁移。
3. **alpha.1 笛卡尔不写死**：投影走 `coordinate` 分发的小函数，point/line 产几何时只依赖「已投影的点」，为 alpha.4 polar(§8.3 路线)留接口——本 ADR 不引入 polar，但不堵 (i) 通用投影路线。
4. **id 绑定**(§8.1)：root id → 外层 Scope.id，使整图可被连接 / 组合。

## 待决策点

- **散点 glyph**：用 circle `Node` + `minimumSize`(默认半径 ~3)。备选画小 Path 圆。倾向 Node circle(最简、可被 anchor)。
- **point/line 默认样式**：alpha.1 给最简默认(黑色描边/填充、strokeWidth 1)；主题 / config 层留后续。
- **domain 推断含 null / 非数**：alpha.1 跳过 null、非有限值经 `onWarn` 警告并丢弃该点（不抛断编译）。

## DSL 表面

```ts
import { compileToScene } from '@retikz/core';
import { lowerPlots, type PlotSpec } from '@retikz/plot';

const spec: PlotSpec = {
  namespace: 'plot', type: 'plot',
  data: { ref: 'sales' },
  scales: [{ type: 'linear', name: 'xMonth' }, { type: 'linear', name: 'yRevenue' }],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};
const datasets = { sales: [{ month: 0, revenue: 10 }, { month: 1, revenue: 14 }, { month: 2, revenue: 9 }] };

const scene = compileToScene(
  { version: 1, type: 'scene', children: [spec] },
  { composites: lowerPlots(datasets, { width: 480, height: 300 }) },
); // → 含折线 Path 的 Scene
```

## 测试设计

`packages/plot/plot/tests/lowering/lowerPlots.test.ts`(新建)端到端 + 单元覆盖：lower 产出 core IR 结构 / `compileToScene` 出 Scene / domain 推断 / 常量通道 / 路径顺序 / ref 缺失报错。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/lowering/*`**(全新)：`lowerPlots` + 投影 / scale / 字段解析 helper。
- **`src/index.ts`**：公开 `lowerPlots` / `LowerPlotsOptions`。
- **对 core**：仅消费 `compileToScene` / `defineComposite` / `CompositeDefinition` / IR 类型；不改 core。
- **文档站**：此 ADR 端到端能出图，是 plot 首个可视产出 → develop-document 阶段补 plot 文档分组首页 + 散点/折线 demo（本 ADR 实现契约不含 mdx，留 stage 4）。
- **对外 API**：`@retikz/plot` 公开 `lowerPlots`。

## 不在本 ADR 范围

- **guide(轴 / 网格)** → alpha.2；本 ADR 产「无轴」散点 / 折线。
- **band / time scale、bar / area mark、polar** → alpha.3 / alpha.4。
- **anchor / scope 解析、datum locator** → alpha.5(本 ADR 仅按 §8.1 绑 id)。
- **绘图区尺寸进 IR** → 暂作 lowerPlots 选项；后续如需进 IR 非破坏迁移。
- **主题 / config 默认层** → 后续。

---

## 实现契约（必填）

### Level

`red`（动 `packages/plot/plot/src/lowering/**` + `src/index.ts`）。

### Schema 改动

无（lowering 不新增 / 改 IR schema；尺寸是 `lowerPlots` 运行时选项，不进 IR）。

### 文件 scope

- `packages/plot/plot/src/lowering/lowerPlots.ts`（新建）
- `packages/plot/plot/src/lowering/index.ts`（新建：barrel）
- `packages/plot/plot/src/index.ts`（修改：转出 lowering）
- `packages/plot/plot/tests/lowering/lowerPlots.test.ts`（新建）

### 测试象限

**Happy path**：

- `lower_line_produces_path`：line mark → 一条 Path(steps = move + N-1 line)，点序正确
- `lower_point_produces_nodes`：point mark → N 个 circle Node
- `compile_line_to_scene_ok`：`compileToScene(scene, {composites:lowerPlots(data)})` 不抛、产 Scene

**边界**：

- `domain_inferred_from_data`：省略 scale.domain → 从数据字段推 [min,max]，端点映射到 range 端
- `lower_single_datum`：1 行数据 → point 1 个 Node / line 仍 ≥2 step（退化处理或最小折线）

**错误路径**：

- `ref_not_in_datasets_throws`：`data.ref` 不在 datasets → 抛含 ref 名的错
- `non_finite_field_skipped_or_warned`：字段值非有限 → 经 onWarn 丢该点，不污染坐标

**交互**：

- `explicit_domain_range_respected`：显式 domain/range → 按用户值，不推断
- `order_field_sorts_line`：line 带 `order` 字段 → 按该字段升序连点（乱序数据也连对）

### 依赖现有元素

- `@retikz/core` 的 `compileToScene` / `defineComposite` / `CompositeDefinition` / IR 类型（`packages/core/core/src`）—— **消费**：lowering 目标与注册通道；不改 core。
- [ADR-01~05](./01-plot-spec-root.md) 的 Plot IR schema / 类型 —— **消费**：`PlotSpecSchema`（composite schema）、`ExternalDatasets`、各 mark/scale/coordinate 类型。
