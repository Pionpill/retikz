# viz 分组工作指南

本文件覆盖 `packages/viz/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。

## 包职责与边界

| 包                      | 解决的问题                             | 拥有                                                                   | 不拥有                                               |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `@retikz/data`          | 为多个可视化宿主提供统一数据处理底座   | 数据模型、字段解析、通用 transform / statistics、registry、lineage     | channel、scale、mark、可视化布局、renderer           |
| `@retikz/plot`          | 把数据语义映射成可组合的 Core 图形语义 | Plot IR、channel / scale / coordinate / mark / guide、layout、lowering | 通用数据算法、Core IR 语义、renderer、框架 authoring |
| `@retikz/plot-react`    | 用 React JSX authoring 和运行 Plot     | React 组件、composition builder、数据注入和 React runtime 接线         | Data / Plot 算法、Core 编译、renderer                |
| `@retikz/plot-vanilla`  | 无框架 authoring、SSR 和运行 Plot      | plot builder、数据注入、vanilla / SSR 编排                             | Data / Plot 算法、Core 编译、renderer                |
| `@retikz/table`         | 把数据或显式内容组织为二维语义表格     | Table IR、结构/呈现、约束布局、lowering、追溯                          | 通用数据算法、Core 测量、Plot 语义、renderer         |
| `@retikz/table-react`   | 用 React authoring 和运行 Table        | React 组件、数据注入、composite 与宿主 runtime 接线                    | Table 算法、Core 编译、renderer                      |
| `@retikz/table-vanilla` | 无框架 authoring、SSR 和运行 Table     | table builder、数据注入、vanilla / SSR 编排                            | Table 算法、Core 编译、renderer                      |

未来的 chart / geo 等边界只在 ADR 或 roadmap 明确后落包；AGENTS 不为未存在包保留详细规则。

## 分层约束

- viz 组是 Tier 2 能力层，不向 core 组反向注入实现；通用绘图 / 几何缺口优先补 `@retikz/core` 或 `@retikz/math`。
- `@retikz/data` 是数据模型、字段与值语义、transform 和通用数据处理契约真源；plot / chart / table 不复制数据处理算法。
- `@retikz/plot` 是 plot 语义、layout transform 和 lowering 真源；adapter 不复制 data、scale、coordinate、mark、guide 或 lowering 算法。
- `@retikz/table` 是表格结构、Cell 呈现、约束布局和 lowering 真源；显式 Plot 等 Tier 2 Cell 只通过 Core `IRChild` / composite 进入，Table 不依赖或特判 Plot。
- plot-specific transform 可以在 plot 实现，但必须复用 data 的 definition、registry 与 apply contract；宿主无关的 rows / fields / statistics 算法归 data。
- viz 内共用几何类型和工具优先来自 `@retikz/math` / `@retikz/core`。例如二维坐标用 `Position`，有限 / 无穷数值判断用既有 helper，不在 plot 内重复定义。
- 已存在的本包工具应复用；如果工具应上移到 math/core，先迁移再使用。

每个包的输入输出与缺口流向以就近 `AGENTS.md` 为准。宿主无关的数据处理进入 data；可视化映射语义进入 plot；框架 authoring 和生命周期进入对应 adapter；通用图形或几何缺口下沉 core / math。当前实现位置和 adapter 是否能展示都不能改变这条所有权链。

## 能力完备性

- `@retikz/data` 的主责边界见 [`data-capability-complete.md`](./_notes/architecture/data-capability-complete.md)。
- `@retikz/plot` 的主责边界见 [`plot-visualization-complete.md`](./_notes/architecture/plot-visualization-complete.md)。
- `@retikz/table` 的主责边界见 [`table-visualization-complete.md`](./_notes/architecture/table-visualization-complete.md)。
- 新能力先判断属于 Data Complete、Visualization Complete、Tabular Visualization Complete 还是应下沉 Drawing Complete；adapter / preset 能展示不等于能力闭环。

## 代码风格

从 d3 生态导入的运行时函数、常量和值对象统一用 `d3Xxx` 本地名；类型统一用 `D3Xxx` 本地名，避免与项目内 scale / formatter / schema 命名混淆。

## 验证

改 `@retikz/plot` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/plot exec eslint . --fix
pnpm --filter @retikz/plot exec tsc --noEmit
```

改 `@retikz/table` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/table exec eslint . --fix
pnpm --filter @retikz/table exec tsc --noEmit
```

adapter 改动按对应包运行同类命令；跨包 API 改动同步 docs。
