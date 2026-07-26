# @retikz/standard-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户以 JSX 或 React authoring helper 使用 Standard 绘图能力
- **拥有的契约**：React props、同步 Sugar 展开、Standard 输入构造与 `@retikz/react` runtime 接线
- **不拥有的能力**：Standard schema、definition / registry、layout、lowering、Core 编译与 renderer 算法
- **输入与输出**：接收 React props / children，构造规范 Standard 输入并交给 `@retikz/standard` 与 `@retikz/react`
- **缺口流向**：领域语义进入 Standard；通用 React runtime / renderer 能力进入 `@retikz/react`；底层机制进入 Core / Math

## 约束

- ReactNode 只能作为 authoring sugar，进入 Standard IR 前必须转换为 JSON-safe 输入或合法 Core `IRChild`
- React 入口必须与 Vanilla 对同一 Standard 输入得到等价的 Core contribution；不得在 adapter 私有 schema、registry、layout 或 lowering
- 正式初始化后 `react` / `react-dom` 保持 peerDependencies

## 当前状态

v0.1 alpha.1 已提供 Grid、Axes、Frame、FrameTitle 与 FrameDescription。package exports 只保留根入口，组件继续通过根入口 named exports 公开。
