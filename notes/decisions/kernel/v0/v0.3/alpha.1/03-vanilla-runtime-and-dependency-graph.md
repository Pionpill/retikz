# ADR-03：`@retikz/vanilla` framework-free runtime + 包依赖图收口

- 状态：Accepted（已实现；SVG 路径 `renderToSvgString` + `mountSvg` + `svgNodeToDom` 完整落地；Canvas 侧入口后置 alpha.4）
- 决策日期：2026-05-31
- 关联：[v0.3 roadmap §Vanilla runtime 范围 / §包拆分目标](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)（vanilla 复用其 `renderToSvgString` / `buildSvgDocument`）· [ADR-02 `@retikz/canvas` + react canvas mode](./02-canvas-renderer-and-react-canvas-mode.md)（依赖方向由本 ADR 收口）· [core-design.md §5 / §6](../../../../../architecture/core-design.md)

> **打包变更（[ADR-05](./05-renderer-repackage.md)）**：renderer 由 `@retikz/svg` + `@retikz/canvas` 两包合并为 **`@retikz/render`**（子路径 `./svg` / `./canvas`）。vanilla / react **依赖 `@retikz/render` 一条**（非 svg+canvas 两条）；下文 `@retikz/svg` ≡ `@retikz/render/svg`、`@retikz/canvas` ≡ `@retikz/render/canvas`。
>
> **范围**：① 定 `@retikz/vanilla`（无框架 runtime / SSR 入口）的**包形态与 API 边界**；② 把 svg / canvas / vanilla / react 的**包依赖图**一次画清。

## 背景

ADR-01 抽出零 React 的「Scene → SVG」（`buildSvgDocument` → `SvgNode` / `renderToSvgString` → 字符串），ADR-02 抽出「Scene → Canvas 2D」（`drawScene` / `renderToCanvas`），react 经 `<Layout renderer>` 驱动两条。缺的是与 react **并列**的第三个 runtime 入口：**无框架 / SSR**——供无框架应用与 SSR 直接消费 IR / Scene，不提供 JSX DSL，**复用现有 renderer 核心、不自维护另一套渲染逻辑**。

关键事实（决定取舍）：canvas 运行时依赖**只有 `@retikz/core`**（纯函数读 Scene、零重依赖）；svg 只多一个纯类型 `csstype`。两个 renderer 包都极轻。

## 决策：runtime 门面（组合）+ 单包多入口 + 全直接依赖

### 维度①：vanilla 包形态 —— runtime 门面，组合 renderer 内核

vanilla 是无框架用户的**唯一 runtime 入口**。`renderToSvgString` 薄包 svg 同名函数（给后续水合 `interactions` option 留承载点）；`mountSvg` 是 vanilla 独有的 DOM 组合：`buildSvgDocument(scene)` → `svgNodeToDom`（`document.createElementNS`）→ 塞进容器。**Scene→SvgNode 逻辑仍单一留在 svg 包**；vanilla 的 `svgNodeToDom` 与 react 的 `svgToReact` 是**同层平行物**（descriptor 物化），不是第二套 renderer。

被否决：**纯 re-export**（无框架用户拿不到 `mountSvg`、得自己写 DOM 物化，把 runtime 责任推回用户）；**vanilla 自带 Scene→SVG/Canvas 内核**（违反「不让 vanilla 变成第二套 renderer 内核」）。

### 维度②：入口拆分 —— 单包多 named export

`renderToSvgString`（SSR / 构建期）、`mountSvg`（浏览器 DOM）同包导出；Canvas 侧 `mountCanvas` / canvas 导出后置（先保 SVG 闭环，对齐「SSR 首版优先 SVG」）。被否决：拆细包（`-svg` / `-ssr` / `-canvas`）——包数膨胀、跨包共享类型麻烦、认知成本高；无框架场景本就轻量，单包多入口足够 tree-shake。

### 维度③：依赖图 —— 全直接依赖，无 optional peer

`react` 直接依赖 render；`vanilla` 直接依赖 `core` + render。`renderer="canvas"` / `mountCanvas` 零配置即用。被否决：**canvas 作 react 的 optional peer**——SVG-only 用户省体积，但 peer 解析 + 「canvas 缺失」降级分支 + 文档负担，而 canvas 仅 core 依赖、极轻，省的体积有限。**逃生口已天然存在**：renderer 已拆包 → 未用到的 canvas 代码可 tree-shake；真撞体积红线，v0.4 再把 canvas 降为 optional peer（API 不破，仅依赖声明变化）。

### 依赖图（本 ADR 收口的核心产物）

> 下图为合并后（ADR-05）的现状：svg / canvas 已并入 `@retikz/render` 子路径。

```text
@retikz/core            （zod）                       —— 零 React / DOM / renderer
   ├── @retikz/render    （core, csstype[type]）       —— ./svg (Scene→SvgNode/字符串) + ./canvas (Scene→Canvas 2D)；后续 ./webgl
   ├── @retikz/vanilla   （core, render）              —— 无框架 / SSR runtime 门面（组合）
   └── @retikz/react     （core, render; react peer）  —— JSX DSL + renderer glue
```

不可越界的方向约束（架构守卫测试钉死）：

- `render/svg` 与 `render/canvas` **互不依赖**（并列 renderer、canvas 不走 SVG 中转——合包后由 render 包内边界守卫钉死，见 ADR-05）。
- `vanilla` **不依赖 react**、不依赖框架；只组合 `@retikz/render`，不引入第三套 Scene→输出内核。
- `core` 仍零下游依赖（不认识任何 renderer）。

### 边界：vanilla 无状态门面 + 为水合留缝、不实现水合

1. **首版一次性渲染闭环，`update` 原地复用 root（不重建、不失效）**：`mountSvg` 物化 `<svg>` 挂进容器、返回 `view`，`view.root` = 该 `<svg>`。`view.update(nextIr|scene)` 做整图重渲染但**复用同一个 root 元素**（清子节点 → 重设 root attrs（width / height / viewBox）→ 重新物化子树进同一 `<svg>`）。**`root` 元素 identity 跨 `update` 稳定、永不失效**——调用方持有的引用始终有效，alpha.3 挂在 root 上的根级事件委托不被 `update` 冲掉。`view.dispose()` 移除 root、置 view 失效。**不承诺 patch stream / 局部 DOM 替换 / 子树 diff**（v0.4+，对齐 roadmap §AI 增量渲染预留「不阻断后续，但不先做」）。
2. **复用 svg 的水合结构口、不实现水合**：`data-retikz-id` 由 svg 包在 alpha.3 填值；`renderToSvgString` 预留 `interactions` 承载点，但 `hydrate` / handler 绑定是 alpha.3。
3. **确定性 id**：SSR↔客户端 id 一致依赖 ADR-01 的 `idPrefix` 缝；vanilla 入口透传 `idPrefix`、不引入随机 id。
4. **SSR 导入安全（契约，非建议）**：vanilla **模块顶层不得触碰 `document` / `window` / 任何 DOM 全局**；DOM 只在 `mountSvg` / `view.*` 被调用时惰性使用。`import '@retikz/vanilla'` + `renderToSvgString(scene|ir)` 在纯 Node（无 `document`）下必须可用、不抛——由「Node import 安全」测试钉死。

### 文本测量契约（承 roadmap 待决 #11 的 SSR 侧）

入口收可选 `measureText?: TextMeasurer`，缺省解析**统一、不按环境分支**：① 收已编译 `scene` → 文本尺寸已在 compile 期算好，**不需** measurer；② 收 `ir` 且未传 `measureText` → 用 core 的 `fallbackMeasurer`（平均字宽近似，**确定性、零 DOM、Node/浏览器一致**，但非精确）；③ 要精确换行 / 节点尺寸 → caller 显式传 `measureText`。故 `renderToSvgString(ir)` 在 Node 下 contract 完整、无未定义行为。**不在 vanilla 内置 DOM measurer**（避免依赖 react 的 `browserMeasurer` 或复制 DOM 逻辑、破坏 SSR 导入安全）；浏览器精确度量未来可加 opt-in 的 `domMeasurer` 导出（additive、惰性触 DOM、非默认）。

## 不在本 ADR 范围

- **水合**（`hydrate` / handler 绑定 / `data-retikz-id` 填值 / `interactions` manifest 落地）→ alpha.3 单独 ADR；本 ADR 只保证 vanilla runtime 存在、透传 `idPrefix` / 预留 `interactions` 承载点。
- **Canvas 服务端导出**（`@napi-rs/canvas` / Node Canvas / 图片导出）→ beta.1 / 单独入口。
- **`mountCanvas` / canvas runtime 入口的完整实现** → alpha.4（本 ADR 只在依赖图 / exports 留位）。
- **局部 DOM patch / progressive / `update` 的 diff 实现** → v0.4+（首版 `update` 仅整图重挂）。
- **浏览器精确度量的 opt-in `domMeasurer` 导出** → 后续 additive。
- **Tier 2 支撑能力**（alpha.2，plot 为首个消费者）。

---

> **实现指针**：level `red`（新建包公开 API 表面）、非 breaking（纯新增包；svg / canvas / react 用户无感；react 依赖声明不变——「react 直接依赖 render」正式确认）。vanilla **明确不依赖 react**、tsconfig 开 `lib: ESNext+DOM`。落地实现把整条 SVG 路径连行为测试一并交付（超出原「先骨架」计划）；缺省 `idPrefix = 'r'`（svg `buildSvgDocument` 的 `idPrefix` 必填，故注入确定性常量，多实例同页须经 `options.idPrefix` 显式区分）；`svgNodeToDom` 不公开导出（YAGNI），另抽 `applyAttrs`（root 原地复用与物化共用）。真源以代码为准——`renderToSvgString`（`vanilla/src/renderToSvgString.ts`，薄包）、`mountSvg` / `view`（`vanilla/src/mountSvg.ts`）、`svgNodeToDom` / `applyAttrs`（`vanilla/src/svgNodeToDom.ts`）、`toScene`（`vanilla/src/toScene.ts`，收 `ir` 时 `compileToScene(ir, { measureText? })` 缺省回退 `fallbackMeasurer`）；类型在 `vanilla/src/types.ts`。测试在 `vanilla/tests/`（deps-guard 架构守卫 / render-string / mount-svg，node + jsdom 双环境，node 天然验证 SSR 导入安全）。完整施工契约（文件 scope / 测试象限 11 case / 依赖现有元素）+ 实现偏离记录见本文件 git 历史。

> 🔖 封板压缩 commit `05ed13c2`；压缩前完整施工蓝图 = `git show 05ed13c2^:notes/decisions/core/v0/v0.3/alpha.1/03-vanilla-runtime-and-dependency-graph.md`。
