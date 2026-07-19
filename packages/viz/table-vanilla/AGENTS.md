# @retikz/table-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让无 UI 框架、SSR 与 build-time 用户用 plain API 构造并运行 Table，同时复用同一 Data / Table / Core 管线
- **拥有的契约**：未来的 framework-free Table builder、render / embed 编排、dataset / registry / artifact options、后续虚拟滚动宿主接线与 `@retikz/vanilla` 协作
- **不拥有的能力**：Data schema / transform、Table IR 语义、结构操作、格式化、布局、lowering、Core 编译、renderer 或 DOM runtime
- **输入与输出**：接收 builder calls 或 TableSpec、datasets 与 runtime options，构造规范 TableSpec 并交给 `@retikz/table` 与 `@retikz/vanilla`
- **缺口流向**：数据问题进入 `@retikz/data`；表格语义、布局与 lowering 进入 `@retikz/table`；通用无框架挂载、SSR 与输出能力进入 `@retikz/vanilla`

## 约束

- 公开 authoring 以简单函数和 plain data 为主，不建立平行 Table IR
- render / embed 入口复用 `@retikz/table` 的 lowering 与 `@retikz/vanilla` 的宿主能力
- 不复制 Table structure、rules、layout、manifest、lineage 或 locator 算法
- 保持 SSR 友好，构建 spec 与 lowering 不依赖 DOM 全局
- SSR 路径保持无 DOM；未来虚拟滚动仅在显式 mount/runtime 入口消费 `@retikz/table` 的 window / layout contract
- 新能力若无法由 `@retikz/table` 表达，先补底层能力，不在 Vanilla adapter 中私有实现

## 当前状态

当前目录只建立包职责边界，尚未初始化 npm package、builder、公开 API 或测试。正式实现必须跟随 Table ADR，并保持 adapter 与核心语义等价。
