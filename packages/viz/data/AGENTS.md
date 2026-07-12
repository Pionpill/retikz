# @retikz/data 工作指南

`@retikz/data` 是 viz 组通用数据层：负责数据模型、字段解析、数据通道基础、transform schema / definition / registry / apply pipeline，以及 provenance 等与宿主可视化无关的数据能力。

## 分层

```text
shared/       无依赖共享词汇、纯函数、映射和工具类型
schemas/      Zod schema 与数据 IR 类型真源
contract/     transform / statistics / format 等扩展契约与公开类型
providers/    内置 definition、registry resolver、dispatch / apply / resolve
pipeline/     数据流编排，消费 providers / contract
```

- `@retikz/data` 不依赖 `@retikz/plot`、`@retikz/plot-react`、`@retikz/plot-vanilla` 或未来 chart / table 包。
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
