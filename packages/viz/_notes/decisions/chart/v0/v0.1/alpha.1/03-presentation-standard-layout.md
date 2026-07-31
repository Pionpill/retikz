# ADR-03：Chart presentation 与 Standard FlexLayout

- 状态：Proposed（自动混合嵌入受 ADR-01 Kernel capability gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计 §8](../../../../../architecture/chart-design.md)

## 背景

Plot 负责图本体及 axis、legend、datum / mark label 等可视化语义。一个可独立绘制的 Chart 还需要标题、说明、来源与署名，但这些内容不能被塞入 PlotSpec，也不能由 React DOM 外壳独占。

Standard 已提供 JSON-safe FlexLayout，能够布局任意 Core child，包括完整 Plot composite 与文本 Node。Chart 只声明展示语义并生成 Standard 输入，不实现文字测量、box solver 或 renderer 分支。

## 决策：六个可选槽位进入固定 Standard column FlexLayout

```ts
type ChartPresentation = {
  title?: ChartPresentationText;
  subtitle?: ChartPresentationText;
  caption?: ChartPresentationText;
  note?: ChartPresentationText;
  source?: ChartPresentationText;
  credit?: ChartPresentationText;
  layout?: ChartPresentationLayout;
};
```

每个槽位接受 non-empty `TextBlock` shorthand，或以下 strict object：

```ts
type ChartPresentationText =
  | IRTextBlock
  | {
      text: IRTextBlock;
      font?: IRFont;
      textColor?: string;
      align?: IRNode['align'];
      lineHeight?: number;
      maxTextWidth?: number;
    };
```

`ChartPresentationTextBlockSchema` 在 Core `TextBlockSchema` 之上增加非空 refinement：string 至少一个字符；数组至少一行，且至少一个 plain / styled line text 或 mixed run 的 `text` / `tex` 非空。它与 Plot label 的 non-empty 规则同义，但由 Chart schema owner 实现，不 deep import Plot 私有 helper。

## Canonical expansion

固定 child 顺序与 Flex item key：

```text
title -> subtitle -> plot -> caption -> note -> source -> credit
```

每个存在的 text slot 解析为：

```ts
{
  kind: 'flex',
  key: '<slot>',
  child: {
    type: 'node',
    position: [0, 0],
    text,
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    padding: 0,
    ...resolvedPresetStyle,
    ...slotStyle,
  },
}
```

Plot item 固定为：

```ts
{ kind: 'flex', key: 'plot', child: resolvedPlotSpec }
```

resolver 必须把下列 authored input 交给 `createFlexLayout` / `FlexLayoutSchema.parse`，`ChartResolution.node` 保存 parse 后的 normalized `IRFlexLayout`，不是未物化默认值的 input：

```ts
{
  namespace: 'standard',
  type: 'flexLayout',
  direction: 'column',
  wrap: 'nowrap',
  padding: presentation.layout?.padding ?? 0,
  columnGap: 0,
  rowGap: presentation.layout?.gap ?? preset.presentation.gap,
  justifyContent: 'start',
  alignItems: presentation.layout?.align ?? 'stretch',
  alignContent: 'start',
  children,
}
```

normalized container 还必须包含：

```ts
{
  size: { x: { kind: 'content' }, y: { kind: 'content' } },
  overflow: 'visible',
  // 以及上文已经固定的 namespace/type/direction/wrap/padding/gaps/alignment
}
```

每个 normalized item 固定包含：

```ts
{
  kind: 'flex',
  key,
  child,
  margin: 0,
  basis: 'content',
  grow: 0,
  shrink: 1,
}
```

整个 `presentation` 缺省时直接返回 PlotSpec，不生成空 FlexLayout；存在 presentation object 但六个文本槽位都缺省时 schema 失败，避免无意义外壳。

Chart 有 `id` 时，最终 expansion 是 `{type:'scope', id: chart.id, children:[flexOrPlot]}`，resolved PlotSpec id 为 `${chart.id}/plot`。无 id 时不生成外层 Scope，也不生成 Plot id；多个实例依靠 compile occurrence 隔离。

## Layout surface

`presentation.layout` 只开放：

| 字段      | Schema                                    | 映射           |
| --------- | ----------------------------------------- | -------------- | --- | -------- | ----------------- |
| `padding` | 直接复用 `FlexLayoutSchema.shape.padding` | Flex `padding` |
| `gap`     | finite non-negative number                | Flex `rowGap`  |
| `align`   | `start                                    | center         | end | stretch` | Flex `alignItems` |

复杂外部排列由用户直接使用 Standard。Chart 不开放 wrap、reverse、grow、slot renderer 或任意 graphic。

## Runtime capability assembly

Chart expansion 保留完整 PlotSpec child，因此 host 必须同时注册 `lowerCharts(...)`、`lowerPlots(...)` 与 `FlexLayoutDefinition`。独立 JSON / React / Vanilla 入口显式构造该集合。

Chart / Plot / Standard 作为同一外层 Layout 的 embeddable children 时，依赖 ADR-01 所述 Kernel contribution capability。该 gate 未解除时：

- 不允许 adapter 悄悄提前展开 Plot
- 不允许 Chart 私调 Flex solver
- 不允许因重复 definitions 静默保留第一项
- docs 不宣称混合嵌入已支持

gate 解除后，三入口必须使用同一个 dependency aggregation contract。稳定 fail-loud 属于 Kernel host preflight：在 compile 前检查 Chart 所需的 Chart / Plot / Flex definition keys，并由 Kernel owner ADR 冻结 error payload。当前 Core 对未注册 root composite 可能 warning + skip，因此本 ADR 在 gate 解除前只承诺“显式完整 bundle 可以成功编译”，不虚构 Chart resolver error code。

## Identity 与空间边界

- Flex item key 是容器本地 layout identity，不与 Plot id 共用命名域
- Standard probe / replay 会合法增加 / 重映射 compile occurrence 并改变全局 geometry
- Plot 语义 id、datum / series payload、provenance、locator、lineage 保持连续，不由 Chart 复制或改写
- wrapped 与裸 Plot 的 trace payload 等价；`sourcePath` 继续指向原 Plot composite source，`expansionPath` 可以增加 Core 定义的 numeric `expand` / `probe` / `replay` / `output` / `scopeChild` 段
- Flex item key 只属于 Standard layout artifact 的容器本地 identity，不进入 Core occurrence locator
- alpha.1 不承诺 qualified selector、Chart header/body/footer handle 或完整空间 index；稳定 slot key 只作为未来 Standard artifact 兼容锚点

## DSL 表面

```json
{
  "presentation": {
    "title": "Monthly retention",
    "subtitle": { "text": "Cohorts acquired in 2026", "font": { "size": 12 } },
    "source": "Source: internal analytics",
    "layout": { "padding": 12, "gap": 6, "align": "start" }
  }
}
```

## Chart 封装完备性检查

- presentation 不属于 type 核心 recipe，所有单独槽位均可省略
- Plot body 始终是完整 PlotSpec，不降级为 bbox / image
- Standard 负责 probe / replay / layout，Core 负责文本测量与最终几何
- adapter 不创建 DOM-only 标题
- inspection 记录 slot source path，不复制 Plot trace
- 本轮结论：组合 Standard + Core 现有能力；自动混合嵌入等待 Kernel owner gate

## 不在本 ADR 范围

- 任意 ReactNode、graphic、slot renderer
- toolbar、export、fullscreen、loading
- accessibility description 到 DOM / renderer 的宿主映射
- dashboard linked state
- Kernel embeddable dependency aggregation 的具体 API
- Kernel host capability preflight / stable missing-definition error
- Core qualified selector / handle index

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 Chart presentation schema 与 composite resolution。

### Schema 改动

| 文件                                             | 操作 | 字段名                                                                         | 类型                                      | 默认值    | describe 中文摘要 |
| ------------------------------------------------ | ---- | ------------------------------------------------------------------------------ | ----------------------------------------- | --------- | ----------------- |
| `packages/viz/chart/src/schemas/presentation.ts` | 新增 | text shorthand                                                                 | non-empty `TextBlockSchema`               | —         | 非空展示文本      |
| 同上                                             | 新增 | styled `text` / `font` / `textColor` / `align` / `lineHeight` / `maxTextWidth` | exact Node fragments                      | —         | strict 文本对象   |
| 同上                                             | 新增 | `layout.padding`                                                               | `FlexLayoutSchema.shape.padding` optional | `0`       | 外层 padding      |
| 同上                                             | 新增 | `layout.gap`                                                                   | finite non-negative optional              | preset    | 垂直间距          |
| 同上                                             | 新增 | `layout.align`                                                                 | edge alignment optional                   | `stretch` | 横轴对齐          |
| 同上                                             | 新增 | 六个 slot                                                                      | text union optional                       | —         | Chart 展示槽位    |
| `packages/viz/chart/src/schemas/shared.ts`       | 新增 | `presentation`                                                                 | refined strict object optional            | —         | 至少一个可见 slot |

### 文件 scope

- `packages/viz/chart/package.json`（新增 `@retikz/standard` dependency）
- `packages/viz/chart/src/schemas/presentation.ts`
- `packages/viz/chart/src/schemas/index.ts`、`packages/viz/chart/src/index.ts`
- `packages/viz/chart/src/pipeline/resolve-presentation.ts`
- `packages/viz/chart/src/pipeline/resolve-chart.ts`、`packages/viz/chart/src/pipeline/index.ts`
- `packages/viz/chart/src/contract/inspection.ts`
- `packages/viz/chart/tests/presentation/**`
- `packages/viz/chart-react/src/{Chart,embedded-runtime,chart-runtime}.tsx`
- `packages/viz/chart-react/src/index.ts`、`packages/viz/chart-react/tests/presentation.test.tsx`
- `packages/viz/chart-vanilla/src/{adapter,runtime,spec}/**`
- `packages/viz/chart-vanilla/src/index.ts`、`packages/viz/chart-vanilla/tests/presentation.test.ts`
- `pnpm-lock.yaml`
- `apps/docs/src/modules/docs/contents/chart/concepts/presentation*.mdx`
- 对应 Chart docs data / i18n / demo 文件

上述 adapter runtime 文件只在 ADR-04 首个公开 type 和 ADR-01 Kernel gate 均就绪时接线；本 ADR 可先实现 core schema / resolver。

### 测试象限

**Happy path（≥ 3）**

- 六槽位生成与上文完全相等的 canonical Flex tree
- shorthand / styled object 生成相同 text，preset style < slot style
- standalone JSON host 注册 Chart + Plot + Flex 后真实 compile

**边界（≥ 2）**

- 无 presentation 时 node 是 PlotSpec；仅 source 时只有 plot / source items
- idless 多 Chart 不生成虚构 id，occurrence 分离且无冲突

**错误路径（≥ 2）**

- 空 TextBlock、空 presentation、负 gap / padding、非法 align 被 schema 拒绝
- gate 解除后 Kernel host preflight 对缺 Chart / Plot / Flex definition 给出上游 ADR 冻结的稳定错误；当前只测显式完整 bundle 成功

**交互（≥ 2）**

- wrapped / bare Plot 的 trace payload 等价；sourcePath 保持，expansionPath 按 Core numeric segments 合法重映射
- React / Vanilla / JSON 在 gate 解除后装配相同 definitions 与 canonical tree
- 混合 Chart + Plot + Standard 时 definitions 去重、datasets 同源冲突 fail-loud

### 依赖的现有元素

- Standard FlexLayoutSchema / factory / definition
- Core TextBlockSchema、NodeSchema、IRNode、Scope 与 compile occurrence
- PlotSpec、lowerPlots、provenance / locator / lineage
- ADR-01 composite registration / upstream capability gate
- ADR-02 exact presentation preset tokens
