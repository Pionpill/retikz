# React DSL 组织

## React DSL 目录范式

`@retikz/react` 的 DSL 代码按 owner 拆分：

```text
kernel/
  components/  Kernel DSL 标记组件
  protocol/    displayName、水合事件、embeddable 等跨 owner 共享协议
  adapter/     JSX props ↔ Vanilla `InputXxx` 转换逻辑：字段表与调度
  runtime/     Layout 运行时、hydration 收集、renderer mode 接线
sugar/         同步展开为 Kernel 的 Sugar 组件，可再按 path / shapes 分组
render/        React 宿主渲染接线，可再按 svg / canvas / text 分组
```

- 组件、helper 与子目录命名遵循 `standard-name`。
- 每个 owner 目录放 `index.ts` barrel，只导出当前 owner 的稳定 API。
- `kernel/components` 可以依赖 `kernel/protocol`，不得依赖 `adapter` / `runtime` / `render` / `sugar`。
- `kernel/adapter` 可以依赖 `kernel/components`、`kernel/protocol` 与 Vanilla `InputXxx` 合约，负责把 React props 构建为 Vanilla Input；不得依赖 `kernel/runtime` 或 `sugar`，也不得直接实现 Core Source IR builder 或绕过 Vanilla `normalizeXxx`。
- `kernel/runtime` 可以依赖 `kernel/adapter`、`kernel/protocol` 与 `render`；`sugar` 可以依赖 `kernel/components` 与 `kernel/protocol`，不得依赖 `kernel/runtime`；`render` 不依赖 `kernel/runtime`。
