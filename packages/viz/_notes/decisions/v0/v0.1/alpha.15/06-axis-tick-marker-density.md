# ADR-06：Axis tick 来源、标记与密度策略

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 axis 拆成 line、ticks、tickLabels、title、grid 五个部件槽位，并让 `ticks` 同时承担 tick source 与 tick mark 的局部样式。当前 `ticks.count` 只是目标数量提示：未提供显式 `ticks.values` 时，plot 把它交给对应 scale 的 `ticks(count)`，最终数量由 scale family 和 nice 区间决定；提供 `ticks.values` 时则完整使用用户给定值。

`count` 与 `values` 之间还缺少一种常见表达：按固定间隔生成 ticks。数值轴经常需要“每 10 一个 tick”，时间轴经常需要“每 1 个月 / 每 7 天一个 tick”，分类轴有时需要“每隔 2 个类目一个 tick”。这些都不应塞进 label 规则，也不应要求用户提前枚举所有 `values`。

这个模型能覆盖常规轴，但有两个缺口。

第一，tick mark 现在只有短线。数学图、坐标纸、工程图或教学图里常见三角、圆点、菱形、箭头状刻度等标记。如果 plot 为每种 tick 形态单独造字段，会变成 parallel shape system。core Node 已经有开放 shape 引用：`shape` 可指向内置 shape 或 `CompileOptions.shapes` 注册的自定义 shape，plot 应复用这套能力。

第二，tick 太多时目前没有统一降噪入口。用户可以手动降低 `ticks.count`，但 `count` 不是硬上限；用户也可以写 `ticks.values` 或 `ticks.interval`，但候选 tick 过多时仍会全部渲染。tick mark 和 grid 共享同一 tick set，如果不在 guide 层定义“可见 tick set”的抽稀策略，后续每个 coordinate / grid 分支都会各自处理，结果不可预测。

## 决策：tick source、tick mark 与 tick density 分层

Axis tick 保持三层语义：

1. `ticks.values` / `ticks.interval` / `ticks.count` 决定候选 tick set。
2. `ticks.density` 在候选 tick set 上做确定性抽稀，得到可见 tick set。
3. `ticks.mark` 决定每个可见 tick 位置画什么标记。

```ts
const xAxis = {
  type: 'axis',
  dimension: 'x',
  ticks: {
    interval: { kind: 'number', step: 10 },
    density: { kind: 'sample', maxCount: 8, minGap: 36 },
    mark: {
      kind: 'triangle',
      size: 6,
      orientation: 'outward',
      fill: 'currentColor',
    },
  },
};
```

`ticks.count` 继续是 scale tick 的目标数量提示，不承诺最终数量。`ticks.values` 继续优先于其它来源。`ticks.interval` 是新增候选 tick source，优先级低于 `values`、高于 `count`。`ticks.density` 缺省为 `{ kind: 'all' }`，保持当前行为；只有显式配置时才会抽稀，无论候选 tick set 来自 `values`、`interval` 还是 scale `count`。

```ts
type GuideTickInterval =
  | {
      kind: 'number';
      step: number;
      anchor?: number;
    }
  | {
      kind: 'time';
      unit: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
      step?: number;
      anchor?: string | number;
    }
  | {
      kind: 'category';
      step: number;
      offset?: number;
    };
```

`interval` 的规则固定如下：

- `number` interval 只适用于 numeric tickKind 的连续位置 scale，`step` 必须为正数；`anchor` 省略时以 scale domain lower bound 为起点对齐。
- `time` interval 只适用于 time tickKind，`step` 省略时为 1；`anchor` 可为 epoch ms 或 ISO-like string，省略时以 scale domain lower bound 为起点对齐。
- `category` interval 只适用于 category tickKind，`step` 必须为正整数；`offset` 省略时为 0，表示从第一个 category 开始每隔 `step` 个候选一个 tick。
- `values` 与 `interval` 同时存在时，`values` 优先；`count` 与 `interval` 同时存在时，`interval` 优先。schema 不拒绝低优先级字段，但 `.describe(...)` 与 docs 必须明确优先级，避免 LLM 误以为字段会组合生效。

```ts
type AxisTickDensity =
  | { kind: 'all' }
  | {
      kind: 'sample';
      maxCount?: number;
      minGap?: number;
      preserveEnds?: boolean;
    };
```

`sample` 的规则固定如下：

- `maxCount` 是可见 tick 的硬上限，必须为正整数。
- `minGap` 是相邻可见 tick 在轴向投影上的最小间距，单位为 plot user units。
- `maxCount` 与 `minGap` 至少提供一个。
- `preserveEnds` 省略时为 `true`，优先保留候选 tick set 的首尾 tick；首尾间距不足时仍保留首尾，避免 domain 边界丢失。
- 抽稀算法必须稳定、无随机、保持原 tick 顺序。

`ticks.mark` 是新的 tick 标记槽位：

```ts
type AxisTickMark =
  | false
  | {
      kind: 'line';
      length?: number;
      line?: false | GuideLineStyle;
    }
  | AxisBuiltinShapeTickMark
  | AxisCustomShapeTickMark;

type AxisShapeTickMarkBase = {
  size?: number;
  width?: number;
  height?: number;
  offset?: number;
  orientation?: 'outward' | 'inward' | 'axis' | 'fixed';
  rotate?: number;
  fill?: PaintValue;
  stroke?: PaintValue;
  strokeWidth?: number;
  opacity?: number;
  drawOpacity?: number;
};

type AxisBuiltinShapeTickMark = AxisShapeTickMarkBase & {
  kind: 'circle' | 'square' | 'triangle' | 'diamond';
};

type AxisCustomShapeTickMark = AxisShapeTickMarkBase & {
  kind: 'custom';
  shape: string | { type: string; params?: JsonObject };
};
```

`kind: 'line'` 是当前短线 tick 的正规形态。为降低迁移成本，`ticks.length` 与 `ticks.line` 保留为 line mark shorthand：当 `ticks.mark` 省略时，`ticks.length` / `ticks.line` 按现有逻辑生成 line tick；当 `ticks.mark` 存在时，`ticks.length` / `ticks.line` 不得同时出现，避免两套 tick mark 配置互相覆盖。

内置 shape mark lowering 到 core Node：

- `circle` lowering 为 core Node `shape: 'circle'`。
- `square` lowering 为 core Node `shape: 'rectangle'`，并使用相同宽高。
- `triangle` lowering 为 core Node `shape: { type: 'polygon', params: { sides: 3 } }`。
- `diamond` lowering 为 core Node `shape: 'diamond'`。

`kind: 'custom'` lowering 到 core Node：

- `shape` 直接复用 core `ShapeRefSchema` 的输入形态，允许内置 shape、自定义 shape 名和 `{ type, params }`。
- `size` 映射到 core Node `minimumSize`；`width` / `height` 分别映射到 `minimumWidth` / `minimumHeight`，优先级高于 `size`。
- `offset` 表示 shape 中心相对轴线沿 tick 法线的偏移；省略时使用有效宽高最大值的一半，使标记大致贴近轴线。
- `orientation: 'outward'` 让 shape 的局部朝向随 tick 外侧方向旋转；`inward` 相反；`axis` 沿轴线切向；`fixed` 使用显式 `rotate` 或 0。
- `fill`、`stroke`、`strokeWidth`、`opacity`、`drawOpacity` 映射到 core Node 同名或同义样式字段。

Theme 可以为 tick mark 提供视觉默认，但不能提供 tick source 或 density 默认：

```ts
type PlotAxisTheme = {
  ticks?: {
    mark?: false | AxisTickMark;
  };
};
```

`theme.axis.ticks.mark` 只影响默认 tick 标记外观；`ticks.count`、`ticks.values`、`ticks.interval`、`ticks.density` 仍是 guide 语义，必须写在具体 guide 上。

理由：

1. `count` 是候选 tick 生成提示，`density` 是可见 tick 抽稀策略，分开后用户能理解“为什么 count 不等于最终数量”。
2. `ticks.mark.kind` 比把三角等形态塞进 `ticks.line` 更准确，也为以后 minor ticks / major ticks 留出扩展空间。
3. 内置常见 kind 覆盖高频图表需求，`custom` 复用 core Node shape，不新增 plot-only shape provider。
4. density 对 tick mark 和 grid 使用同一可见 tick set，避免 tick mark 抽稀但 grid 不抽稀的默认不一致。
5. Theme 只给 tick mark 外观默认，不控制 tick source 或 density，避免全局 theme 改变图表阅读粒度。

## 待决策点

无。label 相关能力后一轮单独讨论；本 ADR 只处理 ticks 本身。

## DSL 表面

三角形 tick mark：

```tsx
<Axis
  dimension="x"
  ticks={{
    count: 10,
    mark: {
      kind: 'triangle',
      size: 6,
      orientation: 'outward',
      fill: 'currentColor',
    },
  }}
/>
```

按固定数值间隔生成 tick：

```tsx
<Axis
  dimension="x"
  ticks={{
    interval: { kind: 'number', step: 10, anchor: 0 },
    mark: { kind: 'line', length: 5 },
  }}
/>
```

按固定时间间隔生成 tick：

```tsx
<Axis
  dimension="x"
  ticks={{
    interval: { kind: 'time', unit: 'month', step: 1 },
    mark: { kind: 'circle', size: 4 },
  }}
/>
```

保留短线 tick，但限制密度：

```tsx
<Axis
  dimension="y"
  ticks={{
    count: 30,
    density: { kind: 'sample', maxCount: 8, minGap: 28 },
    mark: { kind: 'line', length: 4, line: { strokeWidth: 1 } },
  }}
  grid
/>
```

显式 tick 值也可抽稀：

```tsx
<Axis
  dimension="x"
  ticks={{
    values: Array.from({ length: 101 }, (_, index) => index),
    density: { kind: 'sample', maxCount: 11 },
  }}
/>
```

Vanilla builder 暴露同名 plain object；所有字段必须 JSON-safe，不接受函数、ReactNode、DOM 节点或 renderer 对象。

## 测试设计

`packages/viz/plot/tests/ir/guide.schema.test.ts` 覆盖 schema accept / reject。

`packages/viz/plot/tests/providers/scale/guide-ticks.test.ts` 或现有 scale shared 测试覆盖 tick density 的确定性抽稀。

`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 cartesian / polar / ternary / custom axis lowering 中 line mark、内置 shape mark 与 custom shape mark 的 IR 输出。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `GuideTickSourceSchema` 增加 `interval`，作为 `values` 与 `count` 之间的候选 tick source。
- `AxisTicksSchema` 增加 `density` 与 `mark`。
- `ticks.length` / `ticks.line` 保留为 line mark shorthand；与 `ticks.mark` 同时出现时 schema 拒绝。
- `GuideTickSourceSchema` 仍只表示候选 tick 来源，不承载 density 或 mark。
- `resolveGuideTicks` 继续负责候选 tick set；新增共享 helper 负责按投影坐标过滤为 visible tick set。
- coordinate provider 需要在 range / projection 可用后应用 density，使 axis、grid、layout 估算消费同一 visible tick set。
- guide lowering 需要把内置 shape mark 与 `mark.kind: 'custom'` 生成 core Node，而不是 Path tick segment。
- theme schema / resolver 需要把 tick mark 的视觉默认合并进 guide，但不能把 `density`、`count`、`values`、`interval` 合并进去。
- React / Vanilla authoring 若已有 Axis 组件 / builder，应透传新字段，不另造 `tickShape` / `tickMaxCount` 之类 adapter-only API。
- docs 需要补充 tick 数量的解释：`count` 是提示，`values` 是显式候选值，`interval` 是固定间隔候选值，`density` 是可见抽稀。
- 不触碰 core IR；仅消费 core Node `shape` / `minimumSize` / `minimumWidth` / `minimumHeight` / `rotate` 与基础样式字段。

## 不在本 ADR 范围

- 自动文字测量、tick label 防重叠、自动旋转、label-only 抽稀或任何 tickLabels 新字段。
- minor ticks / major ticks 双层刻度。
- tick label formatter 函数。
- grid 独立 density。grid 继续使用 axis visible tick set。
- legend ramp tick mark 形态。legend ramp 可以复用 tick density 的 helper，但不新增 ramp tick mark。
- 新增 core shape provider 或修改 core shape registry。
- chart preset；后续 chart 可消费本 PlotSpec 能力。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema、theme schema 边界、scale tick helper 与 guide / coordinate lowering；不改 core IR、不改 package 公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `GuideTickIntervalKind` | `{ Number:'number', Time:'time', Category:'category' }` | `—` | 固定间隔 tick source kind |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `GuideTickTimeUnit` | millisecond / second / minute / hour / day / week / month / quarter / year | `—` | time interval 的单位 |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTickDensityKind` | `{ All:'all', Sample:'sample' }` | `—` | tick density 策略 kind |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTickMarkKind` | `{ Line:'line', Circle:'circle', Square:'square', Triangle:'triangle', Diamond:'diamond', Custom:'custom' }` | `—` | tick mark 形态 kind |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTickShapeOrientation` | `{ Outward:'outward', Inward:'inward', Axis:'axis', Fixed:'fixed' }` | `fixed` | shape tick 的旋转语义 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `GuideTickIntervalSchema` | discriminated union | `—` | 按固定数值 / 时间 / 分类间隔生成候选 tick |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `GuideTickSourceSchema.interval` | `GuideTickIntervalSchema.optional()` | `—` | 固定间隔候选 tick source；优先级低于 values，高于 count |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickDensitySchema` | discriminated union | `{ kind:'all' }` | 候选 tick set 到 visible tick set 的抽稀策略 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickLineMarkSchema` | `{ kind:'line'; length?: number; line?: false \| GuideLineStyleSchema }` | length 4；line currentColor | 短线 tick mark |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickBuiltinShapeMarkSchema` | `{ kind: circle \| square \| triangle \| diamond; ...AxisTickShapeMarkBase }` | size 4；offset 有效宽高最大值 / 2；orientation fixed | 内置常见 shape tick mark |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickCustomShapeMarkSchema` | `{ kind:'custom'; shape: string \| ShapeRefSchema; ...AxisTickShapeMarkBase }` | size 4；offset 有效宽高最大值 / 2；orientation fixed | 自定义 core Node shape tick mark |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickMarkSchema` | `z.union([z.literal(false), AxisTickLineMarkSchema, AxisTickBuiltinShapeMarkSchema, AxisTickCustomShapeMarkSchema])` | line mark | tick mark 开关与形态 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTicksSchema.density` | `AxisTickDensitySchema.optional()` | all | tick 可见抽稀策略 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTicksSchema.mark` | `AxisTickMarkSchema.optional()` | 由 length / line shorthand 得到 line mark | tick mark 统一槽位 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTicksSchema.length` | `z.number().nonnegative().optional()` | 4 | line mark shorthand；与 `mark` 互斥 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTicksSchema.line` | `z.union([z.literal(false), GuideLineStyleSchema]).optional()` | 渲染 line mark | line mark style shorthand；与 `mark` 互斥 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 改 | `ThemeAxisTicksSchema.mark` | `AxisTickMarkSchema.optional()` | built-in line mark | theme tick mark 默认；不接收 count / values / interval / density |

`GuideTickIntervalSchema` refinement：

- `kind: 'number'` 的 `step` 必须为正数；`anchor` 必须为有限 number。
- `kind: 'time'` 的 `step` 必须为正整数；`anchor` 若为 string，lowering 阶段按 time tick value 的 ISO-like 规则解析。
- `kind: 'category'` 的 `step` 必须为正整数；`offset` 必须为非负整数。
- 与 scale tickKind 不匹配时在 `resolveGuideTicks` 阶段 fail-loud，例如 numeric scale 收到 `{ kind:'time' }`。

`AxisTickDensitySchema` refinement：

- `kind: 'sample'` 时 `maxCount` 与 `minGap` 至少出现一个。
- `maxCount` 必须为正整数。
- `minGap` 必须为非负数。
- `preserveEnds` 为 boolean，省略时 lowering 按 `true`。

`AxisTickBuiltinShapeMarkSchema` / `AxisTickCustomShapeMarkSchema` refinement：

- `size`、`width`、`height`、`offset`、`strokeWidth` 非负。
- `orientation !== 'fixed'` 且 `rotate` 同时出现时合法；最终角度为 orientation 基础角 + rotate。
- `custom.shape` 直接复用 core `ShapeRefSchema`；未注册 shape 在 core compile 阶段 fail-loud。

`AxisTicksSchema` refinement：

- `mark` 与 `length` / `line` 不得同时出现。
- `mark: false` 表示隐藏 tick mark，但仍保留 tick source 供 grid 和后续 label 阶段使用。
- `ticks.line: false` 的旧写法等价于 `mark: { kind:'line', line:false }`。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/constants.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/providers/scale/shared/**`
- `packages/viz/plot/src/providers/coordinate/features/cartesian.ts`
- `packages/viz/plot/src/providers/coordinate/features/polar.ts`
- `packages/viz/plot/src/providers/coordinate/features/ternary.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/tests/ir/guide.schema.test.ts`
- `packages/viz/plot/tests/providers/scale/**`
- `packages/viz/plot/tests/features/guide/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `count remains a hint`：`ticks.count` 传给 scale ticks，最终数量允许不等于 count。
- `number interval generates ticks by fixed step`：numeric scale + `{ kind:'number', step: 10 }` → 候选 tick 按 10 间隔生成。
- `time interval generates ticks by unit and step`：time scale + `{ kind:'time', unit:'month', step: 1 }` → 候选 tick 按月生成。
- `category interval samples domain categories`：category scale + `{ kind:'category', step: 2 }` → 候选 tick 取每隔 2 个 category。
- `tick source priority is stable`：同时出现 values / interval / count 时，候选 tick 采用 `values > interval > count` 优先级。
- `density maxCount caps visible ticks`：候选 20 个 tick + `maxCount: 5` → visible tick 数量不超过 5。
- `density minGap samples by projected distance`：投影间距过密时按 `minGap` 抽稀。
- `explicit values can be sampled`：`ticks.values` 很多 + `density.sample` → 仍可抽稀。
- `line mark shorthand preserves current output`：只写 `length` / `line` → 输出与现有 line tick segment 等价。
- `builtin shape marks lower to nodes`：`circle` / `square` / `triangle` / `diamond` → 每个 visible tick 生成 core Node，带 shape / minimumSize / fill。
- `custom shape mark preserves shape ref`：`mark.kind: 'custom'` → core Node 保留 shape string 或 `{ type, params }`。
- `shape mark orientation follows side`：cartesian top / bottom / left / right 的 `orientation: 'outward'` 旋转方向正确。

**边界**：

- `density omitted renders all ticks`：省略 density → 候选 tick set 全部可见。
- `preserveEnds defaults true`：抽稀后首尾 tick 保留。
- `preserveEnds false allows pure sampling`：显式 `preserveEnds:false` 时首尾不强制保留。
- `mark false hides tick marks but keeps grid source`：`mark:false` 不生成 tick mark，grid 仍按 visible tick set 渲染。
- `shape width height override size`：同时给 `size` 与 `width/height` → minimumWidth / minimumHeight 优先生效。

**错误路径**：

- `sample density requires limit`：`{ kind:'sample' }` schema 拒绝。
- `negative minGap rejected`：`minGap < 0` schema 拒绝。
- `non-positive maxCount rejected`：`maxCount <= 0` 或非整数 schema 拒绝。
- `non-positive interval step rejected`：number / time / category interval 的 `step <= 0` schema 拒绝。
- `interval kind mismatches scale fail loud`：numeric scale 收到 time interval、time scale 收到 category interval 时 lowering 抛清晰错误。
- `mark conflicts with length or line rejected`：`ticks.mark` 与 `ticks.length` / `ticks.line` 同时出现 schema 拒绝。
- `custom shape mark missing shape rejected`：`mark.kind:'custom'` 未提供 shape schema 拒绝。
- `negative shape dimensions rejected`：size / width / height / offset / strokeWidth 负值 schema 拒绝。

**交互**：

- `grid uses visible tick set`：开启 grid 后 grid line 数量与 density 后 tick 数一致。
- `polar angular shape ticks follow radial outward direction`：polar angular axis shape tick 沿外圆外侧摆放。
- `ternary shape ticks follow outward normal`：ternary axis shape tick 沿三角形外法线摆放。
- `theme tick mark merges only visual defaults`：theme.axis.ticks.mark 可默认 shape / style，但 theme.axis.ticks.count / values / interval / density schema 拒绝。

### 依赖的现有元素

- `AxisTicksSchema` / `GuideTickSourceSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——扩展 interval、tick mark 与 density 契约，保留 count / values 候选来源语义。
- `PlotAxisThemeSchema`（`packages/viz/plot/src/schemas/theme/schema.ts`）——允许 tick mark 视觉默认，继续拒绝 count / values / interval / density。
- `ShapeRefSchema`（`@retikz/core`）——作为 shape tick 的 shape 引用契约来源；plot lowering 只生成 core Node，不校验自定义 shape 是否已注册。
- `IRNode` / `IRPath`（`@retikz/core`）——shape mark lowering 到 Node，line mark lowering 到 Path segment。
- `resolveGuideTicks`（`packages/viz/plot/src/providers/scale/shared/guide-ticks.ts`）——继续生成候选 tick set，并新增 interval source 解析。
- `PositionScale.coordinate` / `GuideContext.projectX` / `GuideContext.projectY`（`packages/viz/plot/src/contract`）——density `minGap` 与 shape tick 几何摆放需要投影坐标。
- `lowerGuide` 及 cartesian / polar / ternary / custom axis lowering（`packages/viz/plot/src/pipeline/guide/guide.ts`）——消费 visible tick set 并生成 line tick path 或 shape tick nodes。
- `resolveAxisGuideTokens`（`packages/viz/plot/src/providers/theme/theme.ts`）——合并 tick mark 视觉默认，但不得合并 density / count / values / interval。
