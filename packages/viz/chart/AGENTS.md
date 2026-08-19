# @retikz/chart 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 Base Chart 承载完整 Plot，让每个封装类型以自己的精确 Source IR 表达高层意图，再按 `type` 绑定对应 recipe 并统一解析为 Base Chart
- **拥有的契约**：`BaseChartSchema`、逐类型精确 schema、`plot` / `config` owner 边界、`BoundChart`、Base dispatch、recipe、Chart presentation、Chart style、`chart.base` composite definition
- **不拥有的能力**：公开统一 `ChartSchema` / `IRChart` union、family 级 schema 或解析器、Vanilla `InputXxx` / `normalizeXxx` / `createChart`、Plot token / preset / resolver、Data 算法、Plot lowering / registry、Layout solver、Standard Surface lowering、Core compile、renderer、框架 authoring
- **输入与输出**：接收 Base Chart 或某个精确 typed Chart Source IR，按 `namespace + type` 选择一个 schema 并只解析一次，输出统一的 `IRBaseChart` 与完整 IRPlot
- **缺口流向**：数据能力下沉 `@retikz/data`；可视化 operation 与 lowering 进入 `@retikz/plot`；通用布局进入 `@retikz/layout`；领域无关 presentation composite 进入 `@retikz/standard`；React / Vanilla authoring 进入对应 adapter

## 源码 owner 与依赖方向

```text
_chart/       Base Chart、dispatch、resolve、presentation、style 与 provider
_shared/      Chart-wide 常量、Plot schema 投影、recipe 契约与无状态复用
point/        Point family 的文件入口及 Scatter、Bubble、Connected Scatter 精确实现
```

- `point/` 是源码归置、多入口导入和用户理解边界，不形成 `PointChartSchema`、Point union、Point catalog 或 Point resolver
- `_shared` 不依赖 `_chart` 或任一 family；family 只消费 `_shared`，不导入 `_chart`
- `_chart` 的 dispatch 只绑定 Base Chart，不导入任一 family recipe；Point 通过各自精确 schema 与 recipe 绑定，未知 `type` 必须 fail-loud，不提供自定义 Chart type registry
- 根入口公开 Base Chart、Chart presentation/style 及 Base `bindChart` / `resolveChart` 能力；`/point` 只通过各类型 owner barrel 完整导出三个精确 schema、IR、recipe 与 owned patch contract，不转发根入口
- 每个精确 schema 独立包含 `namespace`、精确 `type`、Chart-owned 公共字段、`plot` 与该类型自己的 `config`，不得派生公开宽 union
- `plot` 字段只保存 Plot-owned data、transform、scale、theme、spatial root、guide、mark extension、尺寸与 meta，并直接复用 Plot schema 字段
- `config` 只保存当前 `type` 独有的数据角色和 patch；类型核心结构由 recipe 隐式补全
- `bindChart` 只接受 Base type，用最小 envelope 拒绝非 Base 输入后解析并绑定 Base schema；Point recipe 各自 parse 一次后立即绑定为 `BoundChart`，`resolveChart` 不重新解析 Source IR
- 所有 recipe 最终解析为 `IRBaseChart`；唯一 Core composite key 是 `chart.base`，不得发布逐类型 provider
- type-specific 错误路径以 `config` 开头，Plot-owned 错误路径以 `plot` 开头
- presentation 只接受唯一 Plot placeholder 与 title / subtitle / note / source TextBlock preset；authoring-only position 在 Base Chart 前消失
- 根公共 facade 只导出 Base schema、bind/resolve、canonical presentation、Chart style contract 与 provider；dispatch envelope、schema issue helper、presentation lowerer、style registry resolver 和 resolved context 保持私有
- Chart style 只解析 Chart-owned token；Plot theme 输入与 definitions 交给 Plot owner，同名 style 缺少任一 owner definition 时 fail-loud
