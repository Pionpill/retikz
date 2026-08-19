# ADR-03：Chart canonical presentation 与 adapter authoring

- 状态：Accepted（2026-08-12；2026-08-19 按统一 Vanilla authoring 边界修订）
- 决策日期：2026-08-11
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计](../../../../../architecture/chart-design.md)
- 替代：先前由 `@retikz/chart` 公开共享 authoring normalizer 与 `createChart` 的边界，以及更早的六 preset / 任意 child 草案

## 背景与目标

Chart 同时服务完整 Plot authoring 和 type-first recipe authoring。两者最终都必须形成相同的 JSON-safe `IRBaseChart`，并以唯一 Plot placeholder、确定的 presentation children 顺序、Layout Flex 与 Standard Surface 进入同一 renderer-neutral 主链。

Chart 核心只应拥有持久化 Source IR、recipe、resolve 和 presentation lowering。TypeScript authoring Input、shorthand 组装与 framework-neutral normalize 属于 Vanilla API；React 只负责把 JSX 与 props 映射到同一 Vanilla Input。该边界保证手写 JSON、Vanilla 与 React 不会维护平行 Source IR builder。

## 决策：canonical Chart 与 authoring Input 分层

`@retikz/chart` 拥有 `IRBaseChart`、逐类型精确 Source IR、canonical presentation schema、recipe/bind/resolve、Chart style 和单一 `chart.base` composite。Base Chart 直接承载完整 IRPlot；typed Chart 在绑定后生成完整 IRPlot，并统一解析为 `IRBaseChart`。

`@retikz/chart-vanilla` 拥有 Base 与逐类型 `InputXxx`、`normalizeXxx`、plain presentation records、`createChart`、逐类型 factory、SSR 与 runtime contribution。`normalizeXxx` 只把已类型化 authoring Input 组装为 Chart Source IR，不读取 datasets、Theme、registry、host、runtime 或 renderer context。

`@retikz/chart-react` 把 props、Plot React authoring 和 presentation markers 映射为对应 Vanilla Input，并调用同一 `normalizeXxx`。React 不直接构造 Chart namespace、type、`plot` / `config` Source IR 外壳，也不复制 presentation 排序规则。

## 基础数据结构与公开契约

Canonical presentation 只包含一个 Plot placeholder，以及 title、subtitle、note、source 四类可选 TextBlock preset：

```ts
type IRChartPresentation = {
  children: Array<
    | { kind: 'plot'; key: 'chart.plot' }
    | {
        kind: 'preset';
        key: `chart.presentation.${'title' | 'subtitle' | 'note' | 'source'}`;
        preset: 'title' | 'subtitle' | 'note' | 'source';
        text: IRTextBlock;
      }
  >;
};

type IRBaseChart = {
  namespace: 'chart';
  type: 'base';
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  presentation?: IRChartPresentation;
  plot: IRPlot;
};
```

Vanilla presentation Input 使用 JSON-safe plain records；`position` 只影响 authoring 顺序，不进入 Source IR：

```ts
type InputChartPresentationRecord = {
  preset: 'title' | 'subtitle' | 'note' | 'source';
  position?: 'top' | 'bottom';
  text: IRTextBlock;
};

type InputChart = {
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  title?: string;
  subtitle?: string;
  note?: string;
  source?: string;
  presentation?: ReadonlyArray<InputChartPresentationRecord>;
  plot: IRPlot;
};

declare const normalizeChart: (input: InputChart) => IRBaseChart;
```

每个 typed normalizer 使用自己的精确 `InputXxxChart -> IRXxxChart`，不接受通用 `type` selector，不建立 Point union 或 family normalizer。`createChart` 与逐类型 factories 在 normalize 之外持有 datasets、Theme definitions、lower options 与 runtime contribution。

## Presentation 顺序与 lowering

默认顺序为 `title -> subtitle -> Plot -> note -> source`。显式 records 或 React markers 按 authored order 排列，并完整覆盖同名 shorthand；最终顺序为：显式 top、剩余 top shorthand、Plot、显式 bottom、剩余 bottom shorthand。

Canonical `presentation.children` 是唯一顺序真源。Chart presentation resolver 不读取 authoring `position`，不按 preset 二次排序，只把 children 依次映射为 Layout Flex items。没有 presentation 时直接使用 Plot；存在 presentation 时形成 column/nowrap/start 的 FlexLayout；两条路径都由同一 Standard Surface 包装完整 Chart。

Chart preset 文本继续复用 Core TextBlock；样式优先级为 Chart preset defaults < record/marker block props < Text line leaves。测量、换行与 renderer 输出仍由 Core、Layout 和 renderer owner 负责。

## 行为、失败语义与兼容性

- canonical presentation 必须恰好包含一个 Plot item，每种 preset 最多一次，固定 key 与 authored order 必须保持
- Vanilla normalize 对 TypeScript 无法表达的重复 preset fail-loud；Source IR 的空内容、错误 key、缺失 Plot、重复 preset 与未知字段继续由 Chart schema 诊断
- React marker 每类最多一个，只接受字符串、透明 Fragment 与 Core Text authoring；非法或空 marker content 由 Chart React 自己的错误契约诊断
- Base 与 typed authoring 生成的 Source IR 均不得携带 datasets、函数、ReactNode、provider、Theme definition 或 renderer object
- `@retikz/chart` 不再公开 `createChart`、authoring Input、authoring position、默认 dataset reference 或阶段级 normalize；这些符号直接迁入 `@retikz/chart-vanilla`，不保留兼容 alias
- `@retikz/chart` 的内部 dispatch envelope、schema issue helper、presentation lowerer、style registry resolver 与 resolved context 不属于公共 API
- React 与 Vanilla 对等输入必须生成等价的 Chart Source IR、完整 IRPlot、presentation 顺序与 provider contribution

caption、credit、任意 presentation child、DOM-only presentation、响应式宿主状态与 renderer-only 文本仍不属于本契约。
