# @retikz/react 工作指南

本文件只写 `@retikz/react` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户用 JSX 构造 Core 能力，并把编译后的 Scene 接入 React 的 SVG / Canvas 宿主生命周期
- **拥有的契约**：Kernel / Sugar React 组件、props / children 到 Core IR 的 adapter、React 侧 runtime / hydration 接线与公开 props 类型
- **不拥有的能力**：Core IR / Scene 语义、几何与 compile 规则、SVG / Canvas 后端算法、Plot 等 Tier 2 语法或通用业务组件
- **输入与输出**：接收 JSX、公开 props、compile / render options，构造 Core IR 并调用 core / render，输出 ReactElement 与宿主 runtime 句柄
- **缺口流向**：新图形语义先补 `@retikz/core`；通用几何下沉 `@retikz/math`；后端执行补 `@retikz/render`；Tier 2 能力留在各自 React adapter；只有 authoring convenience 才进入 Sugar

具体适配链路：

- Kernel 组件一对一映射 IR：`Layout`、`Node`、`Path`、`Step`、`Text`、`Coordinate`、`Scope` 等。
- Sugar 组件同步展开为 Kernel，产出的 IR 必须与手写 Kernel 等价。
- Scene 到 SVG / Canvas 的主逻辑属于 `@retikz/render`；react 侧只拥有 host shell、Runtime session、idPrefix 与 commit 后回调接线。
- Tier 2（plot 等）独立成包；react 包不内置它们的语法或算法。

## 硬约束

- `react` / `react-dom` 保持 peerDependencies，本地开发再放 devDependencies。
- workspace 依赖限于 `@retikz/runtime`、`@retikz/core` 与 `@retikz/render`；不 import app 包或 Tier 2 包。
- 不新增第三方运行时依赖；确需新增时先说明理由。
- 不引 Tailwind / shadcn / 样式库；adapter 输出原生 SVG / Canvas 宿主，样式由消费者或 props 控制。
- `kernel/` 与 `sugar/` 必须 SSR-safe，不访问 `document` / `window` / `HTMLElement`。浏览器全局只允许在 `render/` 下出现。

## 目录职责

```text
src/index.ts   公开 API，只聚合允许公开的一级 owner barrel
kernel/        React DSL Kernel：组件、JSX ↔ IR adapter、Layout runtime
sugar/         Sugar 组件与同步展开 helper，可按 path / shapes 分组
render/        React 宿主渲染接线，可按 svg / canvas / text 分组
```

新增模块时按职责放置；不要在 `render/` 外写浏览器特化逻辑。

`kernel/` 内部按 owner 拆分：

```text
components/  Kernel DSL 标记组件：Layout 之外的 Node / Path / Step / Scope / Coordinate / Text
protocol/    displayName、水合事件 props、embeddable 协议等跨 owner 共享契约
adapter/     JSX ↔ IR 转换逻辑：builder / unbuilder / 字段透传表
runtime/     Layout、hydration handler 收集、renderer mode 接线
```

- 用户可用 React 组件文件用 `PascalCase.tsx`；非组件纯逻辑用 `kebab-case.ts`。
- 内部 helper 用语义名，不用 `_xxx.ts`；例如 `fields.ts`、`display-names.ts`、`shape-helpers.ts`。
- 每个 owner 目录用 `index.ts` barrel 收口；`src/index.ts` 只聚合允许进入包公共面的一级 owner。
- `kernel/components` 可以依赖 `kernel/protocol`，不得依赖 `adapter` / `runtime` / `render` / `sugar`。
- `kernel/adapter` 可以依赖 `kernel/components` 与 `kernel/protocol`，不得依赖 `kernel/runtime` 或 `sugar`。
- `kernel/runtime` 可以依赖 `kernel/adapter`、`kernel/protocol` 与 `render`；`sugar` 可以依赖 `kernel/components` 与 `kernel/protocol`，不得依赖 `kernel/runtime`。
- `render` 不依赖 `kernel/runtime`；浏览器全局只允许在 `render/` 下出现。

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
- `Layout` 的客户端 IR / JSX 路径统一创建 retained Runtime session；React 只声明 `<svg>` / `<canvas>` shell，descendants / bitmap 由 Render participant 独占。
- SSR SVG 只输出 opaque seed，首次客户端 layout effect 以 `adopt` 接管；后续 render 不重写 Render-owned descendants。
- 坐标、anchor、bbox 等几何计算属于 core；react renderer 不重复实现。
- SVG 输出形态优先改 `@retikz/render/svg`；react 侧保持 `SvgNode -> ReactElement` 薄映射。
- `browser-measurer.ts` 只实现浏览器端 text measurement，并注入 `compileToScene`；服务端 / 测试环境使用 fallback measurer。
- 多个 `<Layout>` 实例共享页面时，资源 id 必须通过 idPrefix / hash 避免冲突。

## 公开 API

- `src/index.ts` 默认用 `export *` 聚合允许公开的一级 owner barrel，不在根入口维护显式导出清单。
- 一级 owner barrel 决定哪些子 owner 可以继续向上暴露；被选中的公共子 owner barrel 仍默认用 `export *`。
- 不需要公开的模块不得进入一级 owner barrel；owner 内通过相邻路径或私有子 barrel 导入。
- 不得为了测试入口或复用便利，把 renderer / internal helper 转发到 `@retikz/react` 顶层。
- 导出所有用户可能派生 wrapper 的 prop 类型。
- 可透传 core 常量 / 类型，避免 react 用户必须额外从 core import。

## 测试

- core 侧优先覆盖几何和编译；react 侧重点测 `buildIR`、prop 传递、Sugar 展开、hydration / renderer 接线。
- DOM 相关测试用 `happy-dom` / `jsdom` 环境，并在测试或 vitest config 中明确标注。
