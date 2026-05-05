# React ↔ IR 双向转换 API 设计

- 日期：2026-05-05
- 范围：`@retikz/react`
- 相关文档：[`docs/DESIGN.md`](../../DESIGN.md)、[`docs/REACT-ADAPTER.md`](../../REACT-ADAPTER.md)、[`docs/CORE-REFACTOR.md`](../../CORE-REFACTOR.md)

## 1. 背景与目标

`@retikz/core` 定义了 framework-agnostic 的 IR（Zod schema、JSON 可序列化）。`@retikz/react` 用 Kernel 组件 `<Tikz/>/<Node/>/<Path/>/<Step/>` 提供声明式 DSL；`<Tikz>` 内部已通过 `_builder.ts` 的 `buildIR(children: ReactNode): IR` 把 JSX 翻译为 IR 再交给 `compileToScene`。

本设计要做的事是**把这条已有的内部能力公开**，并补上反向出口。两个用例驱动：

1. **持久化**：把当前画的图的 IR JSON 存数据库 / 文件，下次加载回来继续渲染。
2. **AI / 程序化生成**：用程序或 LLM 直接生成 IR JSON，再嵌入 React 树渲染。

注意：`<Tikz ir={...}/>` 这条 prop 入口已经能直接喂 IR JSON 渲染，所以场景 1/2 的"还原 + 渲染"路径**已经闭环**。本设计**不**重复造这条路径，而是为"用户拿到 IR、想把它当 React 子树处理（拼接、嵌套、再加工）"的场景补 API。

未来若 `@retikz/vue`、`@retikz/svelte` 等 adapter 加入，会按相同 pattern 补 `convertVueNodeToIR` / `convertIRToVueNode` 等同名函数；本次命名留出 `ReactNode` 段，正是为这件事铺路。

## 2. 公开 API

新增两个 named export，加在 `packages/react/src/index.ts`：

```ts
// React 组件树 → IR JSON
export const convertReactNodeToIR: (children: ReactNode) => IR;

// IR JSON → React element 树
export const convertIRToReactNode: (ir: IR) => ReactNode;
```

### 2.1 `convertReactNodeToIR`

- **实现策略**：作为 `buildIR` 的 `export-as` alias，**不**新建函数体：
  ```ts
  export { buildIR as convertReactNodeToIR } from './kernel/_builder';
  ```
- `buildIR` 仍保留作内部名（`<Tikz>` 内部继续调用），不重命名；这样既给公开 API 一个命名 pattern 一致的名字，又不动 4 个内部调用点。
- **入参约定**：与 `buildIR` 一致，接受 `<Tikz>` 的 children 形态（fragment / 数组 / 单 element / Sugar 组件 / Kernel 组件均可）。**不**自动剥离顶层 `<Tikz>`——传 `<Tikz>...</Tikz>` 进来不会工作；保持与 `buildIR` 内部语义一致避免歧义。

### 2.2 `convertIRToReactNode`

- **实现位置**：新文件 `packages/react/src/kernel/_unbuilder.ts`，与 `_builder.ts` 对称命名。
- **签名**：`(ir: IR) => ReactNode`。返回 element 数组（每个 element 带 `key`），不裹 `<Tikz>`、不裹 `<Fragment>`。
- **使用约定**：
  - 直接渲染：`<Tikz>{convertIRToReactNode(ir)}</Tikz>`，或者继续用现有的 `<Tikz ir={ir}/>`。
  - 二次加工：把返回的 element 数组与其他 `<Node/>` / `<Path/>` 拼装到同一 `<Tikz>` 子树。
- **纯函数**：无副作用、无 DOM、无 hooks，可在 SSR / 服务端 / 测试中直接调用。

### 2.3 不可逆性

`buildIR` 在收集阶段会**同步求值** Sugar 组件（如 `<Draw/>`），把它们展开成 Kernel `<Path>+<Step>`，IR 里没有 "原本是 Draw" 的痕迹。因此：

- `convertReactNodeToIR(<Draw way={...}/>)` 产出的 IR，再 `convertIRToReactNode` 回来只会得到 `<Path>+<Step>`。
- 这对持久化 / AI 生成两个用例没有副作用——它们关心的是 IR JSON 的稳定性，不关心源 JSX 形态。
- 文档里要把这条说清楚（JSDoc + spec 测试）。

## 3. 实现细节

### 3.1 `_unbuilder.ts` 大致形状

```ts
import { createElement, type ReactNode } from 'react';
import type { IR, IRChild, IRStep } from '@retikz/core';
import { Node } from './Node';
import { Path } from './Path';
import { Step } from './Step';

export const convertIRToReactNode = (ir: IR): ReactNode =>
  ir.children.map((child, i) => childToElement(child, i));

const childToElement = (child: IRChild, key: number): ReactNode => {
  switch (child.type) {
    case 'node':
      return createElement(Node, { key, ...nodePropsFromIR(child) });
    case 'path':
      return createElement(
        Path,
        {
          key,
          stroke: child.stroke,
          strokeWidth: child.strokeWidth,
          strokeDasharray: child.strokeDasharray,
        },
        child.children.map((step, j) => stepToElement(step, j)),
      );
    default:
      return assertNever(child);
  }
};

const stepToElement = (step: IRStep, key: number): ReactNode =>
  createElement(Step, { key, kind: step.kind, to: step.to });

const assertNever = (x: never): never => {
  throw new Error(`convertIRToReactNode: unknown IR child type: ${JSON.stringify(x)}`);
};
```

- `nodePropsFromIR` 把 `IRChild('node')` 字段拷成 `NodeProps`：大部分字段同名直传；`text` 走 prop（与 `buildNode` 的 "text 优先 props.text" 对称回写）。
- `undefined` 字段过滤掉，不污染 React DevTools 显示：`Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined))`。

### 3.2 模块组织

| 文件 | 改动 |
|---|---|
| `packages/react/src/kernel/_builder.ts` | 不动 |
| `packages/react/src/kernel/_unbuilder.ts` | **新增**——上述 `convertIRToReactNode` 实现 |
| `packages/react/src/kernel/index.ts` | 不动（继续只 barrel kernel 组件本身） |
| `packages/react/src/index.ts` | **新增**两行 export，并在导出行上方加 JSDoc |

### 3.3 JSDoc 要点

加在 `src/index.ts` 两个新 export 行**上方**，简短覆盖：

- 用途（持久化 / AI 生成的 IR JSON 作为契约面）。
- Sugar 不可逆：`convertReactNodeToIR(<Draw/>)` → IR → `convertIRToReactNode` 只能得 `<Path>+<Step>`。
- 不裹 `<Tikz>` 外壳，调用方自己组合（或继续用 `<Tikz ir={ir}/>`）。

`buildIR` 现有 JSDoc 不改，它的语义就是 `convertReactNodeToIR` 的语义。

## 4. 错误处理

### 4.1 `convertReactNodeToIR`

完全继承 `buildIR` 现有行为，不调整：

- `<Path>` 的 `<Step>` 子节点 < 2 → `throw new Error('<Path> requires at least 2 <Step> children')`（`_builder.ts:55`）。
- 首段非 `move` → 静默改写为 `move`。
- 非 Kernel/Sugar 的子节点（fragment / 字符串 / null / class 组件）→ 静默跳过。

### 4.2 `convertIRToReactNode`

策略：**信任 + 兜底**。

- **不主动 schema 校验**——避免本层反向依赖 Zod 校验路径。文档里说"如果 IR 来源不可信，调用方先 `SceneSchema.parse(ir)` 再传进来"（core 已 export schema，照例）。
- **discriminated union 穷举**——`switch (child.type)` 让 TypeScript 编译期保证不漏 case；运行时 `default` 调 `assertNever(child)` 抛错，错误消息开头标函数名，与 `parsers/` 的 `parseXxx: ...` 约定对齐。
- **不预判 polar `origin` 失效引用**（如 `origin: 'foo'` 但场景中无该 id 的节点）——这种错误由 `compileToScene` 的 `resolvePosition` 抛，本函数不重复检查。

`assertNever` 放在 `_unbuilder.ts` 文件内本地，不抽公共 utils（一处用，YAGNI）。

## 5. 测试

位置：`packages/react/tests/`（包内已有此目录）。**不引入新依赖**——直接读 React element 树（`element.type.displayName` / `element.props`）即可断言所有目标。

### 5.1 `tests/convertReactNodeToIR.test.tsx`

- `convertReactNodeToIR === buildIR` 引用相等（钉死 alias 形态，防止以后被改成包装函数破坏行为对等）。
- Smoke：`<Node/>` + `<Path><Step/><Step/></Path>` → 预期 IR shape。
- 不重复覆盖 builder 已有行为（如果包内已有 `_builder.test.tsx` 就不再添加；缺失也不在本次新增）。

### 5.2 `tests/convertIRToReactNode.test.tsx`

1. **空 scene**：`convertIRToReactNode({ version, type: 'scene', children: [] })` 返回空数组。
2. **单 Node 还原**：IR 里一个 `node` child → 返回 element 是 `<Node>`，`displayName === '@retikz/Node'`，关键 props（`id` / `position` / `text` / `fill` …）原样。
3. **Path + Steps 还原**：IR `path` 含 2 个 step → 返回 `<Path>` element，children 是两个 `<Step>`，displayName / `kind` / `to` 全对。
4. **Round-trip 保真（Kernel-only）**：构造已是 Kernel 形态的 IR，跑 `convertIRToReactNode → convertReactNodeToIR`，两端 IR `toEqual`。核心信心来源。
5. **Sugar 降级一次性确认**：构造 `<Tikz><Draw way={[[0,0],[1,0]]}/></Tikz>` → `convertReactNodeToIR` → IR → `convertIRToReactNode` → 再 `convertReactNodeToIR` → IR。第二次 IR 与第一次 `toEqual`（Kernel ↔ Kernel 自此稳定）；同时断言还原出的 element 是 `<Path>` 不是 `<Draw>`，把"Sugar 不可逆"显式钉成测试。
6. **未知 `child.type` 抛错**：手造 `{ type: 'bogus' as any }` 进去，断言 `throw /convertIRToReactNode: unknown IR child type/`。

### 5.3 不测的事

- `<Tikz>{convertIRToReactNode(ir)}</Tikz>` 渲染 SVG 是否正确——这是 `<Tikz>` + `compileToScene` + `renderPrim` 的责任，已有用例覆盖。
- 渲染输出像素级保真——核心包 / Scene 编译器测试覆盖。

## 6. 不在本次范围

- IR → JSX 源码字符串（`convertIRToReactNodeSource` / `*String` / `*Code`）：本次不做。
- 保留 Sugar 组件信息以便 round-trip 还原 Sugar：本次不做（持久化 / AI 用例不需要）。
- 其他 framework adapter 的同名 API（`convertVueNodeToIR` 等）：本次不做，仅在命名 pattern 上预留。
- `<Tikz>` 自动剥离：本次不做，`convertReactNodeToIR` 接受 children，与 `buildIR` 语义对齐。
