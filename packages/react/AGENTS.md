# @retikz/react 工作指南

> 本文档是 `@retikz/react` 包内特有的规范。
> 项目通用规则（commit / TS / React 组件规范 / Kernel-Sugar-Tier2 分层 / 目录与文件命名等）见根 [`AGENTS.md`](../../AGENTS.md)。
> core 侧约束见 [`packages/core/AGENTS.md`](../core/AGENTS.md)。

---

## 这个包是什么

`@retikz/core` 之上的 **React adapter**：把 Kernel/Sugar JSX 编译成 `IR` → 调 `compileToScene` 拿 `Scene` → 渲染成 SVG。

- **Kernel 组件**：`<TikZ>` `<Node>` `<Path>` `<Step>` `<Text>` `<Coordinate>` `<Scope>`——一对一映射 IR
- **Sugar 组件**：`<Draw>` `<EdgeLabel>` 等——builder 同步展开为 Kernel，IR 完全等价
- **桥接函数**：`convertReactNodeToIR`（buildIR 别名）/ `convertIRToReactNode`（unbuilder）
- **renderer**：浏览器 SVG，`render/renderPrim.tsx` 把 ScenePrimitive 翻译为 React 元素

不在这里：Tier 2（plot / graph 等）独立成包，core / react 都不知道它们存在。

## 硬约束（CI 守门）

- **`react` / `react-dom` 是 `peerDependencies`**（`>=18`）——不要写进 `dependencies`；本地开发用 catalog 拉的 devDep 跑 vite / vitest
- **只能依赖 `@retikz/core` 一个 workspace 包**——不准 `import '@retikz/docs'` 或任何 app 包；不准引 Tier 2 包（@retikz/plot / @retikz/graph）
- **不引入运行时 npm 依赖**——`dependencies` 维持只有 `@retikz/core`；任何新增需在 PR 里写清楚理由
- **此包不引 Tailwind / shadcn / 任何样式库**——adapter 输出原生 SVG 元素，样式留给消费者；想加 className 通过 props 透传，不要在内部硬编 class
- **不依赖浏览器全局**：`document` / `window` / `HTMLElement` 只能在 `render/` 下出现（renderer 是浏览器特化部分）；`kernel/` / `sugar/` 必须 SSR-safe（builder 在服务端 / 测试里被同步调用，不能访问 DOM）

## 目录与职责

```
src/
├── index.ts          # 公开 API barrel（显式 named export）
├── kernel/           # Kernel 组件 + builder/unbuilder（JSX ↔ IR）
│   ├── TikZ.tsx Node.tsx Path.tsx Step.tsx Text.tsx Coordinate.tsx Scope.tsx
│   ├── builder.ts    # React 元素树 → IR（同步遍历 children）
│   ├── unbuilder.ts  # IR → React 元素树（带 key、不裹 TikZ 外壳）
│   ├── _displayNames.ts / _fields.ts  # 内部常量（_前缀 = 不导出）
│   └── index.ts
├── sugar/            # Sugar 组件（同步展开为 Kernel）
│   └── Draw.tsx EdgeLabel.tsx index.ts
└── render/           # 浏览器 SVG 渲染（唯一允许碰 DOM 的地方）
    ├── renderPrim.tsx       # ScenePrimitive → React 元素
    ├── path-d-builder.ts    # PathCommand[] → SVG d 字符串
    ├── transform-builder.ts # Transform[] → CSS transform 字符串
    ├── arrowMarkers.tsx     # 箭头 marker defs
    ├── browser-measurer.ts  # 浏览器端 measureText 实现
    └── viewBox.ts
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
- 复杂解析（如 `way` 字符串解析）走 `packages/core/src/parsers/`，sugar 调用纯函数获取展开结果——pure parser 既能被 React adapter 复用，未来 SSR / canvas adapter 也直接复用

## Renderer 规范（`render/`）

- **唯一允许 import 浏览器 API 的目录**——`document.createElementNS` / `getComputedStyle` / `requestAnimationFrame` 等只在这里出现
- **输入是 `Scene`，不是 IR**——不要在 renderer 里重做 IR → Scene 编译；走 `compileToScene` 一次
- **不做几何运算**——所有坐标 / anchor / bbox 在 `@retikz/core` 已算完；renderer 只做"把 primitive 字段翻译成 SVG 属性"
- **`browser-measurer.ts` 注入到 `compileToScene` 的 `measureText`**——服务端 / 测试环境换 fallback measurer，不要在 measurer 内部判 `typeof window`
- **箭头 marker 用 `<defs>` 注入 `<marker>`**，id 必须包含哈希避免多 `<TikZ>` 实例间冲突

## 公开 API（`src/index.ts`）

- **显式 named export**（与 core 同——见根 AGENTS.md）；不要 `export *`
- 透传 core 的常量 / 类型（如 `DrawWay`、`WayItem`）让 react 用户单包 import 就够用，避免迫使消费者同时装 `@retikz/core`
- **prop 类型必须 export**（`TikZProps` / `NodeProps` 等）——消费者写 wrapper / forwardRef 时要派生
- 内部辅助（`_displayNames` / `_fields` 等下划线开头的 module）**不导出**

## 测试

- 单测优先在 core 端覆盖几何 / 编译；react 这边主要测 `buildIR` 等价性、prop 传递、Sugar 展开
- DOM 相关测试在 `vitest` + `happy-dom` / `jsdom` 环境跑——renderer 测试要标 `// @vitest-environment happy-dom` 或在 vitest config 全局设置
- 等价性测试范式：`expect(buildIR(<Sugar.../>)).toEqual(buildIR(<KernelEquivalent.../>))`
