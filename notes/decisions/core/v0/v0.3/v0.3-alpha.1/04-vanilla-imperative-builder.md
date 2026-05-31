# ADR-04：`@retikz/vanilla` 命令式 builder API（hyperscript 核 + fluent 糖）

- 状态：Proposed
- 决策日期：2026-05-31
- 关联：[ADR-03 `@retikz/vanilla` runtime + 依赖图](./03-vanilla-runtime-and-dependency-graph.md)（本 ADR 在其 vanilla 包上加 authoring API）· [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md) · [v0.3 roadmap §Vanilla runtime 范围](../roadmap.md)

> **范围**：ADR-03 定了 `@retikz/vanilla` 能消费 IR / Scene 渲染（`mountSvg` / `renderToSvgString`）。本 ADR 在其上加一套**命令式 builder API**——让无框架用户像 React 一样用具名图元（`node` / `draw` / `coordinate` / `scope` …）+ 自定义 shape 构图，产出同一份 IR 再走现有 renderer。**只动 `@retikz/vanilla`，不碰 `@retikz/react`。**
>
> ⚠️ **alpha 位置**：属 roadmap alpha.3+（vanilla runtime 增强）。决策在此一次定清，实现可随 alpha.3 落地。

## 背景

ADR-03 后，`@retikz/vanilla` 只能吃 **IR / Scene**：无框架用户要么手写 IR JSON、要么用不了。对标看：d3 是「在代码里命令式构图」、echarts/highcharts 是「一坨声明式 option 对象」。retikz **早已有那个 option 对象——就是 IR**（`mountSvg(container, ir)` ≈ `chart.setOption`），React JSX 则是 IR 之上带类型的声明式 DSL。**缺的是 d3 那种「在代码里用具名图元构图」的程序化 API**。

关键事实（定下面取舍）：React 的 `<Node>`/`<Draw>` 是「标记 + props 容器」，真逻辑在 `kernel/builder.ts`；而其中 `props→IR` 是平凡字段拷贝，**非平凡部分全是读 JSX children**（`Children.forEach` 解析文本行 / step / label）——命令式 API 没有 JSX children，这些直接传数据。真正的单一数据源是 **IR + core 的 zod schema**（`compileToScene` 校验），不是 builder 函数。

## 选项

> 三个决策维度：① API 形态；② 落点与共享方式；③ 签名约定。

### 维度①：API 形态

- **A. Fluent 有状态 builder**（d3 / highcharts-命令式）：`figure().node().draw().mount()`，链式累积。
- **B. Hyperscript**（「React 组件去掉 JSX」）：`figure(opts, [node(…), draw(…)])`，纯函数、与 IR / React 组件 1:1。
- **C. 只暴露 IR**：用户手拼 IR（现状）。表达力差、无具名图元糖。

### 维度②：落点与共享

- **A. 抽中性 builder（core 或新 `@retikz/builder`），react + vanilla 共用**：单一 `props→IR` 函数。代价：重构 react 已测试的组件/builder 层、可能新包。
- **B. vanilla 自带、react 不动**：vanilla 写自己的 builder，drift 靠 core IR 类型（类型层）+ zod schema（运行时层）兜底。

### 维度③：签名约定

- **A. 照搬 React props**：`node({ id, position, … })` 全进一个 props。
- **B. 重载简写**：`node('a', [0,0], 'A')`（位置/文本提成 positional），靠 `Array.isArray` 区分。
- **C. 必要参数前置 + config 对象**：`node(id, config)`，必要的做 positional、其余全进一个 config。

## 决策：①B 核 + A 糖；②B（vanilla 自带）；③C（必要参数前置 + config）

理由：

1. **①B 与 React 组件结构 1:1**——JSX 本就 desugar 成 `createElement(Node, props, children)`，`node(props, children)` 就是它去掉 React，心智零迁移；且是「中性化」天然产物。A（fluent）作**可选薄糖**给过程式用户、也是未来活更新的载体，但非核心。
2. **②B 省且稳**——可共享的「逻辑」是平凡字段拷贝，不值得重构 react 已测试层 / 抽新包。drift 靠**两层锚在 core**：vanilla 的 `config` 类型派生自 core IR 类型（字段不自列）+ `compileToScene` 的 zod schema 校验。`@retikz/react` 完全不动。
3. **③C 无歧义、统一**——必要参数前置、其余进一个 config，避免 B 的重载歧义；`config` 派生自 IR 类型故不维护第二份字段清单。

补充两条具体约定：

- **`figure` 单名重载**：传 `children` = hyperscript；不传 = fluent builder。
- **`node` 的 `id` 可选 → 重载** `node(config)` / `node(id, config)`（`typeof 首参` 区分）。`draw` 的 `way`、`coordinate` 的 `id` 是真必要，保持必填、不重载。

## DSL 表面

```ts
import { figure, node, draw, coordinate, scope } from '@retikz/vanilla';

// figure(config?, children?)：传 children = hyperscript；不传 = fluent
const fig = figure({ width: 400, height: 300, shapes: { hexagon } }, [
  node('a', { position: [0, 0], shape: 'circle', text: 'A' }),
  node({ position: [60, 0], text: '匿名' }),          // id 可选
  node('b', { position: [120, 0], text: 'B' }),
  draw(['a', 'b'], { arrow: '->' }),                  // way = id 数组
  draw([[0, 0], [50, 50]], { dash: 'dashed' }),       // 也接坐标
  coordinate('mid', { position: [60, 40] }),          // id 必要，position 在 config 必填
  scope({ transforms: [{ kind: 'translate', x: 40, y: 20 }] }, [  // transforms 与 IR/React <Scope> 一致
    node('c', { position: [0, 80], text: 'C' }),
  ]),
]);

fig.mount(container);     // → VanillaView（root 稳定、可 update/dispose）
fig.toSvgString();        // SSR
fig.ir;                   // 原始 IR

// fluent 糖（同一 Figure，可混用、链式追加）
const f = figure({ width: 400, height: 300 });
f.node('a', { position: [0, 0], text: 'A' });
f.draw(['a', 'b'], { arrow: '->' });
f.scope({ transforms: [{ kind: 'translate', x: 40, y: 0 }] }, s => s.node('c', { position: [0, 0], text: 'C' }));
f.mount(container);
```

签名集：

```ts
function figure(): Figure;                                            // 空图
function figure(children: Child[]): Figure;                           // 省略 config 直接传子节点
function figure(config?: FigureConfig): Figure;                       // fluent
function figure(config: FigureConfig, children: Child[]): Figure;     // hyperscript
function node(config?: NodeConfig): Child;                            // 匿名
function node(id: string, config?: NodeConfig): Child;               // 具名
function draw(way: Way, config?: DrawConfig): Child;
function coordinate(id: string, config: CoordinateConfig): Child;
function scope(config: ScopeConfig, children: Child[]): Child;
function scope(config: ScopeConfig, build: (s: ScopeBuilder) => void): Child;

type Figure = {
  readonly ir: IR;
  mount: (container: Element) => VanillaView;
  toSvgString: (options?: { idPrefix?: string }) => string;
  toCanvas: (canvas: HTMLCanvasElement, options?: RenderOptions) => void;
  // fluent 糖：始终可用，往 figure 追加 child，链式返回 this
  node: (...args: Parameters<typeof node>) => Figure;
  draw: (...args: Parameters<typeof draw>) => Figure;
  coordinate: (...args: Parameters<typeof coordinate>) => Figure;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => Figure;
};
```

**统一形态 `(必要参数, config?)`**；`Figure` 是唯一返回类型，hyperscript / fluent 都返回它、可混用、`.ir` 一致；独立函数 `mountSvg(el, fig)` / `renderToSvgString(fig)` 也吃 `Figure`（入参扩成 `Figure | IR | Scene`）。

## 待决策点（实现期定，不阻塞决策）

- **`config` 字段派生方式**：`NodeConfig` = `Omit<IRNode, 'type' | 'id'>` 之类派生 + 少量便捷字段（`text` / `label`）。代表字段：node（position/shape/fill/stroke/strokeWidth/fillOpacity/roundedCorners/padding/minimumWidth.../font/rotate/text/label/textColor…）；draw（arrow/stroke/dash/fill/fillRule/opacity…）；coordinate（position 必填）；figure（width/height/viewBox/idPrefix/measureText/shapes/arrows/patterns/pathGenerators/nodeDistance）。core IR 加字段 → 自动流入。
- **`ScopeConfig` = `{ transforms?: IRTransform[] }`（+ every* 样式默认）**：与 core `IRScope` / React `<Scope>` **逐字一致**——两者顶层都只有 `transforms`，**没有** xshift/yshift/rotate/scale 顶层糖。`IRTransform` 是 6 变体 discriminated union（`kind`: translate / polar-translate / at-translate / offset-translate / rotate / scale），合并顺序 = 数组顺序（首元素最内层，与 IR/Scene 一致）。**不自造 shift 糖**，避免与显式 transforms 的合并语义分叉。
- **`text` / 多行**：`config.text: string | string[] | TextLine[]`（逐行样式对齐 IR `TextLine`）。
- **`label`**：`config.label: string | { text, position?, distance?, … }`。
- **`Way` = core `DrawWay` 全集，不手动收窄**：除 id 串 / 坐标 `[x,y]` 外，还含 `DrawWay.Cycle`（闭合）、`-|`/`|-`（Hv/Vh 折角）、`Relative`/`Accumulate`（相对 / 累积偏移 item）、`curve`/`cubic`（贝塞尔 infix 算子）、`bend`（弧形简记）、`arc`/`circle`/`ellipse`、step `label` 等。`Way` 直接复用 core 的 way item 联合类型，`draw()` 内部走 core `parseWay` —— 与 React `<Draw way>` 同一解析、同一全集 → 零漂移、不缩水成弱 path DSL。
- **id 引用**：全字符串（way / 相对定位 `{ of: 'a' }` / anchor `'a.north'`），不引入 ref 对象。
- **`coordinate` 的 position**：放 config（类型必填）保签名统一；是否提成第二 positional 实现期可调。
- **options 优先级（call-site wins）**：`Figure` 存的 `config`（`idPrefix` / `measureText` 等）与调用时 `mount(container)` / `toSvgString(options)` / 独立 `mountSvg(el, fig, options)` 的 options 冲突时，**调用时 options 覆盖 Figure config**（显式调用点优先），保 `idPrefix` / `measureText` 可预期。

## 文本测量（承 ADR-03）

`figure.toSvgString()` / `mount()` 内部 `compileToScene(ir, { measureText, shapes, … })`。沿用 ADR-03：figure 收 IR、缺省回退 core `fallbackMeasurer`（近似、零 DOM、确定性）；精确靠 `FigureConfig.measureText` 注入；**vanilla 不内置 DOM measurer**（守 SSR 导入安全）。

## 尺寸输出（width / height）

`@retikz/svg` 的 `buildSvgDocument` **只产 `viewBox`**（内容坐标系）；`width` / `height`（显示尺寸）按设计是 **framework adapter 职责**（React 由 `<Layout>` cloneElement 写到 `<svg>`；svg 包注释明示「width / height / 框架级 style 由 adapter 附加」）。故 **vanilla 必须自己把 `FigureConfig.width/height` 写回根 `<svg>`**，否则 SSR 侧静默丢尺寸：

- `mount()`：`mountSvg` 把 width/height 设到根 `<svg>` 的 attrs（与 viewBox 并存）。
- `toSvgString()`：把 width/height 注入序列化出的 `<svg>` 串。
- **缺省（未给 width/height）**：只留 viewBox，显示尺寸由 CSS / 容器决定（与当前 vanilla 行为一致，不回归）。

这是 vanilla 作为 framework adapter 的本分（对称 React `<Layout>` 写 width/height），**不改 `@retikz/svg`**；`mountSvg` / `renderToSvgString` 在 ADR-03 签名上加可选 `width` / `height`（或从 `Figure` 读）。

## 测试设计

- 每个构造函数 → IR 结构断言（含 config 字段映射、`node(config)` vs `node(id, config)` 重载区分）。
- `draw` 的 way → IR steps 与 core `parseWay` 直接解析一致，**覆盖全集**（id / 坐标 / `Cycle` / `-|`/`|-` / `Relative`/`Accumulate` / `curve`/`cubic` / `bend` / `arc`/`circle`/`ellipse` / step label）（证明复用、不缩水、不自写）。
- `scope({ transforms })` → IRScope.transforms 逐字一致（数组顺序 = 应用顺序）；无 xshift/yshift 顶层糖。
- hyperscript ≡ fluent：同图两路 `ir` 相等。
- **width/height 输出**：`figure({ width, height })` 的 `toSvgString()` / `mount()` 产的根 `<svg>` 带 `width`/`height` attrs（不丢）；未给时只留 viewBox。
- **options 优先级**：`figure({ idPrefix:'a' }).toSvgString({ idPrefix:'b' })` 用 `'b'`（call-site wins）。
- `figure.mount` / `toSvgString` 行为（复用现有 mountSvg/renderToSvgString 口径）；`Figure` 被独立函数接受。
- 自定义 `shapes` 透传 → 节点用自定义形状渲染。
- 非法 config → `compileToScene` schema 校验报错、不静默。

## 影响

- **改 `@retikz/vanilla`**：新增 `src/builder/{figure,node,draw,coordinate,scope}.ts` + `src/Figure.ts`；`src/index.ts` 导出新 API；`mountSvg`/`renderToSvgString` 入参扩成 `Figure | IR | Scene`。
- **不动** `@retikz/react` / `@retikz/svg` / `@retikz/canvas` / `@retikz/core` 源码（仅引用 core 的 IR 类型 / `parseWay` / `compileToScene` / schema）。
- **依赖**：无新增（vanilla 已依赖 core/svg/canvas）。
- **公开 API**：`@retikz/vanilla` 新增 `figure`/`node`/`draw`/`coordinate`/`scope` + `Figure` 及各 `*Config` 类型。
- **无 breaking**：纯新增。

## 不在本 ADR 范围

- `@retikz/react` 重构 / 抽 `@retikz/builder` 共享包（YAGNI；真有第二框架无关消费者再提升到 core，API 形态不变）。
- 活更新 / 局部 patch（`view.update` 仍整图重渲染，承 ADR-03）。
- Vue / Svelte 适配器。
- 命令式 API 的 Canvas-only 特性（`toCanvas` 仅复用现有 canvas renderer）。

---

## 实现契约（必填）

### Level

`red`

判级规则：扩 `packages/vanilla/src/index.ts` 公开 API 表面（`packages/*/src/index.ts`）命中 red。不动 core IR。

### Schema 改动

无。不新增 / 不修改任何 `packages/core/src/ir/**` 字段或 zod schema。builder 只**构造**已存在的 IR，由 core schema 校验。

### 文件 scope

新建 / 修改（`@retikz/vanilla`）：

- `packages/vanilla/src/builder/figure.ts`（`figure` 重载 + `Figure` 装配）
- `packages/vanilla/src/builder/node.ts`（`node` 重载 → IRNode）
- `packages/vanilla/src/builder/draw.ts`（`draw` → IRPath；way 经 core `parseWay`/`DrawWay`）
- `packages/vanilla/src/builder/coordinate.ts`（`coordinate` → IRCoordinate）
- `packages/vanilla/src/builder/scope.ts`（`scope` 重载 → IRScope）
- `packages/vanilla/src/Figure.ts`（`Figure` 类型 + `.mount`/`.toSvgString`/`.toCanvas`/`.ir` + fluent 方法）
- `packages/vanilla/src/types.ts`（`NodeConfig`/`DrawConfig`/`CoordinateConfig`/`ScopeConfig`/`FigureConfig`/`Way` 等，派生自 core IR 类型）
- `packages/vanilla/src/index.ts`（导出新 API）
- `packages/vanilla/src/mountSvg.ts` / `renderToSvgString.ts`（入参扩成 `Figure | IR | Scene`；加可选 `width`/`height` 写回根 `<svg>`；call-site options 覆盖 `Figure` 存的 config）
- `packages/vanilla/tests/builder-*.test.ts`

不在白名单：`packages/{core,svg,canvas,react}/**` 源码。偏离需加条目自注解或开新 ADR。

### 测试象限

至少 13 个 case，四象限分布：

**Happy path（≥ 3）**：
- `node-to-ir`：`node('a', { position, shape, text })` → 正确 IRNode（含字段映射）。
- `draw-way-reuses-core`：`draw(['a','b'])` 的 IR steps 与 core `parseWay(['a','b'])` 一致。
- `figure-hyperscript-mount`：`figure(opts, [...]).mount(container)` 挂出 SVG DOM。

**边界（≥ 3）**：
- `node-overload`：`node({…})`（匿名）与 `node('a', {…})`（具名）都产合法 IR、id 有/无正确。
- `hyperscript-eq-fluent`：同图 hyperscript 与 fluent 两路 `ir` 相等。
- `scope-transforms-order`：`scope({ transforms: [t1, t2] }, …)` → IRScope.transforms 逐字 `[t1, t2]`（顺序 = 应用顺序），无 xshift/yshift 顶层字段。
- `width-height-emitted`：`figure({ width, height }).toSvgString()` / `mount()` 的根 `<svg>` 带 `width`/`height`；未给时只有 viewBox。

**错误路径（≥ 2）**：
- `invalid-config-throws`：坏 config 字段 → `compileToScene` schema 校验报错，不静默。
- `coordinate-needs-position`：`coordinate('m', {})` 缺 position → 类型层禁止（编译期）/ 运行时校验报错。

**交互（≥ 3）**：
- `custom-shape-passthrough`：`figure({ shapes: { hexagon } }, [node('a', { shape: 'hexagon' })])` → 自定义形状渲染。
- `figure-feeds-standalone`：`mountSvg(el, figure(...))` / `renderToSvgString(figure(...))` 接受 `Figure`。
- `way-full-set`：`draw` 用 `Cycle` / `-|` / `Relative` / `curve` 等 → IR steps 与 core `parseWay` 同输入一致（不缩水）。
- `options-call-wins`：`figure({ idPrefix:'a' }).toSvgString({ idPrefix:'b' })` 输出用 `'b'`；`measureText` 同理。

### 依赖的现有元素

- `IR` / `IRNode` / `IRPath` / `IRCoordinate` / `IRScope` / `TextLine` / `CompileOptions` / `ShapeDefinition` 等（`@retikz/core`）—— `config` 类型派生 + 构造目标。
- `compileToScene` / `parseWay` / `DrawWay`（`@retikz/core`）—— figure→scene 编译、way→steps 解析（复用、不自写）。
- `mountSvg` / `renderToSvgString`（`@retikz/vanilla`，ADR-03）—— `Figure` 方法内部复用，入参扩成接受 `Figure`。
- `drawScene` / `renderToCanvas` / `RenderOptions`（`@retikz/canvas`）—— `Figure.toCanvas` 复用。
