# ADR-04：`@retikz/vanilla` 命令式 builder API（hyperscript 核 + fluent 糖）

- 状态：Accepted（已实现）
- 决策日期：2026-05-31
- 关联：[ADR-03 `@retikz/vanilla` runtime + 依赖图](./03-vanilla-runtime-and-dependency-graph.md)（本 ADR 在其 vanilla 包上加 authoring API）· [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md) · [v0.3 roadmap §Vanilla runtime 范围](../roadmap.md)

> **打包变更（[ADR-05](./05-renderer-repackage.md)）**：`Figure.toCanvas` 经 **`@retikz/render/canvas`**；下文 `@retikz/canvas` ≡ `@retikz/render/canvas`。
>
> **范围**：在 ADR-03 的 `@retikz/vanilla` 上加一套**命令式 builder API**——让无框架用户像 React 一样用具名图元（`node` / `draw` / `coordinate` / `scope`）+ 自定义 shape 构图，产出同一份 IR 再走现有 renderer。**只动 `@retikz/vanilla`，不碰 `@retikz/react`。**

## 背景

ADR-03 后 `@retikz/vanilla` 只能吃 IR / Scene：无框架用户要么手写 IR JSON、要么用不了。对标：echarts/highcharts 是「一坨声明式 option 对象」，retikz **早已有那个对象——就是 IR**（`mountSvg(container, ir)` ≈ `chart.setOption`）；React JSX 是 IR 之上带类型的声明式 DSL。**缺的是 d3 那种「在代码里用具名图元程序化构图」的 API**。

关键事实（定取舍）：React 的 `<Node>` / `<Draw>` 是「标记 + props 容器」，`props→IR` 是平凡字段拷贝，**非平凡部分全是读 JSX children**（解析文本行 / step / label）；命令式 API 没有 JSX children，这些直接传数据。真正的单一数据源是 **IR + core zod schema**（`compileToScene` 校验），不是 builder 函数。

## 决策：①hyperscript 核 + fluent 糖；②vanilla 自带；③必要参数前置 + config

- **①B 核 + A 糖**：hyperscript `figure(opts, [node(…), draw(…)])` 与 React 组件结构 1:1（JSX 本就 desugar 成 `createElement(Node, props, children)`，去掉 React 即此），心智零迁移、是「中性化」天然产物；fluent 有状态链式 builder（`figure().node().draw().mount()`）作**可选薄糖**给过程式用户、也是未来活更新的载体，但非核心。
- **②B vanilla 自带、react 不动**：可共享的「逻辑」是平凡字段拷贝，不值得重构 react 已测试层 / 抽新包；drift 靠**两层锚在 core**——vanilla 的 `config` 类型派生自 core IR 类型（字段不自列）+ `compileToScene` 的 zod schema 校验。被否决：抽中性 `@retikz/builder` 共享包（YAGNI，真有第二框架无关消费者再提升到 core，API 形态不变）。
- **③C 必要参数前置 + config 对象**：`node(id, config)`——必要的做 positional、其余进一个 config，避免「重载简写」（`node('a', [0,0], 'A')` 靠 `Array.isArray` 区分）的歧义；`config` 派生自 IR 类型故不维护第二份字段清单。

具体约定（字面即决策）：

- **`figure` 单名重载**：传 `children` = hyperscript；不传 = fluent。
- **`node` 的 `id` 可选 → 重载** `node(config)` / `node(id, config)`（`typeof 首参` 区分）；`draw` 的 `way`、`coordinate` 的 `id` 是真必要、保持必填不重载。
- **`Figure` 是唯一返回类型**：hyperscript / fluent 都返回它、可混用、`.ir` 一致；独立函数 `mountSvg` / `renderToSvgString` 入参扩成 `Figure | IR | Scene`。
- **`ScopeConfig` = `{ transforms?: IRTransform[] }`**：与 core `IRScope` / React `<Scope>` **逐字一致**——顶层只有 `transforms`，**没有** xshift/yshift/rotate/scale 顶层糖（不自造 shift 糖，避免与显式 transforms 的合并语义分叉）；`IRTransform` 6 变体 discriminated union，合并顺序 = 数组顺序（首元素最内层）。
- **`Way` = core `DrawWay` 全集，不手动收窄**：`draw()` 内部走 core `parseWay`——与 React `<Draw way>` 同一解析、同一全集（id 串 / 坐标 / `Cycle` / `-|`·`|-` / `Relative`·`Accumulate` / `curve`·`cubic` / `bend` / `arc`·`circle`·`ellipse` / step label）→ 零漂移、不缩水成弱 path DSL。
- **options 优先级（call-site wins）**：`Figure` 存的 config（`idPrefix` / `measureText`）与调用时 `mount` / `toSvgString` / 独立 `mountSvg` 的 options 冲突时，**调用时 options 覆盖 Figure config**，保可预期。

### 文本测量 / 尺寸输出（承 ADR-03）

- **测量**：`figure.toSvgString()` / `mount()` 内部 `compileToScene(ir, { measureText, shapes, … })`；沿用 ADR-03——缺省回退 core `fallbackMeasurer`（近似、零 DOM、确定性），精确靠 `FigureConfig.measureText` 注入，vanilla 不内置 DOM measurer（守 SSR 导入安全）。
- **尺寸**：`buildSvgDocument` 只产 `viewBox`（内容坐标系）；`width` / `height`（显示尺寸）是 framework adapter 职责（React 由 `<Layout>` 写 `<svg>`）。故 **vanilla 必须自己把 `FigureConfig.width/height` 写回根 `<svg>`**（`mount` 设 attrs、`toSvgString` 注入序列化串），否则 SSR 侧静默丢尺寸；缺省（未给）只留 viewBox、显示尺寸由 CSS / 容器决定。这是 vanilla 作 adapter 的本分（对称 React `<Layout>`），**不改 `@retikz/svg`**。

## 不在本 ADR 范围

- `@retikz/react` 重构 / 抽 `@retikz/builder` 共享包（YAGNI）。
- 活更新 / 局部 patch（`view.update` 仍整图重渲染，承 ADR-03）；Vue / Svelte 适配器。
- 命令式 API 的 Canvas-only 特性（`toCanvas` 仅复用现有 canvas renderer）。

---

> **实现指针**：level `red`（扩 vanilla 公开 API 表面）、非 breaking（纯新增）。不动 core / render / react 源码（仅引用 core 的 IR 类型 / `parseWay` / `compileToScene` / schema），无新增依赖。用户侧签名集 + 示例见文档站。真源以代码为准——`figure` 重载 + `Figure` 装配（`vanilla/src/builder/figure.ts` + `vanilla/src/figure.ts`，`Figure` 含 `.ir` / `.mount` / `.toSvgString` / `.toCanvas` + fluent 方法）、`node` / `draw` / `coordinate` / `scope`（`vanilla/src/builder/*.ts`）、各 `*Config` / `Way` 类型派生自 core IR（`vanilla/src/builder/types.ts` + `vanilla/src/types.ts`）；`mountSvg` / `renderToSvgString` 入参扩成 `Figure | IR | Scene`（经内部 `isFigure` brand 判别，纯内部不导出）。`draw` way 走 core `parseWay`（不自写）。测试在 `vanilla/tests/`（builder-* 覆盖字段映射 / 重载区分 / way 全集 ≡ parseWay / hyperscript ≡ fluent / width·height 输出 / call-site options 优先 / 自定义 shape 透传 / 非法 config schema 报错）。完整施工契约（文件 scope / 测试象限 13 case / 依赖现有元素）+ 实现偏离记录见本文件 git 历史。
