# viz 分组工作指南

本文件覆盖 `packages/viz/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。

## 当前包

| 包 | 职责 |
| --- | --- |
| `@retikz/data` | viz 通用数据层：数据模型、字段解析、数据通道基础、transform schema / definition / registry / apply pipeline |
| `@retikz/plot` | Tier 2 GoG 可视化层：Plot IR、scale / coordinate / mark / guide、plot lowering；数据层能力来自 `@retikz/data` |
| `@retikz/plot-react` | plot 的 React adapter，把 props / children 组装成 plot spec 并交给底层 lowering |
| `@retikz/plot-vanilla` | plot 的 framework-free / SSR adapter |

未来的 chart / table / geo 等边界只在 ADR 或 roadmap 明确后落包；AGENTS 不为未存在包保留详细规则。

## 分层约束

- viz 组是 Tier 2 能力层，不向 core 组反向注入实现；通用绘图 / 几何缺口优先补 `@retikz/core` 或 `@retikz/math`。
- `@retikz/data` 是数据模型、字段解析、transform 和通用数据通道真源；plot / chart / table 不复制数据处理算法。
- `@retikz/plot` 是 plot 语义、layout transform 和 lowering 真源；adapter 不复制 data、scale、coordinate、mark、guide 或 lowering 算法。
- viz 内共用几何类型和工具优先来自 `@retikz/math` / `@retikz/core`。例如二维坐标用 `Position`，有限 / 无穷数值判断用既有 helper，不在 plot 内重复定义。
- 已存在的本包工具应复用；如果工具应上移到 math/core，先迁移再使用。

## 代码风格

从 d3 生态导入的运行时函数、常量和值对象统一用 `d3Xxx` 本地名；类型统一用 `D3Xxx` 本地名，避免与项目内 scale / formatter / schema 命名混淆。

## 验证

改 `@retikz/plot` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/plot exec eslint . --fix
pnpm --filter @retikz/plot exec tsc --noEmit
```

adapter 改动按对应包运行同类命令；跨包 API 改动同步 docs。
