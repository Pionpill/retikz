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
      orientation: 'inward',
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

## 实现补充：三角形方向语义

实现复核时确认，内置 `triangle` 只是复用 core polygon shape，并不为 plot 单独定义新的三角形坐标系。`orientation` 的语义保持为 tick 法线 / 轴线切线策略：

- `outward` 始终沿 tick 外法线方向。对于默认 bottom x axis，外法线是向下。
- `inward` 始终沿 tick 内法线方向。对于默认 bottom x axis，内法线朝向绘图区，因此三角尖端朝上。
- `axis` 沿轴线切向，`fixed` 使用显式 `rotate` 或 0。
- `custom` shape 不继承 triangle 的任何额外 base rotation；用户自定义 shape 的 canonical direction 由自定义 shape 自己决定。

因此文档和 demo 中“底部 x 轴三角刻度朝上”的示例使用 `orientation: 'inward'`。实现只补充回归测试锁定该语义，不额外修改 triangle lowering 的默认旋转，避免破坏 top / left / right 轴和 custom shape 的既有方向规则。

## 不在本 ADR 范围

- 自动文字测量、tick label 防重叠、自动旋转、label-only 抽稀或任何 tickLabels 新字段。
- minor ticks / major ticks 双层刻度。
- tick label formatter 函数。
- grid 独立 density。grid 继续使用 axis visible tick set。
- legend ramp tick mark 形态。legend ramp 可以复用 tick density 的 helper，但不新增 ramp tick mark。
- 新增 core shape provider 或修改 core shape registry。
- chart preset；后续 chart 可消费本 PlotSpec 能力。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/06-axis-tick-marker-density.md`。
