# plot 分组工作指南

本文件覆盖 `packages/plot/` 下的 Tier 2 绘图语法分组。全仓通用规则仍以根目录 `AGENTS.md` 为准。

## 分组定位

| 包 | 职责 |
| --- | --- |
| `@retikz/plot` | grammar-of-graphics Plot IR、数据处理、scale / coordinate / mark lowering，最终下沉到 `@retikz/core` |
| `@retikz/plot-react` | React 绑定层，把 JSX / props 组装成 plot spec，并交给 `@retikz/plot` + `@retikz/react` |
| `@retikz/plot-vanilla` | framework-free / SSR 入口，把 plot spec + 数据渲染为 core / vanilla 输出 |

## 分层约束

- plot 分组是 Tier 2，不向 core 组反向注入能力；遇到通用绘图 / 几何能力缺口，优先补 `@retikz/core` 或 `@retikz/math`，不要在 plot 里造平行底座。
- `@retikz/plot` 是语法和 lowering 真源；react / vanilla 只做 adapter，不复制 scale、coordinate、mark lowering 逻辑。
- 共用几何类型和工具优先来自 `@retikz/math` / `@retikz/core`。例如二维坐标类型使用 `Position`，有限 / 无穷数值判断使用 `isFiniteNumber` / `isInfiniteNumber`，不要在 plot 内重新定义同义工具。
- 已存在的本包共用工具应复用，不要在子模块里重复实现同类 parser / formatter；如果工具应该上移到 math/core，先迁移再使用。

## 代码风格

- plot 分组里从 d3 生态导入的运行时函数、常量和值对象统一用 `d3Xxx` 本地名，例如 `format as d3Format`、`utcFormat as d3UtcFormat`、`scaleLinear as d3ScaleLinear`、`schemeCategory10 as d3SchemeCategory10`。从 d3 导入的类型统一用 `D3Xxx` 本地名，例如 `ScaleLinear as D3ScaleLinear`，避免与项目内 scale / formatter / schema 命名混淆。

## 验证

改 `@retikz/plot` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/plot exec eslint . --fix
pnpm --filter @retikz/plot exec tsc --noEmit
```

adapter 改动按对应包运行同类命令；跨包 API 改动需要同步 docs。
