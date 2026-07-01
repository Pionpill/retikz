# @retikz/react 工作指南

本文件只写 `@retikz/react` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包定位

`@retikz/react` 是 `@retikz/core` 之上的 React adapter：把 Kernel / Sugar JSX 编译成 IR，调用 `compileToScene`，再经 `@retikz/render` 输出 SVG 或 Canvas。

- Kernel 组件一对一映射 IR：`Layout`、`Node`、`Path`、`Step`、`Text`、`Coordinate`、`Scope` 等。
- Sugar 组件同步展开为 Kernel，产出的 IR 必须与手写 Kernel 等价。
- Scene 到 SVG / Canvas 的主逻辑属于 `@retikz/render`；react 侧只做 React 元素映射、idPrefix、事件和宿主接线。
- Tier 2（plot 等）独立成包；react 包不内置它们的语法或算法。

## 硬约束

- `react` / `react-dom` 保持 peerDependencies，本地开发再放 devDependencies。
- workspace 依赖限于 `@retikz/core` 与 `@retikz/render`；不 import app 包或 Tier 2 包。
- 不新增第三方运行时依赖；确需新增时先说明理由。
- 不引 Tailwind / shadcn / 样式库；adapter 输出原生 SVG / Canvas 宿主，样式由消费者或 props 控制。
- `kernel/` 与 `sugar/` 必须 SSR-safe，不访问 `document` / `window` / `HTMLElement`。浏览器全局只允许在 `render/` 下出现。

## 目录职责

```text
src/index.ts   公开 API，显式 named export
kernel/        Kernel 组件、builder/unbuilder、hydration handler 收集、renderer mode context
sugar/         Sugar 组件与同步展开 helper
render/        浏览器渲染接线：SvgNode -> ReactElement、CanvasHost、browser measurer、viewBox 等
```

新增模块时按职责放置；不要在 `render/` 外写浏览器特化逻辑。

## Kernel 组件

- Kernel 组件不渲染真实 DOM，由 builder 同步遍历 props 后丢弃。
- 禁止在 Kernel 组件中使用 React hooks、`React.Children.map` 或 `cloneElement`；children 遍历由 builder 负责。
- 每个 Kernel 组件对应一个 IR 节点；新增 prop 必须先改 core schema，再由 React props 类型同步暴露。
- Props 类型尽量从 `z.infer` 出来的 IR 类型派生，不手写平行 schema。
- 必须设置 `displayName`，builder 以稳定 displayName 识别节点类型。

## Sugar 组件

- Sugar 不引入新 IR 字段，只组合已有 Kernel 能力；要新字段先升级 core schema + Kernel prop。
- Sugar 组件由 builder 同步调用并递归展开，禁止 hooks。
- 每加一种 Sugar 或关键参数组合，补等价性测试：`buildIR(<Sugar />)` 等于 `buildIR(<KernelEquivalent />)`。
- 复杂解析放到 `@retikz/core` 的 parser 纯函数中，react sugar 只消费结果。

## Renderer 接线

- 输入是 Scene，不在 renderer 里重做 IR -> Scene 编译。
- 坐标、anchor、bbox 等几何计算属于 core；react renderer 不重复实现。
- SVG 输出形态优先改 `@retikz/render/svg`；react 侧保持 `SvgNode -> ReactElement` 薄映射。
- `browser-measurer.ts` 只实现浏览器端 text measurement，并注入 `compileToScene`；服务端 / 测试环境使用 fallback measurer。
- 多个 `<Layout>` 实例共享页面时，资源 id 必须通过 idPrefix / hash 避免冲突。

## 公开 API

- `src/index.ts` 用显式 named export，不用 `export *`。
- 导出所有用户可能派生 wrapper 的 prop 类型。
- 可透传 core 常量 / 类型，避免 react 用户必须额外从 core import。
- 下划线开头的内部模块不导出。

## 测试

- core 侧优先覆盖几何和编译；react 侧重点测 `buildIR`、prop 传递、Sugar 展开、hydration / renderer 接线。
- DOM 相关测试用 `happy-dom` / `jsdom` 环境，并在测试或 vitest config 中明确标注。
