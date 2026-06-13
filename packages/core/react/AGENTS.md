# @retikz/react 工作指南

> 本文档是 `@retikz/react` 包内特有的规范。
> 项目通用规则（commit / TS / React 组件规范 / Kernel-Sugar-Tier2 分层 / 目录与文件命名等）见根 [`AGENTS.md`](../../AGENTS.md)。
> core 侧约束见 [`packages/core/AGENTS.md`](../core/AGENTS.md)。

---

## 这个包是什么

`@retikz/core` 之上的 **React adapter**：把 Kernel/Sugar JSX 编译成 `IR` → 调 `compileToScene` 拿 `Scene` →
经 `@retikz/render` 翻译成中性 SVG 描述树 → 映射成 React 元素（canvas 模式则交 `CanvasHost` 在 `<canvas>` 上绘制）。

- **Kernel 组件**：`<Layout>` `<Node>` `<Path>` `<Step>` `<Text>` `<Coordinate>` `<Scope>`——一对一映射 IR
- **Sugar 组件**：`<Draw>` `<EdgeLabel>` 形状（`<Circle>` `<Ellipse>` `<Arc>` `<Sector>` `<Rectangle>` `<Grid>`
  `<RegularPolygon>` `<Star>`）等——builder 同步展开为 Kernel，IR 完全等价
- **桥接函数**：`convertReactNodeToIR`（buildIR 别名）/ `convertIRToReactNode`（unbuilder）
- **渲染主路径（SVG）**：`@retikz/render/svg` 的 `buildSvgDocument(scene, …)` 产中性 `SvgNode` 描述树（含
  `<defs>` / 按需 dedup 的 `<marker>` / paint / clip 资源），react 侧 `render/svg-to-react.ts` 把 `SvgNode` 薄映射成
  React 元素 + `useId` 绑定 idPrefix。**Scene→SVG 的逻辑单一真源在 `@retikz/render/svg`，react 不在本地重做**
- **渲染主路径（Canvas）**：`render/canvas-host.tsx` 把同一份 `Scene` 交给 render 层的 canvas 绘制 + hitTest
- **水合 / 动画**：经 `@retikz/render/hydration`（事件委托、坐标映射）与 `@retikz/render/animation`（WAAPI 桥）接线

不在这里：Tier 2（plot / graph 等）独立成包，core / react 都不知道它们存在。

## 硬约束（CI 守门）

- **`react` / `react-dom` 是 `peerDependencies`**（`>=18`）——不要写进 `dependencies`；本地开发用 catalog 拉的 devDep 跑 vite / vitest
- **workspace 依赖限于 `@retikz/core` + `@retikz/render`**——core 提供 IR / schema / `compileToScene` / 几何，
  render 提供 renderer-agnostic 的 SVG 描述树（`/svg`）、水合 runtime（`/hydration`）、动画桥（`/animation`）。
  不准 `import '@retikz/docs'` 或任何 app 包；不准引 Tier 2 包（@retikz/plot / @retikz/graph）
- **不引入第三方运行时 npm 依赖**——`dependencies` 维持只有 `@retikz/core` 与 `@retikz/render` 两个 workspace 包；
  任何新增需在 PR 里写清楚理由
- **此包不引 Tailwind / shadcn / 任何样式库**——adapter 输出原生 SVG 元素，样式留给消费者；想加 className 通过 props 透传，不要在内部硬编 class
- **不依赖浏览器全局**：`document` / `window` / `HTMLElement` 只能在 `render/` 下出现（renderer 是浏览器特化部分）；`kernel/` / `sugar/` 必须 SSR-safe（builder 在服务端 / 测试里被同步调用，不能访问 DOM）

## 目录与职责

```
src/
├── index.ts          # 公开 API barrel（显式 named export）
├── kernel/           # Kernel 组件 + builder/unbuilder（JSX ↔ IR）
│   ├── Layout.tsx Node.tsx Path.tsx Step.tsx Text.tsx Coordinate.tsx Scope.tsx
│   ├── builder.ts    # React 元素树 → IR（同步遍历 children）
│   ├── collect-hydration-handlers.ts / event-props.ts  # 水合：按 id 收集 on<Event> handler
│   ├── renderer-context.ts / RendererModeProvider.tsx  # svg/canvas 双渲染模式
│   ├── unbuilder.ts  # IR → React 元素树（带 key、不裹 Layout 外壳）
│   ├── _displayNames.ts / _fields.ts  # 内部常量（_前缀 = 不导出）
│   └── index.ts
├── sugar/            # Sugar 组件（同步展开为 Kernel）
│   ├── Draw.tsx EdgeLabel.tsx
│   ├── Circle.tsx Ellipse.tsx Arc.tsx Sector.tsx Rectangle.tsx Grid.tsx RegularPolygon.tsx Star.tsx
│   ├── _shared.ts   # 形状 sugar 共用的几何 / box / 角度纯函数（_前缀 = 不导出）
│   └── index.ts
└── render/           # 浏览器渲染（唯一允许碰 DOM 的地方）
    ├── svg-to-react.ts      # 渲染主路径：render 层 SvgNode 描述树 → React 元素（薄映射 + idPrefix 绑定）
    ├── canvas-host.tsx      # canvas 模式宿主：同一份 Scene 交 render 层绘制 + hitTest
    ├── browser-measurer.ts  # 浏览器端 measureText 实现（注入 compileToScene）
    ├── view-box.ts
    └── render-prim.tsx / path-d-builder.ts / transform-builder.ts / arrow-markers.tsx / paint-defs.tsx / clip-defs.tsx
        # 早期「直接把 ScenePrimitive 翻成 React」的渲染实现，主路径迁到 buildSvgDocument + svg-to-react 后已不在
        # 主链上，仅部分测试仍引用，待单独清理；新增渲染逻辑不要往这些文件加，统一走 @retikz/render
```

## Kernel 组件规范

- **不渲染真实 DOM**——Kernel 组件由 `buildIR` 同步遍历获取 props 后丢弃，不进入 React render 树
  - 因此**禁止 hooks**（useState / useMemo / useEffect / useRef 任意 React hook 都会抛 "Invalid hook call"）
  - 因此**禁止 React.Children.map / cloneElement 在组件函数体内**——builder 自己遍历 children
- **每个 Kernel 组件对应一个 IR 节点**，props ≈ IR 字段（命名沿用 IR schema）；增加 prop 必须先改 core 的 zod schema，再在 React 组件 props 类型上同步暴露
- **props 类型用 `z.infer` 出来的 IR 类型派生**（如 `NodeProps = Pick<IRNode, ...>` 或 `Omit<...>`），不要手抄字段——根 AGENTS.md "TS 类型用 `z.infer` 派生"在此延伸
- **display name 必须设置**（`Foo.displayName = 'Foo'`）——builder 靠 `_displayNames.ts` 里的常量识别节点类型，minify 后变量名丢失，displayName 是唯一锚点

## Sugar 组件规范

- **Sugar = Kernel 等价性**（根 AGENTS.md 已述）——产出的 IR 必须完全等价于手写 Kernel JSX，每加一种 Sugar 配一条等价性测试
- **同步展开**：Sugar 组件函数被 builder 同步调用、拿到返回的 JSX 后立即递归展开；与 Kernel 一样**禁止 hooks**
- **不在 sugar 里引入新 IR 字段**——展开后只能由 Kernel 已暴露的字段组合而成；想要新字段先升级 core 的 schema + 给 Kernel 加 prop
- 复杂解析（如 `way` 字符串解析）走 `packages/core/core/src/parsers/`，sugar 调用纯函数获取展开结果——pure parser 既能被 React adapter 复用，未来 SSR / canvas adapter 也直接复用

## Renderer 规范（`render/`）

- **唯一允许 import 浏览器 API 的目录**——`document.createElementNS` / `getComputedStyle` / `requestAnimationFrame` 等只在这里出现
- **输入是 `Scene`，不是 IR**——不要在 renderer 里重做 IR → Scene 编译；走 `compileToScene` 一次
- **不做几何运算**——所有坐标 / anchor / bbox 在 `@retikz/core` 已算完
- **SVG 主路径不在 react 本地拼 SVG**——SVG 描述树（含 `<defs>` / `<marker>` / paint / clip）由 `@retikz/render/svg`
  的 `buildSvgDocument` 统一产出；`svg-to-react.ts` 只做 `SvgNode → ReactElement` 薄映射 + idPrefix 绑定。
  想改 SVG 输出形态去改 `@retikz/render/svg`，不要在 react 这边另写一套翻译
- **`browser-measurer.ts` 注入到 `compileToScene` 的 `measureText`**——服务端 / 测试环境换 fallback measurer，不要在 measurer 内部判 `typeof window`
- **箭头 marker id 必须包含 idPrefix / 哈希**避免多 `<Layout>` 实例间冲突（dedup 与物化在 `@retikz/render/svg` 完成）

## 公开 API（`src/index.ts`）

- **显式 named export**（与 core 同——见根 AGENTS.md）；不要 `export *`
- 透传 core 的常量 / 类型（如 `DrawWay`、`WayItem`）让 react 用户单包 import 就够用，避免迫使消费者同时装 `@retikz/core`
- **prop 类型必须 export**（`LayoutProps` / `NodeProps` 等）——消费者写 wrapper / forwardRef 时要派生
- 内部辅助（`_displayNames` / `_fields` 等下划线开头的 module）**不导出**

## 测试

- 单测优先在 core 端覆盖几何 / 编译；react 这边主要测 `buildIR` 等价性、prop 传递、Sugar 展开
- DOM 相关测试在 `vitest` + `happy-dom` / `jsdom` 环境跑——renderer 测试要标 `// @vitest-environment happy-dom` 或在 vitest config 全局设置
- 等价性测试范式：`expect(buildIR(<Sugar.../>)).toEqual(buildIR(<KernelEquivalent.../>))`
