# @retikz/core 工作指南

本文件只写 `@retikz/core` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 硬约束

- 不准 import `react` / `react-dom`；React 内容属于 `@retikz/react`。
- 不准依赖 DOM API（`document` / `window` / `canvas` / `HTMLElement` 等）；浏览器能力由 adapter 或 render 包注入。
- 运行时依赖只允许 `@retikz/math` 与 `zod`；新增依赖必须先说明理由。
- 任何可能进入 IR 的数据都必须 JSON 可序列化，禁止函数、ref、closure、class 实例。
- `compileToScene` 必须保持纯函数：相同 IR + options 产生相同 Scene；禁止 `Math.random()`、`Date.now()`、module-level mutable state。

## 目录分层

```text
shared/      无业务依赖的常量、类型、纯工具、跨层纯几何 helper
schemas/     Zod schema 与 IR 类型真源
contract/    第三方作者实现的 Definition、defineXxx、Scene 输出契约、能力无关 helper
providers/   内置 definition、BUILTIN_*、registry resolver
compile/     IR 到 Scene 的编排、layout、lowering、registry 消费
parsers/     字符串 / DSL parser，输出 IR 节点
presets/     内置 preset
```

改这些层的依赖方向、文件职责或 define-registry 能力前，按根 AGENTS 的 `standard-*` skill 分流。

## 几何与坐标

- 坐标系为 `[x, y]`，x 向右、y 向下，与 SVG / Canvas 一致；单位是 user units。
- 2D 形状的 `x, y` 表示几何中心，不表示边界角点；转换到 SVG 原生坐标只发生在 emit primitive 阶段。
- 极坐标可以进入 IR，但只在 Scene 编译阶段解析为笛卡尔；下游 renderer 和几何计算只看笛卡尔。
- 几何工具用纯函数 + plain data；函数集合可用 `const xxx = { ... }` 命名空间形态，不写 class。

## Scene 编译

- `ScenePrimitive` 是后端最大公约子集，避免 SVG-only 或 Canvas-only 特性泄漏进 core。
- `PathPrim.commands` 与 `GroupPrim.transforms` 必须是结构化数组，不输出 SVG `d` / `transform` 字符串。
- `circlePath` / `ellipsePath` 可在 IR 编译为结构化 `ellipseArc`；后端自行映射为原生 API。
- 文本在 Scene 编译完成时必须已有度量结果；度量函数通过 `CompileOptions.measureText` 注入，缺省走 fallback。

## Registry 与 Shape

- 扩展能力按 `contract/<能力>` + `providers/<能力>` 分层：contract 放 author-facing 类型和 define helper；providers 放内置实现和 registry 合并。
- 内置 definition 不享有特殊入口。有效表应由内置表与 options 自定义表合并，冲突通过 warning 或明确策略处理。
- `node.shape` 在 IR 中永远是字符串名；`ShapeDefinition` 不进 IR，经 `CompileOptions.shapes` 注入。schema 只校验字符串形状，未注册名在 compile 期处理。
- Shape 几何方法围绕外接 `Rect` 工作；`emit` 接轴对齐 rect，rotate 由外层 `GroupPrim` 统一施加。
- 改内置 shape 几何或 emit 时，优先跑 shape baseline snapshot 和相关 compile 测试。

## Scope 与命名

- `IRScope` 表示分组、局部 transform 与样式默认作用域；scope transform 在 compile pass 中下沉到 Scene `GroupPrim.transforms`。
- compile 使用 `NameStack` 做 id 查找：默认全局扁平；`localNamespace` 时隔离子 frame；`scope.id` 始终注册到父 frame，作为外部句柄。
- lookup 按 inside-out；同 frame 重复 id 发 warning 并 last-wins，跨 frame 同名是 shadowing。
- scope 的相对定位、bbox synthetic layout、样式继承和 `resetStyle` 属 compile 语义；改动前读相关代码与测试，不把规则复制到 renderer。

## Parsers

- parser 必须是纯函数：input -> output，无副作用。
- parser 输出 IR 节点或 IR 片段，不输出 React props 或 adapter 私有结构。
- 解析失败用 `throw new Error('parseXxx: ...')`，消息开头标明解析器名。

## 公开 API

- 只通过 `src/index.ts` 暴露公开 API；adapter 不 import core 内部子路径。
- 顶层 `src/index.ts` 用显式 named re-export，作为公共契约面；内部子 barrel 可用 `export *`。

## 测试

- schema / IR 改动：补 schema 行为测试，并按 `standard-schema` 同步描述、类型和 docs。
- compile / lowering 改动：补 compile 输出和边界输入测试。
- 几何 / shape / path 改动：补几何或 snapshot 回归，避免只靠视觉 demo。
