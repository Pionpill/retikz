# @retikz/data 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 plot、未来 table / geo 等不同宿主提供统一、可序列化、可扩展的数据准备能力，避免宿主重复定义字段与 transform 语义
- **拥有的契约**：Data IR / schema、字段与输入格式解析、通用 transform / statistics definitions 与 registries、apply pipeline、lineage / provenance 和数据诊断
- **不拥有的能力**：视觉 channel / scale、mark / guide、可视化 layout / lowering、renderer、框架 authoring、数据库连接或业务实体模型
- **输入与输出**：接收 Data IR、external rows、runtime definitions 与 pipeline options，输出规范化 data view、字段信息、lineage 和 diagnostics；不输出 Core IR 或视觉图元
- **缺口流向**：宿主无关的 rows / fields / statistics 能力进入本包；依赖 mark / scale / coordinate / layout 的操作留在 `@retikz/plot`；通用几何下沉 math / core；数据源、权限和缓存留在应用或 source adapter

新增或迁移数据能力前，先按 [`data-capability-complete.md`](../_notes/architecture/data-capability-complete.md) 确认 Data Complete 的宿主无关边界、扩展闭环和消费方责任。

## 分层

```text
shared/       无依赖共享词汇、纯函数、映射和工具类型
schemas/      Zod schema 与数据 IR 类型真源
contract/     transform / statistics / format 等扩展契约与公开类型
providers/    内置 definition、registry resolver、dispatch / apply / resolve
pipeline/     数据流编排，消费 providers / contract
```

- `@retikz/data` 不依赖 `@retikz/plot`、`@retikz/plot-react`、`@retikz/plot-vanilla` 或未来 chart / table 包。
- 宿主特有 definition 可以留在宿主包，但必须复用 data 的 contract / registry / pipeline；不依赖视觉语义的 rows / fields / statistics 能力归 data。
- 函数保持纯计算和 plain data；不要把 ReactNode、class 实例、d3 scale 函数或 renderer 对象放入数据 schema。
- 数据 schema 必须 100% JSON 可序列化；运行时函数只出现在 definition、resolver option 或 adapter 选项中。
- 新增或迁移分层能力前，先按根 AGENTS 读取 `standard-structure` 及对应层级 skill。

## 验证

改 `@retikz/data` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/data exec eslint . --fix
pnpm --filter @retikz/data exec tsc --noEmit
pnpm --filter @retikz/data test:changed
```

跨包迁移还需运行消费方包的同类验证；模块全量测试按根 AGENTS 的验证分级执行。
