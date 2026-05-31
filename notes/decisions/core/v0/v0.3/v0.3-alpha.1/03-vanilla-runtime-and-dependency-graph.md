# ADR-03：`@retikz/vanilla` framework-free runtime + 包依赖图收口

- 状态：Accepted（实现完成 2026-05-31，见文末「实现偏离记录」；**已超出 alpha.1 骨架**：`@retikz/vanilla` 的 SVG 路径 `renderToSvgString` + `mountSvg` + `svgNodeToDom` 一并落地、12 测试全绿，提前完成 alpha.3 的 SVG 行为；Canvas 侧入口仍后置）
- 决策日期：2026-05-31
- 关联：[v0.3 roadmap §Vanilla runtime 范围 / §包拆分目标 / §待决策 3·4·13](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)（vanilla 复用其 `renderToSvgString` / `buildSvgDocument`）· [ADR-02 `@retikz/canvas` + react canvas mode](./02-canvas-renderer-and-react-canvas-mode.md)（依赖方向 #13 由本 ADR 收口）· [core-design.md §5 / §6](../../../../../architecture/core-design.md)

> **范围**：本 ADR 做两件事——① 定 `@retikz/vanilla`（无框架 runtime / SSR 入口）的**包形态与 API 边界**（收口 roadmap 待决策 **#3 / #4**）；② 把 `@retikz/svg` / `@retikz/canvas` / `@retikz/vanilla` / `@retikz/react` 的**包依赖图**一次画清（收口待决策 **#13**，兑现 ADR-02 文末「依赖方向留 ADR-03」）。
>
> ⚠️ **alpha 位置**：依赖图与包形态属 roadmap **alpha.1**（「renderer 边界 ADR + 包骨架：新增 `packages/svg` / `packages/canvas` / `@retikz/vanilla` 包骨架，明确 package exports、依赖关系、测试策略」）——svg / canvas 骨架已在 ADR-01 / 02 落地，**vanilla 骨架是 alpha.1 的最后一块缺口**，本 ADR 补上。`mountSvg` / SSR 的**完整实现闭环**属 **alpha.3**；本 ADR **决策一次定清 + 落骨架（含可解析 exports 与架构守卫测试）**，行为实现排到 alpha.3。文件延续本轮 ADR 编号置于 `v0.3-alpha.1/`。

## 背景

ADR-01 把「Scene → SVG」抽成零 React 的 `@retikz/svg`（`buildSvgDocument` → `SvgNode` descriptor / `renderToSvgString` → 字符串），ADR-02 把「Scene → Canvas 2D」抽成 `@retikz/canvas`（`drawScene` / `renderToCanvas`），并让 `@retikz/react` 经 `<Layout renderer>` 同时驱动两条 renderer。现在缺的是 roadmap §定位里与 react **并列**的第三个 runtime 入口：**无框架 / SSR**。

roadmap §Vanilla runtime 范围把它钉成：「`@retikz/react` 之外的基础 runtime，供无框架应用与 SSR 直接使用；不提供 JSX DSL，只消费 IR 或 Scene；**复用 `@retikz/svg` 与 `@retikz/canvas` 的 renderer 核心，不自己维护另一套渲染逻辑**」。候选 API：

```ts
import { renderToSvgString, mountSvg } from '@retikz/vanilla';
const svg = renderToSvgString(ir);
mountSvg(document.querySelector('#diagram'), ir);
```

两个绕不开的决策（roadmap 待决策 #3 / #4）：

- **#3**：vanilla 是「直接 re-export svg/canvas 的核心 API」，还是「runtime 封装（自己组合）」？
- **#4**：vanilla 同时覆盖 SVG DOM 挂载与 SSR 字符串，还是拆成更细入口？

外加 ADR-02 显式甩过来的 **#13**：`@retikz/react` 直接依赖 `@retikz/canvas`，还是把 canvas 作 optional peer 控默认安装体积？这条与「vanilla 依赖谁」是同一张依赖图上的问题，合并在此收口。

> 关键事实（决定下面的取舍）：`@retikz/canvas` 的运行时依赖**只有 `@retikz/core`**（纯函数读 Scene、零重依赖）；`@retikz/svg` 只多一个纯类型 `csstype`。两个 renderer 包都极轻。

## 选项

> 三个决策维度：① vanilla 包形态（#3）；② SVG / SSR 入口拆分（#4）；③ 依赖图与 optional peer（#13）。

### 维度①：vanilla 包形态（#3）

**A. runtime 门面，组合 svg/canvas 内核（推荐）**：vanilla 是无框架用户的**唯一 runtime 入口**。`renderToSvgString` re-export / 薄包 `@retikz/svg` 的同名函数（后续给它加水合 `interactions` option 的承载点）；`mountSvg` 是 vanilla 独有的 DOM 组合：`buildSvgDocument(scene)` → 一个 `SvgNode → DOM` 物化器（`document.createElementNS`）→ 塞进容器。**Scene→SvgNode 逻辑仍单一留在 svg 包**；vanilla 的 `svgNodeToDom` 与 react 的 `svgToReact`（`SvgNode→ReactElement`）是**同层平行物**——descriptor 物化，不是第二套 renderer。

**B. 纯 re-export**：vanilla 只 `export * from '@retikz/svg'` + canvas。代价：无框架用户拿不到 `mountSvg`（svg 包零 DOM、只产 descriptor / 字符串），得自己 `innerHTML` 或写 DOM 物化——把 runtime 责任推回用户，违背「vanilla 是无框架 runtime」定位。否决。

**C. vanilla 自带 Scene→SVG/Canvas 内核**：直接否决，违反 roadmap「不让 vanilla 变成第二套 renderer 内核」。

### 维度②：SVG / SSR 入口拆分（#4）

**A. 单包 `@retikz/vanilla`，多 named export（推荐）**：`renderToSvgString`（SSR / 构建期）、`mountSvg`（浏览器 DOM）同包导出；Canvas 侧 `mountCanvas` / canvas 导出**后置**（alpha.3+，先保 SVG 闭环，对齐 roadmap「SSR 首版优先 SVG」）。与 roadmap 候选 API 一致。

**B. 拆细包**（`@retikz/vanilla-svg` / `-ssr` / `-canvas`）：包数量膨胀、跨包共享类型麻烦、用户认知成本高。无框架场景本就轻量，单包多入口足够 tree-shake。否决。

### 维度③：依赖图与 optional peer（#13）

**A. 全直接依赖，无 optional peer（推荐）**：`react` 直接依赖 `svg` + `canvas`（= 现状）；`vanilla` 直接依赖 `core` + `svg` + `canvas`。`renderer="canvas"` / `mountCanvas` 零配置即用。

**B. canvas 作 react 的 optional peer**：SVG-only 用户默认不装 canvas，体积更省。代价：peer 解析 + 运行时「canvas 缺失」的降级分支 + 文档负担；而 canvas 仅 core 依赖、极轻，省下的体积有限。否决其作首版形态。

## 决策：①A + ②A + ③A

理由：

1. **①A 守住「复用、不复制」红线又真服务无框架用户**：vanilla 是 runtime 门面，`mountSvg` 只做 descriptor→DOM 物化（与 react `svgToReact` 同层），Scene→SVG 仍唯一在 svg 包。无框架用户一个 import 拿齐 SSR + 挂载，不用碰内部 svg/canvas 包。
2. **②A 对齐 roadmap 候选 API、包面最小**：单包多入口，Canvas 后置不抢 SVG 首版闭环。
3. **③A 让 dual-renderer 零配置**：dual renderer 是 v0.3 核心价值，canvas 又极轻（仅 core），直接依赖换来「切 canvas 不需任何安装/配置」远比省那点体积值。**逃生口已天然存在**：renderer 已拆包 → 打包器对未用到的 canvas 代码可 tree-shake；真撞体积红线，v0.4 再把 canvas 降为 optional peer（API 不破，仅依赖声明变化）。

### 依赖图（本 ADR 收口的核心产物）

```text
@retikz/core            （zod）                      —— 零 React / DOM / renderer
   ├── @retikz/svg       （core, csstype[type]）      —— Scene → SvgNode / 字符串
   ├── @retikz/canvas    （core）                      —— Scene → Canvas 2D
   ├── @retikz/vanilla   （core, svg, canvas）         —— 无框架 / SSR runtime 门面（组合）
   └── @retikz/react     （core, svg, canvas; react peer）—— JSX DSL + renderer glue
```

不可越界的方向约束（架构守卫测试钉死）：

- `svg` / `canvas` **互不依赖**（并列 renderer，canvas 不走 SVG 中转——ADR-02 已立）。
- `vanilla` **不依赖 react**、**不依赖框架**；只组合 `svg` / `canvas`，不引入第三套 Scene→输出内核。
- `core` 仍零下游依赖（不认识任何 renderer）。

### 边界：vanilla 无状态门面 + 为水合留缝、不实现水合

1. **首版一次性渲染闭环，`update` 原地复用 root（不重建、不失效）**：`mountSvg` 物化出一个 `<svg>` 挂进容器、返回 `view`，`view.root` = 该 `<svg>`。`view.update(nextIr|scene)` 做**整图重渲染但复用同一个 root 元素**：清空 `root` 的子节点 → 据新 scene 重设 `root` 自身 attrs（`width` / `height` / `viewBox`）→ 重新物化子树进**同一** `<svg>`。**`root` 的元素 identity 跨 `update` 稳定、永不失效**——调用方持有的 `root` 引用始终有效，alpha.4 挂在 `root` 上的根级事件委托也不被 `update` 冲掉。`view.dispose()` 把 `root` 从容器移除、置 view 失效（再调 noop / throw，实现期定一）。**不承诺 patch stream / 局部 DOM 替换 / 子树 diff**（v0.4+，对齐 roadmap §AI 增量渲染预留「不阻断后续，但不先做」）。
2. **复用 svg 的水合结构口、不实现水合**：`data-retikz-id` 由 `@retikz/svg` 在 alpha.4 填值；vanilla 的 `renderToSvgString` 预留 `interactions` option 承载点，但 `hydrate` / handler 绑定是 **alpha.4**（ADR-04 或本轮后续 ADR），不在本 ADR。
3. **确定性 id**：SSR↔客户端 id 一致依赖 ADR-01 的 `idPrefix` 缝；vanilla `renderToSvgString` / `mountSvg` 透传 `idPrefix`，不引入随机 id。
4. **SSR 导入安全（契约，非建议）**：`@retikz/vanilla` 的**模块顶层不得触碰 `document` / `window` / 任何 DOM 全局**；DOM 只在 `mountSvg` / `view.*` 被**调用时**惰性使用。`import '@retikz/vanilla'` + `renderToSvgString(scene|ir)` 在纯 Node（无 `document`）下必须可用、不抛。这条是「vanilla 作 SSR 门面」的硬约束，由「Node import 安全」测试钉死（见测试象限）。

## 待决策点

> 选项已选，内部小决策列细，alpha.3 实现不用猜。

- **`mountSvg` 物化方式**：倾向 `SvgNode → document.createElementNS` 走 `svgNodeToDom`（与 react `svgToReact` 同构、保元素引用供 alpha.4 水合 `querySelector`、免字符串再 parse）；**不**用 `container.innerHTML = renderToSvgString(...)`（虽更短，但丢引用、且重复一次 parse）。
- **`view` 形状**：`{ update(nextIr|scene): void; dispose(): void; readonly root: SVGSVGElement }`。`update` 首版「原地复用 root 重渲染」（见边界 §1：清子节点 + 重设 root attrs + 重物化，root identity 稳定），diff 留 v0.4；`root` 始终指向同一个活节点，调用方不会拿到 stale node。
- **`renderToSvgString` 是 re-export 还是薄包**：倾向**薄包**（`@retikz/vanilla` 出自己的 `renderToSvgString`，内部调 `@retikz/svg`），给 alpha.4 的 `interactions` option 留扩展位；纯透传期它与 svg 版签名一致。
- **入参 `ir` vs `scene`**：vanilla 入口收 **`ir`**（无框架用户手上是 IR / JSON），内部 `compileToScene`；同时允许传**已编译 `scene`**（SSR 复用、测试）。compile 走 `@retikz/core`，measurer 见下条。
- **文本测量（contract 定死，不留待决）**：入口收可选 `measureText?: TextMeasurer`（`@retikz/core` 已有类型）。缺省解析**统一、不按环境分支**：① 收**已编译 `scene`** → 文本尺寸已在 compile 期算好，**不需** measurer；② 收 **`ir`** 且未传 `measureText` → 用 `@retikz/core` 的 `fallbackMeasurer`（平均字宽 `len×size×0.55` 近似，**确定性、零 DOM、Node/浏览器一致可运行**，但非精确）；③ 要精确换行 / 节点尺寸 → caller 显式传 `measureText`（浏览器可传 DOM / canvas 度量器，Node 可传字体度量库）。**故 `renderToSvgString(ir)` 在 Node 下 contract 完整**：默认近似或注入精确，二者皆确定，无未定义行为。**不在 vanilla 内置 DOM measurer**（避免依赖 react 的 `browserMeasurer` 或在 vanilla 复制一份 DOM 逻辑、破坏「SSR 导入安全」）；如需浏览器精确度量，未来可加 **opt-in 的 `domMeasurer` 导出**（additive、惰性触 DOM，非默认）。对应 roadmap 待决策 #11 的 SSR 侧在此收口。
- **Canvas 侧入口**（`mountCanvas` / canvas 导出 / `canvas.toBlob` 封装）：后置 alpha.3+，本 ADR 只在依赖图与 exports 留位，不定 API。
- **`@retikz/vanilla` 包名**：roadmap 注「当前首选，可再调」；本 ADR 暂用 `vanilla`。

## DSL 表面

```ts
import { renderToSvgString, mountSvg } from '@retikz/vanilla';

// —— SSR / 构建期：直接产 SVG 字符串（复用 @retikz/svg） ——
const svg = renderToSvgString(ir, { idPrefix: 'fig-1' });
//   ir 入参：未传 measureText → core fallbackMeasurer（近似、确定性、零 DOM）
//   要精确换行 / 尺寸：renderToSvgString(ir, { measureText }) 或先自己 compile 传 scene
const exact = renderToSvgString(ir, { idPrefix: 'fig-1', measureText });

// —— 浏览器无框架：把 IR 挂成真实 SVG DOM ——
const view = mountSvg(document.querySelector('#diagram')!, ir);
view.update(nextIr);   // 整图重渲染，原地复用 view.root（root 恒等、不失效）
view.dispose();        // 卸载、清容器

// Canvas 侧（mountCanvas / 导出）后置 alpha.3+，本 ADR 不定
```

```ts
// 与 react 对照：同一份 Scene，三个 runtime 各自物化，互不复制内核
// @retikz/svg     buildSvgDocument(scene) -> SvgNode（descriptor）
// @retikz/vanilla svgNodeToDom(node)      -> 真实 SVG DOM（本 ADR 新增物化器）
// @retikz/react   svgToReact(node)        -> ReactElement（ADR-01 已有）
```

## 测试设计

`packages/vanilla/tests/**` 覆盖（骨架阶段先落**架构守卫**，行为测试随 alpha.3 实现补全；详见「实现契约 § 测试象限」）：

- **架构守卫（alpha.1，骨架即测）**：`@retikz/vanilla` 运行时依赖仅 `@retikz/core` / `@retikz/svg` / `@retikz/canvas`、**无 `@retikz/react`**；不重新实现 Scene→SVG/Canvas 内核（import / package.json 断言）。
- **行为（alpha.3）**：`renderToSvgString(ir)` 与直接走 `@retikz/svg` 输出逐字一致；`mountSvg` 把 scene 挂成真实 `<svg>` DOM（jsdom 断言 tag / attrs / 层级）；空 scene 不抛；容器为 `null` / 非法 → 可诊断错误不静默；`idPrefix` 透传后 SSR 串与挂载 DOM 的 id 一致。

## 影响

- **新增 `@retikz/vanilla` 包**（`packages/*` glob 已覆盖，**无需改 `pnpm-workspace.yaml`**；`mountSvg` 用 `document` / `SVGElement` → 本包 `tsconfig.json` 须开 `lib: ["ESNext", "DOM"]`，同 svg / canvas / react）。`dependencies`: `@retikz/core` + `@retikz/svg` + `@retikz/canvas`（均 `workspace:*`）。
- **不动 `@retikz/svg` / `@retikz/canvas` / `@retikz/core`**：vanilla 纯消费它们的现有公开 API（`renderToSvgString` / `buildSvgDocument` / `SvgNode` / 未来 canvas 导出）。
- **`@retikz/react` 依赖声明不变**：本 ADR 把「react 直接依赖 svg + canvas」从「ADR-02 暂定」**正式确认**（#13 选 A），不新增 optional peer。
- **公开 API**：新增 `@retikz/vanilla` 的 `renderToSvgString` / `mountSvg` / `view` 类型；以及内部新增 `svgNodeToDom` 物化器（是否公开导出见待决策，倾向暂不公开，YAGNI）。
- **无 breaking**：纯新增包；现有 svg / canvas / react 用户无感。
- **alpha 排期**：依赖图 + 包形态 + 骨架（可解析 exports + 架构守卫测试）属 **alpha.1**，本 ADR 落；`mountSvg` / SSR measurer / 行为测试属 **alpha.3**；Canvas 侧入口属 alpha.3+。

## 不在本 ADR 范围

- **水合**（`hydrate` / handler 绑定 / `data-retikz-id` 填值 / `interactions` manifest 落地）→ alpha.4 单独 ADR；本 ADR 只保证 vanilla runtime 存在、并透传 `idPrefix` / 预留 `interactions` 承载点。
- **Canvas 服务端导出**（`@napi-rs/canvas` / Node Canvas / 图片导出）→ alpha.3+ / 单独入口。
- **`mountCanvas` / canvas runtime 入口的完整实现** → alpha.3+（本 ADR 只在依赖图 / exports 留位）。
- **局部 DOM patch / progressive / `update` 的 diff 实现** → v0.4+（首版 `update` 仅整图重挂）。
- **浏览器精确度量的 opt-in `domMeasurer` 导出** → 后续 additive（本 ADR 已定默认 = `scene` 免测量 / `ir` 回退 `fallbackMeasurer` / caller 可注入 `measureText`；vanilla **不内置** DOM measurer，守 SSR 导入安全）。
- **Plot 支撑能力**（alpha.5）。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行，偏离需开新 ADR 或本 ADR 加条重审。

### Level

`red`

判级规则：新建 `packages/vanilla/src/index.ts` 命中 red（`packages/*/src/index.ts` 新公开 API 表面）。不动 `packages/core`（非 core IR 改动）、不动 svg / canvas / react 源码（仅确认 react 依赖声明，不改）。

### Schema 改动

无。不新增 / 不修改任何 `packages/core/src/ir/**` 字段或 zod schema。`@retikz/vanilla` 只消费已编译 `Scene` / 调 `compileToScene`；`view` / options 是 runtime 类型、非 IR、不持久化。

### 文件 scope

新建（`@retikz/vanilla`，alpha.1 落骨架 + 可解析 exports + 架构守卫测试；`mountSvg` / `svgNodeToDom` / 行为测试 alpha.3 填实现，骨架阶段先占位/最小实现）：

- `packages/vanilla/package.json`（`dependencies`: `@retikz/core` + `@retikz/svg` + `@retikz/canvas`，均 `workspace:*`；devDeps 对齐 svg/canvas 的 catalog 集）
- `packages/vanilla/tsconfig.json`（`extends ../../tsconfig.json`，`lib: ["ESNext", "DOM"]`）
- `packages/vanilla/vite.config.ts`（dts / build / test，对齐现有包）
- `packages/vanilla/src/index.ts`（导出 `renderToSvgString` / `mountSvg` + `view` 类型）
- `packages/vanilla/src/types.ts`（`MountOptions` / `RenderToStringOptions` / `VanillaView`）
- `packages/vanilla/src/renderToSvgString.ts`（薄包 `@retikz/svg` 的 `renderToSvgString`，预留 `interactions` 承载点——alpha.4 用）
- `packages/vanilla/src/mountSvg.ts`（`compileToScene`?/收 scene → `buildSvgDocument` → `svgNodeToDom` → 容器；返回 `view`）—— **alpha.3 实现**，骨架阶段最小桩
- `packages/vanilla/src/svgNodeToDom.ts`（`SvgNode → SVG DOM` 物化，平行 react `svgToReact`）—— **alpha.3 实现**
- `packages/vanilla/tests/deps-guard.test.ts`（架构守卫，**alpha.1**）/ `render-string.test.ts` / `mount-svg.test.ts`（**alpha.3**）

确认（`@retikz/react`，**不改源码**，仅作为依赖图决策的现状锚点）：

- `packages/react/package.json` 已含 `@retikz/svg` + `@retikz/canvas` 直接依赖（#13 选 A = 维持现状，本 ADR 不改）。

不在白名单：`packages/core/**`、`packages/svg/**`、`packages/canvas/**` 源码、`pnpm-workspace.yaml`。偏离需在本段加条目并自注解，或开新 ADR。

### 测试象限

至少 11 个 case，四象限分布（标注 alpha.1 骨架即测 / alpha.3 行为）：

**Happy path（≥ 3）**：

- `render-string-matches-svg`（alpha.3）：`renderToSvgString(scene)` 与直接 `@retikz/svg` 的 `renderToSvgString(scene)` 逐字一致——证明 vanilla 是薄包、未另写序列化。
- `mount-svg-builds-dom`（alpha.3）：`mountSvg(container, scene)` → 容器内出现 `<svg>`，子节点 tag / 关键 attrs / 层级与 `buildSvgDocument` 描述一致（jsdom）。
- `view-update-reuses-root`（alpha.3）：`view.update(nextIr)` 后容器 SVG 反映新 scene，**且 `view.root` 仍是同一个 `<svg>` 元素**（`===` 恒等、未被替换），其 `width`/`height`/`viewBox` 已按新 scene 更新——证明 root 跨 update 不失效、调用方不拿 stale node。

**边界（≥ 3）**：

- `empty-scene-mounts`（alpha.3）：空 scene → `mountSvg` 产空 `<svg>`、不抛；`renderToSvgString` 产合法空 `<svg>`。
- `idprefix-ssr-mount-parity`（alpha.3）：同 `idPrefix` 下 `renderToSvgString` 串里的 id 与 `mountSvg` DOM 里的 id 逐字一致（水合前置）。
- `ir-default-fallback-measurer`（alpha.3）：`renderToSvgString(ir)` 不传 `measureText` → 经 `@retikz/core` `fallbackMeasurer` 确定性出串（同输入逐字一致）；传 `measureText` → 文本尺寸随注入度量器变。证明「ir 入参在 Node 下 contract 完整」。

**错误路径（≥ 2）**：

- `mount-null-container`（alpha.3）：容器为 `null` / 非 Element → `mountSvg` throw 可诊断错误，不静默。
- `dispose-clears`（alpha.3）：`view.dispose()` 后容器被清空、再调不抛。

**交互 / 架构（≥ 3）**：

- `no-react-dep`（**alpha.1**，架构守卫）：`@retikz/vanilla` 的 `package.json` `dependencies` 不含 `react` / `@retikz/react`；运行时仅 `@retikz/core` / `svg` / `canvas`。
- `no-renderer-core-duplication`（**alpha.1**，架构守卫）：vanilla 不导出 / 不实现 Scene→SVG 内核——`mountSvg` 经 `buildSvgDocument`（来自 `@retikz/svg`），`renderToSvgString` 透传 `@retikz/svg`（import 断言：vanilla 源码引用 svg 的公开 builder，而非自写 prim/attrs 逻辑）。
- `ssr-import-no-dom`（**alpha.1**，SSR 导入安全）：在无 `document` / `window` 的环境（删除全局或 `--conditions` node 纯运行时）下 `import '@retikz/vanilla'` + `renderToSvgString(scene)` **不抛**；模块顶层不访问任何 DOM 全局（DOM 仅 `mountSvg` / `view.*` 调用时惰性触碰）。守边界 §4。

### 依赖的现有元素

- `renderToSvgString` / `buildSvgDocument` / `SvgNode` / `SvgAttrs`（`@retikz/svg`）—— vanilla 复用（`renderToSvgString` 薄包、`buildSvgDocument`+`SvgNode` 喂 `svgNodeToDom`）。
- `drawScene` / `renderToCanvas` / `RenderOptions`（`@retikz/canvas`）—— 依赖图留位，Canvas 侧入口 alpha.3+ 才接。
- `Scene` / `compileToScene`（`@retikz/core`）—— vanilla 入口收 `ir` 时调 `compileToScene`；收 `scene` 时直接用。
- `svgToReact`（`packages/react/src/render/svgToReact.ts`）—— **不依赖**，仅作 `svgNodeToDom` 的同构参照（descriptor 物化模式对齐）。
- `document` / `SVGElement` / `createElementNS`（`lib.dom.d.ts` 内置）—— `mountSvg` / `svgNodeToDom` 引用，需 `packages/vanilla/tsconfig.json` 开 `lib: ["ESNext", "DOM"]`，无需 `@types`。
- `@retikz/react`—— **明确不依赖**（vanilla 是 react 的并列 runtime，非其子）。

---

## 实现偏离记录（2026-05-31）

> 落地与本 ADR 决策一致，差异均为「做得比骨架多」或实现期补细，记此备查。

- **提前完成 alpha.3 的 SVG 行为**：本 ADR 范围是 alpha.1（骨架 + 可解析 exports + 架构守卫测试），实际把 `@retikz/vanilla` 的**整条 SVG 路径**（`renderToSvgString` + `mountSvg` + `svgNodeToDom` + `toScene` + `applyAttrs`）连行为测试一并实现（参照 ADR-02 合并 alpha.6/7 的先例）。Canvas 侧入口（`mountCanvas` / 导出）仍按计划后置。
- **默认 `idPrefix = 'r'`**：核实发现 `@retikz/svg` 的 `buildSvgDocument` / `renderToSvgString` 的 `idPrefix` 为**必填** `string`，故 vanilla 缺省注入常量 `'r'`（确定性）；多实例同页须经 `options.idPrefix` 显式区分以免 id 撞（已在 `types.ts` 注释）。
- **`svgNodeToDom` 不公开导出**：按 ADR 待决倾向（YAGNI）只内部用，`index.ts` 不导出；另抽出 `applyAttrs`（`svgNodeToDom` 与 `mountSvg` 的 root 原地复用共用一个 attrs 物化器）。
- **measurer 契约落地**：`toScene` 收 `ir` 时 `compileToScene(ir, { measureText? })`，缺省由 core 回退 `fallbackMeasurer`——与「文本测量 contract 定死」决策一致，Node 下确定可运行。
- **测试落点**：12 case（架构守卫 3 / SSR 字符串 3 / DOM 挂载 6），node + jsdom 双环境（默认 node 天然验证 SSR 导入安全，挂载用例 `// @vitest-environment jsdom`）。文件 `deps-guard.test.ts` / `render-string.test.ts` / `mount-svg.test.ts`（与 ADR 列表对齐，render-string 即 ADR 的同名行为测试）。
- **包配置**：`package.json` / `tsconfig.json`（`lib ESNext+DOM`）/ `vite.config.ts` 对齐 svg/canvas 模板；`pnpm-workspace.yaml` 未改（`packages/*` glob 已覆盖，与 ADR 一致）。`jsdom` 不进 devDeps（沿用 react 做法，vitest 从 store 解析）。
- **校验**：vanilla `tsc` / `eslint` 干净、12 测试全绿；core 1575 / svg 14 / canvas 46 / react 294 不回归（core 1 失败为预存 `partial-circle-ellipse > sector`，与本次无关）。
