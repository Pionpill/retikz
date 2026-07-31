# ADR-02：Style preset、自定义样式与 palette

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [Chart 总设计 §6](../../../../../architecture/chart-design.md)

## 背景

Chart 需要开箱可读的视觉默认，也需要让用户完整调整 Plot 的 mark、guide、scale、theme 与颜色。若 Chart 新建平行 theme 系统，会让用户同时学习两套样式语义并破坏 Plot 扩展的一致性。

alpha.1 只冻结三个 preset。preset 是封闭 resolver 的 plain-data 输入 bundle，不是新的 GoG capability，不进入 Plot registry，也不允许用户注册。

## 决策：三个 preset 只解析为 Plot tokens 与 presentation defaults

```ts
export const ChartStyle = {
  Default: 'default',
  Minimal: 'minimal',
  Dark: 'dark',
} as const;
```

每个 preset 的内部 bundle 固定为：

```ts
type ChartStylePreset = {
  colors?: ReadonlyArray<string>;
  theme: IRPlotTheme;
  presentation: {
    gap: number;
    title: ChartPresentationTextStyle;
    subtitle: ChartPresentationTextStyle;
    caption: ChartPresentationTextStyle;
    note: ChartPresentationTextStyle;
    source: ChartPresentationTextStyle;
    credit: ChartPresentationTextStyle;
  };
};
```

`ChartPresentationTextStyle` 由本 ADR 的内部 strict schema 拥有，只包含直接复用 Core `NodeSchema` 的 `font`、`textColor`、`align`、`lineHeight`、`maxTextWidth` 五个 optional 字段，不包含 text、position、fill、stroke 或 renderer 值。ADR-03 的展示槽位对象直接 extend 该 schema。

### `default`

```json
{
  "theme": {},
  "presentation": {
    "gap": 6,
    "title": { "font": { "size": 18, "weight": 600 } },
    "subtitle": { "font": { "size": 13 }, "textColor": "#475569" },
    "caption": { "font": { "size": 12 }, "textColor": "#475569" },
    "note": { "font": { "size": 11 }, "textColor": "#64748b" },
    "source": { "font": { "size": 11 }, "textColor": "#64748b" },
    "credit": { "font": { "size": 11 }, "textColor": "#64748b" }
  }
}
```

省略 colors，继续使用 Plot 自己的默认 palette。

### `minimal`

```json
{
  "theme": {
    "axis": {
      "line": false,
      "ticks": { "mark": false },
      "grid": { "drawOpacity": 0.12 }
    }
  },
  "presentation": {
    "gap": 4,
    "title": { "font": { "size": 17, "weight": 600 } },
    "subtitle": { "font": { "size": 12 }, "textColor": "#64748b" },
    "caption": { "font": { "size": 11 }, "textColor": "#64748b" },
    "note": { "font": { "size": 10 }, "textColor": "#64748b" },
    "source": { "font": { "size": 10 }, "textColor": "#64748b" },
    "credit": { "font": { "size": 10 }, "textColor": "#64748b" }
  }
}
```

Theme 只改变视觉 token；不删除 AxisGuide、不改变 tick source / density、format 或 grid enablement。`grid` 只为已经启用的 grid 提供 opacity。

### `dark`

```json
{
  "colors": ["#60a5fa", "#fb923c", "#4ade80", "#f472b6", "#a78bfa", "#facc15"],
  "theme": {
    "background": "#111827",
    "typography": { "textColor": "#e5e7eb" },
    "labelText": { "textColor": "#e5e7eb" },
    "axis": {
      "line": { "stroke": "#6b7280" },
      "grid": { "stroke": "#374151", "drawOpacity": 1 }
    },
    "legend": {
      "title": { "textColor": "#e5e7eb" },
      "label": { "textColor": "#d1d5db" }
    }
  },
  "presentation": {
    "gap": 6,
    "title": { "font": { "size": 18, "weight": 600 }, "textColor": "#f9fafb" },
    "subtitle": { "font": { "size": 13 }, "textColor": "#d1d5db" },
    "caption": { "font": { "size": 12 }, "textColor": "#d1d5db" },
    "note": { "font": { "size": 11 }, "textColor": "#9ca3af" },
    "source": { "font": { "size": 11 }, "textColor": "#9ca3af" },
    "credit": { "font": { "size": 11 }, "textColor": "#9ca3af" }
  }
}
```

## Merge 与 Plot palette 语义

resolver 以 recipe 已生成的 PlotSpec 表现性默认为基底，对 plain object 逐层合并、数组 / scalar 整体替换；计算：

```ts
const resolvedColors = chart.colors ?? preset.colors ?? recipe.plotSpec.colors;
const resolvedTheme = deepMerge(recipe.plotSpec.theme, preset.theme, chart.theme);
```

最终把 `resolvedColors` 和 `resolvedTheme` 原样写入 PlotSpec，继续由 Plot `resolvePlotTheme(theme, colors)` 消费。因此：

- 用户 `colors` 覆盖 preset colors
- preset colors 覆盖 type recipe colors；preset / ChartSpec 都省略时保留 recipe colors
- preset theme 覆盖 type recipe theme，ChartSpec theme 再逐字段覆盖；未覆盖 sibling 保留
- `theme.palette.categorical` 遵守 Plot 现有语义：同时作为 series / sector 的 fallback，除非各自显式设置
- `theme.palette.series` / `sector` 分别覆盖 fallback
- 显式 scale range / scheme 仍优先于 theme / colors
- preset 不直接生成 guides、marks、scales 或 coordinate

统一优先级：

```text
Plot built-in
  < type presentational defaults
  < style preset
  < colors
  < theme
  < explicit scale / guide / mark / component config
```

最后一层显式 GoG member 不通过 theme merge，而由各 Plot schema / lowering 自己消费。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "scatter",
  "style": "minimal",
  "colors": ["#2563eb", "#f97316", "#16a34a"],
  "theme": { "axis": { "grid": { "drawOpacity": 0.2 } } }
}
```

## Chart 封装完备性检查

- preset 不能改变核心 recipe、guide 语义或 Coordinate
- 自定义样式继续使用 Plot theme / members 与 ADR-03 Core text style
- 追加 Plot members 使用 resolved Plot theme，不继承主 Mark 局部 patch
- 三入口保存相同 style / colors IR
- inspection 对 preset token 与用户覆盖记录独立 source
- 本轮结论：组合 Plot / Standard / Core 正式样式能力

ADR-02 只实现内部 schema fragment、preset bundle 与 resolver；`style` / `colors` 随 ADR-04 的首个 Scatter ChartSpec 才 public re-export。React / Vanilla props、docs 导航与 demo 也在 ADR-04 原子接线。

## 不在本 ADR 范围

- 用户注册 preset
- CSS class、React style object、renderer-specific theme
- 自动读取系统 dark mode
- accessibility contrast 自动修正

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增后续进入 ChartSpec 的 schema fragment 与 resolver；ADR-04 前保持内部。

### Schema 改动

| 文件                                                   | 操作 | 字段名               | 类型                                   | 默认值                  | describe 中文摘要            |
| ------------------------------------------------------ | ---- | -------------------- | -------------------------------------- | ----------------------- | ---------------------------- |
| `packages/viz/chart/src/schemas/shared.ts`             | 新增 | `style`              | `z.enum(ChartStyle).optional()`        | resolver 解释为 default | 有限 preset                  |
| 同上                                                   | 新增 | `colors`             | 直接复用 `PlotSpecSchema.shape.colors` | —                       | Plot palette shorthand       |
| `packages/viz/chart/src/schemas/presentation-style.ts` | 新增 | 五个 text style 字段 | 对应 `NodeSchema` fragments optional   | —                       | JSON-safe presentation style |

### 文件 scope

- `packages/viz/chart/src/shared/style.ts`
- `packages/viz/chart/src/schemas/shared.ts`
- `packages/viz/chart/src/schemas/presentation-style.ts`
- `packages/viz/chart/src/providers/style-presets.ts`
- `packages/viz/chart/src/pipeline/resolve-style.ts`
- `packages/viz/chart/src/{shared,schemas,providers,pipeline}/index.ts`（内部 owner barrel）
- `packages/viz/chart/tests/style/**`

公共 root export、adapter tests 与 docs 文件归 ADR-04。

### 测试象限

**Happy path（≥ 3）**

- 三个 preset snapshot 与上文 token 完全相等
- user colors 替换 dark colors 并进入 PlotSpec.colors
- user theme 逐层覆盖 preset theme，未覆盖 sibling 保留
- recipe theme / colors < preset < ChartSpec 的三层 merge 保留未覆盖字段

**边界（≥ 2）**

- 省略 style 等价 `default`
- 单色 colors 合法，继续由 Plot fallback 到 categorical / series / sector

**错误路径（≥ 2）**

- 未知 preset、空 colors、空字符串颜色被 schema 拒绝
- preset bundle 若不能通过 PlotThemeSchema / presentation style schema，模块初始化测试失败

**交互（≥ 2）**

- user theme categorical 按 Plot 现有规则成为 series / sector fallback
- 显式 scale range 覆盖 theme / colors；显式 mark / guide style 覆盖 preset
- inspection 分别记录 type default、style preset 与 user override source
- ADR-04 public 接线测试 JSON / React / Vanilla 的 style、colors、resolved PlotSpec 和 inspection parity

### 依赖的现有元素

- `PlotSpecSchema.shape.colors`、PlotThemeSchema、`resolvePlotTheme`
- Plot theme 深层对象字段与 palette fallback
- Core Font / textColor schemas
- ADR-01 inspection source 与 resolver
