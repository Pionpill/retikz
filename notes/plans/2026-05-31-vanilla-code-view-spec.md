# Spec：ComponentPreview vanilla 代码视图

- 日期：2026-05-31
- 关联：[ADR-04 vanilla 命令式 builder](../decisions/core/v0/v0.3/v0.3-alpha.1/04-vanilla-imperative-builder.md)（本视图展示其 builder API）· [vanilla builder 实现计划](./2026-05-31-vanilla-imperative-builder-plan.md)（已落地）

## 目标

文档站 `ComponentPreview` 演示卡当前底部代码面板有 **React / IR** 两个视图。新增第三个 **vanilla** 视图，展示「用 `@retikz/vanilla` 命令式 builder 构同一张图」的等价代码，让无框架用户直接看到 builder API 用法。

**用户已定两条**：
- **codegen 为主 + 可手写覆盖**：默认从 IR 自动生成 vanilla 代码（与 IR 视图同源、零 per-demo 维护）；某 demo 若放了同名 `<name>.vanilla.ts` 手写文件，则原文优先。
- **常见 step + 优雅降级**：`draw` 的 way 从 IR steps 反推，覆盖 move/line/fold/cycle/curve/cubic/bend；arc/circlePath/ellipsePath/generator/rectangle 等冷门 step 输出 `/* unsupported step: <kind> */` 注释、不报错。

## 架构

四块改动，**不动 `@retikz/*` 包**，全在 `apps/docs/src/components/shared/component-preview/`：

### ① Codegen：`irToVanillaCode.ts`（新增，纯函数，TDD）

```ts
export const irToVanillaCode = (ir: IR): string;
```

输出一段可粘贴的 TS 源码：

```ts
import { figure, node, draw, coordinate, scope } from '@retikz/vanilla';

const fig = figure({}, [
  node('a', { position: [0, 0], text: 'A' }),
  draw([{ node: 'a' }, { node: 'b' }], { arrow: '->' }),
]);
```

**结构**：
- **import 行**：恒定 `import { figure, node, draw, coordinate, scope } from '@retikz/vanilla';`。若 way 用到 `DrawWay.Cycle`，追加一行 `import { DrawWay } from '@retikz/core';`（`-|`/`|-` 折角用裸字面量、不需 DrawWay import）。
- **body**：`const fig = figure(${figureConfig}, [\n${children}\n]);`。`figureConfig` = `ir.viewBox` 存在则 `{ viewBox: { x, y, width, height } }`，否则 `{}`（IR 不带 width/height，故不生成）。
- **child 缩进**：基准 2 空格，每层 scope +2。

**各 child 映射**（config 对象 = 该 IR 节点剥掉判别字段后的剩余字段，用 JS 字面量格式化器输出——key 合法标识符时不加引号、字符串单引号、短纯标量数组内联，复用 `_shared.formatIR` 的内联思路但 JS 风格）：

| IR child | 生成 |
|---|---|
| `node`（type='node'） | `node(${id ? "'id', " : ''}${config})`，config = node 剥 `type`/`id`；config 空且有 id → `node('id')`；全空 → `node()` |
| `coordinate` | `coordinate('id', ${config})`，config = 剥 `type`/`id`（剩 `position`） |
| `scope` | `scope(${config}, [\n  ...children\n])`，config = 剥 `type`/`children`（含 `transforms` 等）；递归 |
| `path`（type='path'） | `draw(${way}, ${config})`，config = 剥 `type`/`children`；way 见下 |

**draw 的 way 反推**（遍历 path.children steps）：

| step.kind | way 产出 |
|---|---|
| `move`（首段） | `step.to`（IRTarget 字面量） |
| `line` | `step.to` |
| `step`（fold，带 `via`） | `'-|'` 或 `'|-'`（= `step.via`）后跟 `step.to` |
| `cycle` | `DrawWay.Cycle`（触发 core import） |
| `curve` | `{ curve: step.control }` 后跟 `step.to` |
| `cubic` | `{ cubic: [step.control1, step.control2] }` 后跟 `step.to` |
| `bend` | `{ bend: step.bendDirection${bendAngle ? ', angle: n' : ''} }` 后跟 `step.to` |
| `arc` / `circlePath` / `ellipsePath` / `generator` / `rectangle` / 其它 | `/* unsupported step: <kind> */`（数组内合法注释，不抛） |

> `step.to` 是 IR 已 objectify 的 IRTarget（如节点 ref 是 `{ node: 'a', ... }` 而非 `'a'`），原样作 way item 合法（way 接受 IRTarget）。要更干净的 `'a'` 形态用手写覆盖。

**格式化器**（`irToVanillaCode.ts` 内部 helper）：`formatJsValue(value, indentLevel): string` —— 对象 `{ key: val }`（合法标识符 key 不加引号）、数组短则内联、字符串单引号、数字/布尔原样、嵌套递归缩进。

### ② 手写覆盖：glob `*.vanilla.ts`

`ComponentPreview.tsx` 加一个 raw glob（仿 `localSourceFiles`）：

```ts
const vanillaOverrides = import.meta.glob<string>('../../../contents/**/*.vanilla.ts', {
  query: '?raw', import: 'default', eager: true,
});
```

解析 key = `../../../contents/${segments}/${name}.vanilla.ts`；命中则 `vanillaSource = 原文.replace(/\n$/, '')`，否则 `vanillaSource = irToVanillaCode(buildPreviewIR(Component))`（与 `irJson` 同一 `buildPreviewIR`，包进同一 `useMemo`/try-catch，失败回退 `// Failed to generate vanilla code: ...`）。

### ③ 视图状态类型

- `_shared.ts`：`SourceView = 'react' | 'ir' | 'vanilla'`。
- `ComponentRender.tsx` 的 `ComponentRenderSource` 加 `vanilla?: string`。

### ④ UI：ViewToggle 动态化 + 两处视图分支扩三路

**`_parts.tsx` ViewToggle**：现在硬编码 React+IR 两个按钮。改为按**可用视图**动态渲染：

```ts
export type ViewToggleProps = {
  views: ReadonlyArray<SourceView>; // 可用视图，按 react→ir→vanilla 顺序
  view: SourceView;
  onChange: (next: SourceView) => void;
};
```

每个可用视图渲染一个 `ViewButton`：react=ReactIcon/"React"、ir=JsonIcon/"IR"、vanilla=lucide `Braces`/"Vanilla"。（`ViewButton` 保留，新增按 view 取 icon/text/label 的小映射。）

**`ComponentRender.tsx`**：
- `hasVanilla = (source?.vanilla ?? '').length > 0`；`hasCode = hasReact || hasIr || hasVanilla`。
- `availableViews: SourceView[]` = 过滤出有内容的 `['react','ir','vanilla']`；`showViewToggle = availableViews.length >= 2`。
- `effectiveView` = `view`（用户选的）若在 availableViews 内否则 `availableViews[0]`。
- vanilla 视图：`copyCode = vanillaSource`、`fullCode/displayedCode = vanillaSource`（无 diff、无 teaser，比照 IR）、`lang = 'ts'`。把现有 `effectiveView === 'ir' ? ... : ...` 二元分支改成覆盖 react/ir/vanilla 三态（lang：react→tsx、ir→json、vanilla→ts；copyCode/fullCode 同理）。teaser/diff 仍仅 react。
- `ViewToggle` 传 `views={availableViews} view={effectiveView} onChange={setView}`。

**`ComponentDetailDialog.tsx`**：同款三路扩展（`hasVanilla`、`availableViews`、`showViewToggle`、`effectiveView`、`copyCode`/`displayedCode`/lang 三态、`ViewToggle` 传 `views`）。初始 `view` = `availableViews[0]`。

## 测试设计

**Codegen 单测**（`irToVanillaCode.test.ts`，纯函数，docs app 的 vitest）：
- `node-codegen`：含 id / 匿名 / 全空三形态 → 正确 `node(...)` 串。
- `coordinate-codegen`：`coordinate('m', { position: [..] })`。
- `draw-way-line`：move+line steps → `draw([t0, t1, ...], cfg)`，way 与 steps 对应。
- `draw-way-fold-cycle`：fold(`-|`)+cycle → `'-|'` 字面量 + `DrawWay.Cycle` + core import 行。
- `draw-way-curve`：curve/cubic/bend → 对应 infix 算子对象。
- `draw-way-unsupported`：arc step → `/* unsupported step: arc */`，不抛。
- `scope-codegen`：嵌套 scope + transforms → 缩进正确、config 含 transforms。
- `figure-viewbox`：ir.viewBox → `figure({ viewBox: {...} }, ...)`；无 viewBox → `figure({}, ...)`。
- `formatJs-objects`：key 不加引号、字符串单引号、短数组内联。
- `roundtrip-sanity`（交互）：`compileToScene(irToVanillaCode 产物对应的 figure(...).ir)` 与原 IR 等价——用一个手搭 IR、不实际 eval 字符串，而是断言反推的 way 经 `parseWay` 等于原 steps（证明语义不漂）。

**UI 接线**：`pnpm --filter @retikz/docs build` 通过 + tsc + lint；chrome-devtools 目视——起 docs dev、开一个有 demo 的页、确认底部出现第三个 "Vanilla" 按钮、点开渲染 vanilla 代码且高亮正常、Copy 复制 vanilla 串、放大 Dialog 同样三视图。

## 影响

- 改 `apps/docs/src/components/shared/component-preview/`：`_shared.ts`（SourceView）、`_parts.tsx`（ViewToggle 动态）、`ComponentPreview.tsx`（glob + 接线）、`ComponentRender.tsx`（三路 + source 字段）、`ComponentDetailDialog.tsx`（三路）+ 新 `irToVanillaCode.ts` + `irToVanillaCode.test.ts`。
- 新依赖：无。codegen 只产**字符串**，运行时仅 import `@retikz/core` 的 `IR` 类型（type-only，已是站点依赖）；生成的 `import { figure, ... } from '@retikz/vanilla'` / `DrawWay.Cycle` 都只是输出文本，codegen 自身不 import vanilla 运行时、也不 import `DrawWay` 常量。
- 不动 `@retikz/{core,svg,canvas,vanilla,react}` 源码。
- 无 breaking：纯新增视图；仅有单视图的 demo（如 hideCode）行为不变。

## 不在范围

- vanilla 代码的实际 **eval / 运行**（视图只展示源码字符串，渲染仍走 React demo；不引入「用 vanilla 真渲染」通路）。
- way 反推冷门 step（arc/circle/ellipse/generator/rectangle）的精确还原——优雅降级注释 + 手写覆盖兜底。
- 给现有 demo 批量补 `.vanilla.ts` 手写覆盖（按需，单独做）。
- i18n 双语 vanilla（codegen 与语言无关；手写覆盖暂不分语言）。
