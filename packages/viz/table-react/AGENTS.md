# @retikz/table-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户通过通用 spec、detail 或 manual authoring 使用 Table，并将 datasets、registries 与 Table runtime 接入 React 生命周期
- **拥有的契约**：`<Table>` / `<DetailTable>` / `<ManualTable>` 与对应 props、共享 TableSpec normalization 的 React 接线、dataset / registry 注入、React runtime 接线，以及后续虚拟滚动的 viewport / scroll host 接线
- **不拥有的能力**：Data schema / transform、Table IR 语义、结构操作、格式化、布局、lowering、Core 编译或 renderer
- **输入与输出**：接收 React props / children、TableSpec、datasets 与 runtime options，构造规范 TableSpec 并交给 `@retikz/table` 与 `@retikz/react`
- **缺口流向**：数据问题进入 `@retikz/data`；表格语义、布局与 lowering 进入 `@retikz/table`；通用 React 渲染与生命周期能力进入 `@retikz/react`

## 约束

- React 组件只负责 authoring 与宿主接线，不复制 Table structure、rules、layout 或 lowering 算法
- Props 类型应从 `@retikz/table` 的公开类型派生，不维护平行 schema
- ReactNode 可以作为 authoring sugar，但必须在进入 Table IR 前转换为合法 Core `IRChild`；公开 IR 不包含 ReactNode
- `react` / `react-dom` 在正式初始化后保持 peerDependencies，本包不能依赖浏览器全局构建 Table spec
- 新能力若无法由 `@retikz/table` 表达，先补底层能力，不在 React adapter 中私有实现
- 虚拟滚动只能消费 `@retikz/table` 的 window / layout contract；React 侧只维护 viewport 观测、滚动位置和生命周期

## 当前状态

`0.1.0-alpha.1` 提供 `<Table>`、`<DetailTable>` 与 `<ManualTable>`。三个组件共享 standalone / embedded runtime；detail / manual sugar 委托 `@retikz/table` normalization 并保留精确 spec 变体，`<Table>` 接收聚合 `IRTableSpec`。embedded 入口要求稳定 spec id，standalone `onManifest` 只在内容变化时通知。后续虚拟滚动仍只在 adapter 维护 viewport 与滚动生命周期。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/table-react exec eslint . --fix
pnpm --filter @retikz/table-react exec tsc --noEmit
pnpm --filter @retikz/table-react test:changed
```
