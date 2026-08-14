# @retikz/standard-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让无框架用户以 builder、SSR 或 mount 编排使用 Standard 绘图能力
- **拥有的契约**：builder、Standard 输入构造、SSR / mount 编排与 `@retikz/vanilla` runtime 接线
- **不拥有的能力**：Standard schema、definition / registry、layout、lowering、Core 编译与 renderer 算法
- **输入与输出**：接收 builder calls 或 Standard 输入，交给 `@retikz/standard` 与 `@retikz/vanilla` 完成编译 / 输出
- **缺口流向**：领域语义进入 Standard；通用 Vanilla / SSR / mount 能力进入 `@retikz/vanilla`；底层机制进入 Core / Math

## 约束

- builder 不保存 DOM、生命周期或 renderer 私有状态；SSR 路径不读取浏览器全局
- Vanilla 入口必须与 React 对同一 Standard 输入得到等价的 Core contribution；不得复制 schema、registry、layout 或 lowering

## 当前状态

当前提供 Grid、Axes、Frame、Legend、Surface 的 Input helper / InputEmbed adapter 与 `StandardInputEmbedAdapters`。Layout helper 与 inspection 已迁入 `@retikz/layout-vanilla`，本包只保留根入口
