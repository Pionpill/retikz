# @retikz/plot-react 工作指南

`@retikz/plot-react` 是 `@retikz/plot` 的 React adapter，不是第二套 plot 引擎。

## 约束

- React 组件只负责把 props / children 组装成 `@retikz/plot` spec，并交给底层 lowering。
- 不复制 data、scale、coordinate、mark、guide 的算法；需要能力时先补 `@retikz/plot`。
- `react` / `react-dom` 保持 peerDependencies；不要引入浏览器全局作为构建 spec 的前提。
- Props 类型尽量从 `@retikz/plot` 的公开类型派生，不手写平行 schema。

## 验证

结构化改动后运行：

```bash
pnpm --filter @retikz/plot-react exec eslint . --fix
pnpm --filter @retikz/plot-react exec tsc --noEmit
```
