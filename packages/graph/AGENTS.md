# graph 分组工作指南

本文件覆盖 `packages/graph/` 下的 graph domain 分组。全仓通用规则仍以根目录 `AGENTS.md` 为准。

## 分组定位

| 包                                             | 职责                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@retikz/data`（规划）                         | graph 共享数据层：数据模型、字段解析、通用 transform、数据通道、scale / formatter / theme token 等共享契约     |
| `@retikz/plot`                                 | Tier 2 GoG 可视化层：transform / layout / coordinate / mark / guide / plot lowering，最终下沉到 `@retikz/core` |
| `@retikz/plot-react` / `@retikz/plot-vanilla`  | plot 的 React / Vanilla 绑定包；可暴露 `<Plot>` / builder 等 plot authoring 表面                               |
| `@retikz/chart`（规划）                        | Tier 3 新手友好封装层：用 `type` / config / preset 生成 PlotSpec，调度 plot 底层能力，不拥有自己的 IR / lowering |
| `@retikz/chart-react` / `@retikz/chart-vanilla`（规划） | chart 的 React / Vanilla 绑定包；可暴露 `<Chart>` / chart builder 等快速出图表面                 |
| `@retikz/table`（规划）                        | Tier 2 表格可视化层：columns / cells / grouping / summary / pivot / matrix 等，最终下沉到 `@retikz/core`        |
| `@retikz/table-react` / `@retikz/table-vanilla`（规划） | table 的 React / Vanilla 绑定包                                                                 |
| `@retikz/geo`（候选 / 待决策）                 | 地图可视化能力候选包；也可能收敛为 plot 的 projection / layout 能力，是否独立拆包后续 ADR 决定                  |
| `@retikz/geo-react` / `@retikz/geo-vanilla`（候选 / 待决策） | 仅在 geo 独立成包时存在的 React / Vanilla 绑定包                                           |

分层心智：

- `data` 是共享数据语义底座，plot / table / geo（若独立）都消费它。
- graph 组解决的是「有了数据之后如何可视化」：plot 通过 GoG 可视化，table 通过表格可视化，geo 处理地图类可视化问题但是否独立拆包待决策。
- `plot` / `table` / geo 候选能力是 Tier 2 底层能力层，目标是抽象能力、扩展契约、底层实现和 lowering。原 struct 范围不作为独立包，收敛为 plot 的 layout transform。
- `chart` 是 Tier 3 上层封装层：通过 `type` / config / preset 提供新手友好的 API，当前主要调度 plot 能力并生成 PlotSpec；它不自造 IR、lowering 或 renderer。
- 不设统一 `@retikz/graph-react` / `@retikz/graph-vanilla` 聚合 adapter；各表达层各自发 React / Vanilla 包，避免安装不需要的模块。

## 分层约束

- graph 分组是 Tier 2 能力层，不向 core 组反向注入能力；遇到通用绘图 / 几何能力缺口，优先补 `@retikz/core` 或 `@retikz/math`，不要在 graph 包里造平行底座。
- `@retikz/data` 是数据模型、字段解析、通用 transform、通道、scale / formatter 等共享契约真源；内置数据处理逻辑与外部注入 definition 都是一等公民。
- `@retikz/plot` 是 GoG 语法、layout transform 和 plot lowering 真源；plot 可拥有自己的统计 / 坐标语义 / 结构布局 transform，不把 plot pipeline 下沉到 data。
- `@retikz/table` 是表格可视化的语义和 lowering 真源；table 可拥有自己的 pivot / subtotal / column sizing 等表格 transform。
- `@retikz/geo` 仍是候选边界：若独立成包，它是地图可视化的语义和 lowering 真源；若不独立，地图投影 / 地理布局能力应作为 plot 的 projection / layout 扩展进入同一 pipeline。
- `@retikz/chart` 不拥有自己的底层 IR / lowering / renderer；它只把用户友好的 config 展开成 PlotSpec，并补默认主题 / label / guide / layout 等开箱体验。
- `@retikz/plot-react` / `@retikz/chart-react` / `@retikz/table-react` / `@retikz/geo-react`（若存在）及对应 vanilla 包只做 adapter，不复制 data transform、plot grammar / layout、chart preset、table layout 或 geo projection 逻辑。
- 共用几何类型和工具优先来自 `@retikz/math` / `@retikz/core`。例如二维坐标类型使用 `Position`，有限 / 无穷数值判断使用 `isFiniteNumber` / `isInfiniteNumber`，不要在 plot 内重新定义同义工具。
- 已存在的本包共用工具应复用，不要在子模块里重复实现同类 parser / formatter；如果工具应该上移到 math/core，先迁移再使用。

## 代码风格

- plot 分组里从 d3 生态导入的运行时函数、常量和值对象统一用 `d3Xxx` 本地名，例如 `format as d3Format`、`utcFormat as d3UtcFormat`、`scaleLinear as d3ScaleLinear`、`schemeCategory10 as d3SchemeCategory10`。从 d3 导入的类型统一用 `D3Xxx` 本地名，例如 `ScaleLinear as D3ScaleLinear`，避免与项目内 scale / formatter / schema 命名混淆。

## 验证

改 `@retikz/plot` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/plot exec eslint . --fix
pnpm --filter @retikz/plot exec tsc --noEmit
```

adapter 改动按对应包运行同类命令；跨包 API 改动需要同步 docs。
