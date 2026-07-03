# @retikz/plot-vanilla 工作指南

`@retikz/plot-vanilla` 是 framework-free / SSR adapter，不是第二套 plot lowering。

## 约束

- 渲染入口复用 `@retikz/plot` 的 composite lowering 和 `@retikz/vanilla` / `@retikz/core` 能力。
- 不复制 data、scale、coordinate、mark、guide 或 lowering 算法；需要能力时先补 `@retikz/plot`。
- 保持 SSR 友好，不依赖 DOM 全局。
- 公开 API 以简单函数和 plain data 为主。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/plot-vanilla exec eslint . --fix
pnpm --filter @retikz/plot-vanilla exec tsc --noEmit
```
