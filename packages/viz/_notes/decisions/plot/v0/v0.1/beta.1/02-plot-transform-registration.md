# ADR-02：plot 自行注册 plot-only transform

- 状态：Accepted
- 决策日期：2026-07-06
- 完成日期：2026-07-07
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md) · [data beta.1 ADR-02](../../../../data/v0/v0.1/beta.1/02-shared-provider-boundary.md) · [ADR-01：适配 @retikz/data 数据层](./01-data-package-adapter.md) · [plot-design.md §3.3 Transform / §8 lowering](../../../../../architecture/plot-design.md)

## 背景

ADR-01 让 `@retikz/plot` 从 `@retikz/data` 消费数据模型、字段解析、format、statistics、transform pipeline。随后对 data 内置能力复盘发现，部分 transform 只是 rows in / rows out，但输出字段和语义直接服务 plot mark、scale 或 geometry。把这些 transform 作为 data 内置项，会把 plot 的 stat-geom 词汇强加给 table / geo。

plot 仍然需要这些 transform：堆叠、分箱、归一化区间、relation 派生、抖动、密度、平滑都是当前 GoG 层的重要能力，并被 root transform、mark-local transform、scale domain、locator provenance 共同消费。正确边界不是删除这些能力，而是把它们从 data 内置集合移回 plot，由 plot 在调用 data pipeline 时注入自己的 transform definitions。

## 决策

`@retikz/plot` 拥有 plot-only transform schema、definition、provider implementation 和内置集合。plot lowering 和 locator 继续调用 `@retikz/data` 的 transform pipeline，但默认 registry 由 data 内置 definitions 与 plot 内置 definitions 组合。

plot 自行注册的 transform：

| transform | plot 归属理由 |
| --- | --- |
| `stack` | 产出 baseline 区间，服务 stacked interval / area / sector 等 plot geometry。 |
| `bin` | 产出 bin 边界与默认 count，服务 histogram、binned interval、heatmap 等 plot stat geometry。 |
| `normalize` | 服务 percentage stacking / share chart。 |
| `derive-interval` | 把单值或双字段派生成 mark 可消费的区间边界。 |
| `relate` | 产出 relation rows，服务 relation mark anchor 与 routing。 |
| `jitter` | 对位置字段施加确定性视觉抖动。 |
| `density` | KDE 采样输出服务 density path / area。 |
| `smooth` | regression / trend 采样输出服务 smooth path。 |

`resolvePlotTransformRegistry` 复用 data 的 registry 能力，把 data 默认内置项、plot 内置项与用户 `options.transformDefinitions` 同路注册。消费侧不得写“如果 kind 是 stack/bin 就走 plot switch，否则走 data registry”的旁路。

plot schema 必须避免 data external passthrough 抢先接住 plot-only kind：`stack` / `bin` / `density` 等 plot 内置 kind 必须经过 plot 闭合 schema 校验。

## 被否决选项

- **把 plot-only transform 留在 data 默认集合**：会污染 data 公共 API 和 schema 描述。
- **在 plot lowering 中写 kind 分支特例**：会绕开统一 registry，破坏自定义 transform、provenance 和错误路径一致性。
- **删除 plot-only transform**：会直接丢失当前 plot 的统计图层和 relation 能力。

## 公开契约与兼容性

plot 用户继续在 plot spec 中使用 data transform 与 plot transform 的组合：

```ts
import { compileToScene } from '@retikz/core';
import { lowerPlots, type PlotSpec } from '@retikz/plot';

const spec: PlotSpec = {
  type: 'plot',
  data: { ref: 'sales' },
  transform: [
    { kind: 'summarize', groupBy: ['region', 'product'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] },
    { kind: 'stack', x: 'region', y: 'total', groupBy: 'product' },
  ],
  marks: [{ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'y1' } } }],
};

compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots({ sales }) });
```

`summarize` 来自 data 内置 transform，`stack` 来自 plot 内置 transform。用户不需要手动传入 plot 内置 definitions；自定义 transform 继续通过 `options.transformDefinitions` 注入。

`@retikz/plot` 顶层不再转发 data-only 类型、schema、provider、pipeline helper。消费方要从 `@retikz/data` 顶层导入。

## 最终实现

plot 已新增 `schemas/transform` 与 `providers/transform` 子域，承载 plot-only transform 常量、schema、类型、definition 和 implementation。`resolvePlotTransformRegistry` 组合 data 内置 transform 与 plot 内置 transform，并用于 root transform、mark-local transform、lowering、locator 和 source field collection。

data 的默认内置集合已按 [data ADR-02](../../../../data/v0/v0.1/beta.1/02-shared-provider-boundary.md) 收窄，plot-only transform 不再污染 data 包。

## 验证

- plot 默认 lowering 能执行 `summarize -> stack` 等 data + plot transform 链。
- `density`、`smooth`、`bin`、`relate` 等 plot-only transform 通过 plot 内置 registry 执行。
- mark-local transform、scale domain、locator provenance 使用同一 plot registry。
- schema 能拒绝无效 plot-only transform 形态，避免被 data external passthrough 接住。
- beta.1 roadmap 记录完成提交：`23bba402` / `22ceb713`。

## 遗留风险

后续若新增 table / geo，应复用 data transform contract / pipeline 并注册自己的宿主 transform，不应复用 plot-only definitions。`bin`、`normalize` 等能力若出现跨宿主共同需求，需要重新设计 data-native 形态。

## 实现指针

本 ADR 已随 viz `0.1.0-beta.1` 收尾压缩；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在历史中。

> 🔖 压缩前完整施工蓝图 = `git show 3c76d64d1402545454f1ae301d8588313abb7d5d:packages/viz/_notes/decisions/plot/v0/v0.1/beta.1/02-plot-transform-registration.md`。
