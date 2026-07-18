# @retikz/table-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户通过 spec wrapper 或 composition JSX 使用 Table，并将 datasets、registries 与 Table runtime 接入 React 生命周期
- **拥有的契约**：未来的 `<Table>` 与相关 React props / components、children → TableSpec 的纯 authoring builder、dataset / registry 注入和 React runtime 接线
- **不拥有的能力**：Data schema / transform、Table IR 语义、结构操作、格式化、布局、lowering、Core 编译或 renderer
- **输入与输出**：接收 React props / children、TableSpec、datasets 与 runtime options，构造规范 TableSpec 并交给 `@retikz/table` 与 `@retikz/react`
- **缺口流向**：数据问题进入 `@retikz/data`；表格语义、布局与 lowering 进入 `@retikz/table`；通用 React 渲染与生命周期能力进入 `@retikz/react`

## 约束

- React 组件只负责 authoring 与宿主接线，不复制 Table structure、rules、layout 或 lowering 算法
- Props 类型应从 `@retikz/table` 的公开类型派生，不维护平行 schema
- ReactNode 可以作为 authoring sugar，但必须在进入 Table IR 前转换为合法 Core `IRChild`；公开 IR 不包含 ReactNode
- `react` / `react-dom` 在正式初始化后保持 peerDependencies，本包不能依赖浏览器全局构建 Table spec
- 新能力若无法由 `@retikz/table` 表达，先补底层能力，不在 React adapter 中私有实现

## 当前状态

当前目录只建立包职责边界，尚未初始化 npm package、组件、公开 API 或测试。正式实现必须跟随 Table ADR，并保持 adapter 与核心语义等价。
