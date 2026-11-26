# @retikz/react 工作指南

本文件只写 `@retikz/react` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户用 JSX 构造既有 Core 能力，并把编译后的 Scene 接入 React 的 SVG / Canvas 宿主生命周期
- **拥有的契约**：Kernel / Sugar React 组件、JSX / props / children 到 Vanilla `InputXxx` 的 adapter、Tier 2 contribution 的 React 收集、React 对 Vanilla processing result 的订阅与宿主接线、公开 props 类型
- **不拥有的能力**：Core IR builder / Scene 语义、几何与 compile 规则、SVG / Canvas 后端算法、Plot 等 Tier 2 语法或通用业务组件
- **输入与输出**：接收 JSX、公开 props 与 Vanilla processing options，构造 Vanilla Input 并调用 Vanilla，订阅只读 processing result，输出 ReactElement 与 React 宿主句柄
- **缺口流向**：新图形语义先补 `@retikz/core`；全部框架无关 authoring / normalize 补 `@retikz/vanilla`；后端执行补 `@retikz/render`；Tier 2 能力留在各自 React / Vanilla adapter；只有 React JSX、状态或宿主对接才进入本包

具体适配链路：

- Kernel 组件把 JSX props 收集为 Vanilla Input：`Layout`、`Node`、`Path`、`Step`、`Text`、`Coordinate`、`Scope` 等。
- Sugar 组件同步展开为 Kernel，最终由 Vanilla 产生的 IR 必须与等价 Vanilla Input 一致。
- Scene 到 SVG / Canvas 的主逻辑属于 `@retikz/render`；Vanilla 管理运行时会话、idPrefix 与成功帧发布。React 宿主采用帧后才调用 `Layout.onCompileResult`；领域回调由对应的 Tier 2 宿主交付，不在 React render 或 SSR 期间触发。
- Tier 2（plot 等）独立成包；react 包不内置它们的语法或算法。
- Tier 2 的跨 namespace Composite roots / providers 只收集后交给 Core provider graph resolver；React 不按 namespace 私下合并 definitions、datasets 或传递依赖。

## 硬约束

- `react` / `react-dom` 保持 peerDependencies，本地开发再放 devDependencies。
- 必须直接依赖 `@retikz/vanilla`。React 不直接调用 `@retikz/core` 的 authoring helper 或直接拼装 Source IR，也不实现 Runtime session 或 renderer 编排；它只调用 Vanilla 的公开 normalize / processing API 并把只读结果映射到 React 宿主。不 import app 包或 Tier 2 包。
- 不新增第三方运行时依赖；确需新增时先说明理由。
- 不引 Tailwind / shadcn / 样式库；adapter 输出原生 SVG / Canvas 宿主，样式由消费者或 props 控制。
- `components/` 必须 SSR-safe，不访问 `document` / `window` / `HTMLElement`。浏览器全局只允许在 `render/` 下出现。

## 目录职责

```text
src/index.ts            包根公开 API，不暴露内部转换函数
components/             简单图元直接放在根目录；node/、path/ 汇总各自的图元、步骤和标签
components/layout/      Layout、场景收集与根作用域；每组 hook、Provider 与 context 同放一个 use-*.tsx 文件
hydration/              React 事件 props、事件名映射与 handler 收集
render/                 SVG / Canvas 宿主与 processing result 映射
shared/                 跨模块共享的组件展示名与嵌入协议
```

- 组件家族的 `index.ts` 汇总同组组件与内部 adapter，`components/index.ts` 精选公共导出；包根只公开声明与已有公开入口，不导出图元 adapter。
- 图元 adapter 只转换当前元素，可接收步骤序号信息或已收集的子项，不依赖 Layout、runtime 或 renderer。整棵场景的遍历、嵌入上下文及图元分派归 `components/layout`。
- Sugar 可以依赖 Kernel，Kernel 不依赖 Sugar 实现；`render` 不依赖容器，不创建编译会话。

## Kernel 组件

- Kernel 组件不渲染真实 DOM，由 builder 同步遍历 props 后丢弃。
- 禁止在 Kernel 组件中使用 React hooks、`React.Children.map` 或 `cloneElement`；children 遍历由 builder 负责。
- 每个 Kernel 组件对应一个 Vanilla Input；新增 prop 必须先改 core schema 与 Vanilla Input，再由 React props 类型同步暴露。
- Props 优先从对应 Vanilla 工厂的 Options 派生；无对应工厂时复用已有 Vanilla Input 或其字段；只有无 authoring 差异的持久化字段才直接复用 schema 推导的 IR 类型，不手写平行 schema。
- 必须设置 `displayName`，builder 以稳定 displayName 识别节点类型。

## Sugar 组件

- Sugar 不引入新 IR 字段，只组合已有 Kernel 能力；要新字段先升级 core schema、Vanilla Input 与 Kernel prop。
- Sugar 组件由 builder 同步调用并递归展开，禁止 hooks。
- 每加一种 Sugar 或关键参数组合，补等价性测试：React Sugar 与等价 Vanilla Input 经过同一 Vanilla 处理后得到相同 IR。
- 非 React 的输入解析与 shorthand 由 Vanilla 统一调度；React Sugar 不直接调用 Core parser 或拼装其 IR 结果。

## Renderer 接线

- 输入是 Vanilla readonly processing result，不在 renderer 里重做 IR -> Scene 编译或 Runtime session。
- `Layout` 的客户端 IR / JSX 路径由 Vanilla processing mode 选择常驻或临时非增量 SceneReconciler 执行，默认 session；React 只声明 `<svg>` / `<canvas>` shell，并将 Vanilla result 交给 Render 接线。
- SSR SVG 只输出 opaque seed，首次客户端 layout effect 以 `adopt` 接管；后续 render 不重写 Render-owned descendants。
- 坐标、anchor、bbox 等几何计算属于 core；react renderer 不重复实现。
- SVG 输出形态优先改 `@retikz/render/svg`；react 侧保持 `SvgNode -> ReactElement` 薄映射。
- `browser-measurer.ts` 只实现浏览器端 text measurement，并注入 Vanilla processing；服务端 / 测试环境使用 fallback measurer。
- 多个 `<Layout>` 实例共享页面时，资源 id 必须通过 idPrefix / hash 避免冲突。

## 公开 API

- `src/index.ts` 聚合允许公开的一级 owner barrel；各级入口按根规范的可见性规则选择全部或精选导出。
- 一级 owner barrel 决定哪些子 owner 及成员可以继续向上暴露；根入口逐项审查公开必要性、契约稳定性及消费方影响。
- 不需要公开的模块不得进入一级 owner barrel；owner 内通过相邻路径或私有子 barrel 导入。
- 不得为了测试入口或复用便利，把 renderer / internal helper 转发到 `@retikz/react` 顶层。
- 导出所有用户可能派生 wrapper 的 prop 类型。
- 可透传 core 常量 / 类型，避免 react 用户必须额外从 core import。

## 测试

- core 侧优先覆盖几何和编译；react 侧重点测 `buildIR`、prop 传递、Sugar 展开、hydration / renderer 接线。
- DOM 相关测试用 `happy-dom` / `jsdom` 环境，并在测试或 vitest config 中明确标注。
