# core v0.4 设计note：可嵌入 Tier2 in `<Layout>` —— buildIR 经注册表静态识别 Tier2 composite 子组件、Layout 汇总贡献的 datasets + composites 并入 compile

- 状态：Draft / 候选（v0.4 讨论工作区，未拍板成正式 milestone ADR）
- 记录日期：2026-06-13
- 关联：[v0.4 路线讨论](./roadmap.md) · [plot v0.1-alpha.10 ADR-02 可被组合（首个消费方 / 硬依赖本文档）](../../../plot/v0/v0.1/alpha.10/02-plot-composable.md) · [core v0.3-alpha.2 ADR-01 Tier2 支持（composite 展开机制）](../v0.3/alpha.2/01-tier2-support.md) · [core-design.md §7 AI 一等公民](../../../../architecture/core-design.md) · [plot-design §7 多坐标组合](../../../../architecture/plot-design.md)
> ⚠️ Draft：本文件是 v0.4 候选方向的设计 note，由 AI 起草、记录机制方向 / 边界 / 取舍；API 名 / 注册形态 / 测试象限为 **AI 建议稿**，正式启动走 brainstorm → spec → plan + 多 LLM 评估、人工拍板后才升级为正式 milestone ADR（[v0.4 roadmap 约定](./roadmap.md)）。RED 级，进实现前必走外部 LLM 评审。

## 背景

core 已有完整的 **Tier2 composite 展开机制**：IR 里带 `namespace` 的高层节点经 `compileToScene` 的 `CompileOptions.composites` 在 compile 第一步展开成 Tier1（core v0.3-alpha.2）。`<Layout composites={...}>` 把这份注册表当 prop 外传（`Layout.tsx:189`、`:282`）。plot 正是借此落地：`<Plot>` 内部渲染 `<Layout ir={{children:[plotSpec]}} composites={lowerPlots(datasets)}>`（`plot/react/src/Plot.tsx:70`）。

但**「把多个 Tier2 子组件直接写进同一个 `<Layout>`」当前不成立**（代码核验，2026-06-13）。两个阻塞点：

1. **`buildIR` 只认固定 kernel 元素**。`readSceneChildren`（`core/react/src/kernel/builder.ts:440`）按 displayName 派发 `Node` / `Path` / `Coordinate` / `Scope`（`_displayNames.ts`），其余函数组件**一律当 Sugar 同步调用展开**（`builder.ts:467-474`）。把 `<Plot>` 写进 children → 被当 Sugar 调用 → 展开出内层 `<Layout>` → 内层 Layout 既不被识别为子节点（非 kernel），又会在 `buildIR` 的静态遍历里被当函数组件调用、触发它自身的 hooks（`useId` / `useMemo` 等），污染外层渲染组件的 hook 序列。
2. **`<Layout>` 没有「子组件贡献 composites + datasets」的通道**。`composites` 只能 prop 外传，外层 Layout 拿不到子 `<Plot>` 各自需要的 `lowerPlots(datasets)`，即便子节点能被收集，PlotSpec 也无从展开。

> 与 plot ADR-02 的关系：ADR-02 把「`<Plot>` 可嵌入 core `<Layout>`」（L2-a）的设计做完了，但明确把它依赖的 core-react 新机制（L2-b）**「另起 core 文档」**承接，ADR-02 对本文档是**硬依赖**。本文档即该 core 文档。

## 动机（为什么归 core、为什么 v0.4）

直接需求来自 [plot ADR-02](../../../plot/v0/v0.1/alpha.10/02-plot-composable.md)：把多张 plot 面板 + 连线 / 标注收进**同一张 svg**，写法是

```tsx
<Layout width={800} height={600}>
  <Plot id="a" x={40} y={40} width={300} height={220} data={salesA}>…</Plot>
  <Plot id="b" x={420} y={60} width={260} height={260} coordinate="polar2D" data={salesB}>…</Plot>
  <Path from={{ id: 'a', anchor: 'east' }} to={{ id: 'b', anchor: 'west' }} />
</Layout>
```

但这是 **core 纵向底座能力**，不是 plot 专属（[v0.4 切分原则](./roadmap.md)「core 0.4 只做纵向底座深化」）：core 提供「`<Layout>` 能收纳任意 Tier2 可嵌入子组件并汇总其 lowering 贡献」的**通用机制**，plot / flow / table / 未来任意 domain 复用；core 不认识「plot」这种具体 domain（plot-design §7「L2 通用组合层是 core `<Scope>` / `<Layout>` 的通用能力，不由 plot 负责」）。

现状的过渡路径（ADR-02 L2-g fallback）：用户手写 `buildPlotSpec` 造 PlotSpec 节点 + 裹 translate `<Scope>` + 配 `composites={lowerPlots(datasets)}` 交 `<Layout ir>`——零 core 改动今天可用，但用户要手动拼 IR、ergonomics 差。本文档即把这条路径**收进 `<Layout>` 的声明式表面**。

## 方向：Tier2 子组件经「可嵌入适配器注册表」静态贡献，`<Layout>` 汇总后并入 compile

核心：`buildIR` 静态遍历 children 时，除固定 kernel 外，再认一类「**可嵌入 Tier2 元素**」——它经注册表把元素 props **静态**翻成 `{ IR 节点, datasets, makeComposites }` 贡献，**不渲染该组件**（延续 `buildIR` 「只静态走元素树读 props、不渲染子组件」的设计取向，避免「子后于父渲染」时序坑与 hook 污染）。`<Layout>` 收齐所有贡献后，按 namespace 合并 datasets、汇总各 domain 的 composites，与用户显式 `composites` prop 并入 `compileToScene`。

三步机制：

1. **可嵌入适配器（domain 提供，core 定接口）**。core 定义一个接口（建议名 `EmbeddableTier2Adapter`）：
   ```ts
   type EmbeddableTier2Adapter<P = unknown> = {
     /** 匹配的组件 displayName（如 '@retikz/plot/Plot'） */
     displayName: string;
     /** domain 分组键（= composite namespace，如 'plot'）：core 据此把同 domain 的多个贡献归组——
      *  同 namespace 的 datasets 合并成一份、makeComposites 每组只调一次（评估 #2：接口必须显式带 namespace，
      *  否则 core 只能按函数引用 / displayName 猜分组，两个 plot 贡献会被错分或 makeComposites 被重复调） */
     namespace: string;
     /** 静态把元素 props 翻成贡献；纯函数、不得调用 hooks / 不渲染组件 */
     contribute: (props: P) => {
       /** 贡献给外层 scene 的 IR 子节点（composite 节点，可由 adapter 自裹 translate Scope 摆位） */
       node: IRChild;
       /** 本子组件需要的外部数据集（按 reference 键；不进 IR） */
       datasets: ExternalDatasets;
       /** 该 domain 的 composite 工厂：合并后的 datasets → CompositeDefinition[] */
       makeComposites: (mergedDatasets: ExternalDatasets) => Array<CompositeDefinition>;
     };
   };
   ```
   plot 的 adapter = `{ displayName: '@retikz/plot/Plot', namespace: 'plot', contribute: props => ({ node: 包 translate 的 buildPlotSpec(props), datasets: {[ref]: props.data}, makeComposites: lowerPlots }) }`。core 不 import plot。

   **可嵌入标记（评估 #6）**：仅有 adapter 不够——若 adapter 经组件静态属性提供，core 遍历时对「忘记挂 adapter 的 Tier2 组件」只会看到普通函数组件、仍按 Sugar 调用，「缺 adapter fail-loud」这条测试无从写。故组件须挂一个**独立的 `isTier2Embeddable` 标记**（建议组件静态属性 `Component.isTier2Embeddable === true`，与 `Component.embeddableAdapter` 分离）。遍历命中标记 → 必须解析出 adapter，否则 **fail-loud**（不退化为 Sugar 调用）；无标记的普通函数组件仍走 Sugar 路径。

2. **两条静态遍历链路都要改（评估 #1）**。core-react 有**两条**同源遍历 children、都会把非 kernel 函数组件**当 Sugar 同步调用**的链路：
   - `readSceneChildren`（`builder.ts:467`，构造 IR）
   - `visit`（`collect-hydration-handlers.ts:88`，收 `on<Event>` handler；`Layout.tsx:296` 在 children 模式下独立跑）

   **两条都必须加可嵌入识别**：命中 `isTier2Embeddable` 标记 → **不调用组件**（这是规避 hook 污染、即本次实测「切语言崩溃」根因的根本约束）。
   - buildIR 侧：调 `adapter.contribute(props)`、`node` 进 IR 子节点、`{namespace, datasets, makeComposites}` 收进 side-channel 贡献累加器。
   - handler 侧：只读**外层元素自身**的 `on<Event>`（嵌入组件的内部挂点不在此层、由其 composite lowering 另管），**不递归进、不调用组件**。
   - 漏改 handler 链路 → `<Plot>` 仍被 `collectHydrationHandlers` 调用、hooks 触发、复现崩溃（评估 #1 钉死）。

   **buildIR 公开 API 兼容（评估 #5）**：`buildIR` 经 `index.ts` 导出为 `convertReactNodeToIR`、签名 `(): IR`，**不可改返回值破 API**。新增内部 `buildIRWithContributions(): { ir, contributions }` 供 `Layout` 用；公开 `buildIR` / `convertReactNodeToIR` 保持 `(): IR`（内部共用实现、丢弃 contributions）。

3. **Layout 汇总 + 注入 compile**。`<Layout>` 走完 `buildIRWithContributions` 拿到「IR 树 + 贡献列表」：**按 `adapter.namespace` 分组**——同 namespace 的 datasets 合并成一份、每组调一次 `makeComposites(mergedDatasets)`；各组 composites concat（不同 namespace 天然不撞）后与用户显式 `composites` prop 合并，传 `compileToScene`。
   - **同 ref 合并契约（评估 #3）**：同一 `reference` 在多个贡献里出现时，**必须是同一对象引用**（共享同源请显式复用同一 `data` 对象）；引用不同即 fail-loud，错误信息带 `reference` 名 + 冲突组件来源。**不做内容比对**——`.slice()` 产生不同引用但内容相同会误判、同引用后续 mutation 也非 core 可管；「同一引用」是唯一可执行、可测的硬规则。

## authoring 形态（react + vanilla 对等）

**react**（本文档的主表面）：

```tsx
import { Layout, Node, Path } from '@retikz/react';
import { Plot, LineMark, BarMark, Axis } from '@retikz/plot-react';

<Layout width={800} height={600}>
  <Plot id="a" x={40} y={40} width={300} height={220} data={salesA}>
    <LineMark x="t" y="v" /><Axis dimension="x" /><Axis dimension="y" grid />
  </Plot>
  <Plot id="b" x={420} y={60} width={260} height={260} coordinate="polar2D" data={salesB}>
    <BarMark x="cat" y="val" color="cat" />
  </Plot>
  <Path from={{ id: 'a', anchor: 'east' }} to={{ id: 'b', anchor: 'west' }} />
</Layout>

// standalone 不变：<Layout> 外的 <Plot> 自建 svg（向后兼容）
<Plot data={salesA} width={360} height={220}><LineMark x="t" y="v" /><Axis dimension="x" /></Plot>
```

「嵌入 vs standalone」**不靠 React context 感知**，靠「谁在处理这个元素」：`<Plot>` 挂 displayName，被外层 `<Layout>` 的 buildIR 命中 adapter → 走 `contribute`（静态、不渲染 `<Plot>`）= 嵌入态；被 React 直接渲染（顶层 standalone）→ 跑 `<Plot>` 自身渲染逻辑、自建 svg = standalone。两条路径互不干扰，`<Plot>` 渲染函数只在 standalone 跑。

**vanilla 对等**（lockstep）：vanilla 无 JSX，组合直接用既有 builder 造同一棵 core scene IR（plot 节点 + translate `<Scope>` + 标注）+ `composites: lowerPlots(datasets)` 交 core vanilla scene 渲染——**共同真源 = core IR**。react 的「可嵌入适配器」是 React 专属糖，vanilla 直接组装 IR，二者产出同一棵 core IR、不漂移。可选薄 `composePlots` builder deferred。

## 关键待决点 🔻

> 评估后多数已收敛（见各条「评估 #N」）；下列保留项待人工最终签字。

- **适配器注册形态（评估 #4，唯一核心待签字项）**：MVP 拍板 = **组件静态属性**——plot-react 在 `<Plot>` 挂 `Plot.isTier2Embeddable = true` + `Plot.embeddableAdapter = {...}`，core 遍历命中函数组件时读这两个静态属性，使 `<Layout><Plot/></Layout>` **零配置直接可用**（与 authoring 示例一致）、无 import 副作用全局表。`<Layout embeddables={[adapter]}>` 显式 prop 作**可选逃生舱**（测试注入 / 显式控制 / 未挂静态属性的 domain），非 MVP 必需。示例已与 MVP 对齐、不再悬空；仍待人工签字。
- **贡献累加器（评估 #5 已收敛）**：公开 `buildIR(): IR` 不变，新增内部 `buildIRWithContributions(): { ir, contributions }`，累加器是其局部态、不引入隐藏全局态、可测。
- **数据 ref 合并（评估 #3 已收敛）**：core 只做「同 ref 必须同一对象引用、否则 fail-loud」的机械检测；ref 语义（默认 = 面板 id、共享走 dataRef）归 domain adapter，core 不懂 ref 语义。
- **分组 / 跨 domain composites（评估 #2 已收敛）**：adapter 带 `namespace`，core 按 namespace 分组——组内 datasets 合并、makeComposites 调一次，组间 concat。
- **未注册 Tier2 兜底（评估 #6 已收敛）**：靠 `isTier2Embeddable` 标记——有标记缺 adapter → fail-loud；无标记函数组件走 Sugar。
- **viewBox / 尺寸**：多面板下 `<Layout width/height>` 是整图画布，各面板尺寸走 PlotSpec.width/height（ADR-02 L1-a 已落地）；无新增 core 尺寸语义。

## 约束 / 取舍

- **core 不写死任何 domain**：core 只定 `EmbeddableTier2Adapter` 接口 + buildIR 派发 + Layout 汇总；plot / flow / table 各自提供 adapter。core 不 import plot（守分层：上层依赖 core，core 不反依赖）。
- **两条静态遍历链路都不渲染子组件（评估 #1）**：buildIR 与 collectHydrationHandlers 都禁止调用可嵌入组件，adapter.contribute 必须纯函数、禁 hooks——这是规避「切语言 / 重渲染时 hook 污染」（本次 demo 实测的崩溃根因）的根本约束。
- **向后兼容、additive**：不动 core IR schema（composite 机制 + `compositeToScene` composites 已存在）；buildIR 加分支、Layout 加汇总，均 additive；现有 `<Layout>` children / `composites` prop 行为逐字不变。standalone `<Plot>` 不变。
- **共同真源 = core IR**：不新造组合 schema（ADR-02 评审 #6）；react adapter 与 vanilla builder 产同一棵 core IR。
- **0.x 无兼容负担**：新机制是 additive 公开 API，无旧写法别名。

## 与 plot ADR-02 的关系

- 本文档 = ADR-02 **L2-b** 的 core 承接，ADR-02 对它**硬依赖**。
- ADR-02 的 L1（PlotSpec 自描述尺寸 + 面板 anchor）**已落地**、不依赖本文档；L2-g fallback（手写 `<Layout ir composites>`）**今天可用**、是本机制就位前的过渡。
- 本机制落地后，plot 侧据此实现 `<Plot>` 嵌入态（L2-a：挂 displayName + 提供 adapter），`<Layout><Plot/></Layout>` 才声明式可用。

## 影响

- **`@retikz/core`（core-react，RED）**：
  - `kernel/builder.ts`：`readSceneChildren` 加可嵌入 Tier2 派发；新增内部 `buildIRWithContributions`（公开 `buildIR` / `convertReactNodeToIR` 签名 `(): IR` 不变，评估 #5）。
  - `kernel/collect-hydration-handlers.ts`：`visit` 加可嵌入识别——命中 `isTier2Embeddable` 标记只收外层元素 handler、不调用组件（评估 #1，第二条遍历链路）。
  - `kernel/Layout.tsx`：改用 `buildIRWithContributions`，按 `namespace` 汇总贡献的 datasets + composites 并入 `compileToScene`（与显式 `composites` prop 合并）。
  - 新增 `EmbeddableTier2Adapter` 接口 + `isTier2Embeddable` 标记约定 + 适配器解析（MVP 读组件静态属性，见待决点）；`index.ts` 导出接口。
- **core IR schema**：**无改动**（composite 节点 + `CompileOptions.composites` 机制已存在）。
- **`@retikz/plot-react`（下游，归 plot ADR-02 L2-a，非本文档 scope）**：`<Plot>` 挂 displayName + 提供 adapter；`PlotDslProps` 增 `id`/`dataRef`/`x`/`y`/`width`/`height`。
- **跨 domain**：flow / table 等任意 Tier2 提供各自 adapter 即可嵌入 `<Layout>`。
- **文档站**：core 侧补「Layout 收纳可嵌入 Tier2」机制说明；plot 侧组合页（ADR-02 scope）。
- **公开 API**：新增 `EmbeddableTier2Adapter` 接口 + 注册入口——additive。

## 不在本文档范围

- **plot 侧 `<Plot>` 嵌入态实现**（displayName + adapter + 嵌入 props）——归 plot ADR-02 L2-a。
- **anchor 相对摆位**（TikZ `right of`）——ADR-02 MVP 只绝对 x/y。
- **布局托管**（grid / region 自动分配）——ADR-02 走自由摆位。
- **非矩形面板包络 anchor**——[core v0.4 scope 多态 bounding shape](./scope-polymorphic-bbox.md)，独立。
- **series / datum 级 anchor**——依赖 datum locator，ADR-02 roadmap。

## 实现契约草案 🔻（AI 建议稿，待人工 + 多 LLM 评审定稿）

> 本段是正式 milestone ADR 的种子，**非定稿**。正式启动时按 [`develop-design`](../../../../../.agents/skills/develop-design/SKILL.md) 填齐 Schema 改动表 / 文件 scope / 测试象限（≥9 或按 milestone 放宽），并经多 LLM 评估。

- **Level**：`red`（动 core-react `kernel/{builder,Layout}` + `index.ts` 导出 + 新公开接口；跨 core/plot）。
- **Schema 改动**：core IR schema 无（react 层机制，非 IR）。新增 TS 接口 `EmbeddableTier2Adapter`（react 层类型，非 zod）。
- **文件 scope（草案）**：`core/react/src/kernel/builder.ts`（改）· `core/react/src/kernel/collect-hydration-handlers.ts`（改，评估 #1）· `core/react/src/kernel/Layout.tsx`（改）· `core/react/src/kernel/`（新增 adapter 接口 / `isTier2Embeddable` 标记 / 解析）· `core/react/src/index.ts`（导出）· `core/react/tests/**`（新增）· `apps/docs/**`（core 机制说明）。
- **测试方向（草案，正式 ADR 拆象限）**：
  - happy：单个可嵌入 Tier2 子组件被静态收集成 IR 节点 + 贡献；两个子组件 datasets 各自合并、composites 汇总；嵌入产出与 L2-g 手写 IR 等价。
  - 边界：零可嵌入子组件（纯 kernel children）行为逐字不变；显式 `composites` prop 与汇总贡献并存合并。
  - 错误路径：同 ref 不同对象引用 → fail-loud（评估 #3）；挂 `isTier2Embeddable` 标记但无 adapter → fail-loud（不静默当 Sugar，评估 #6）。
  - 交互：可嵌入子组件与 kernel `<Node>`/`<Path>`/`<Scope transforms>` 同层混排正确；嵌入态在 **buildIR 与 collectHydrationHandlers 两条链路**都不触发子组件 hooks（重渲染 / 语言切换不崩——本次实测崩溃的回归守卫，评估 #1）。
- **依赖的现有元素**：`readSceneChildren` / `getDisplayName`（`core/react/src/kernel`，扩展）· `Layout` 的 `composites` 注入 + `compileToScene`（`Layout.tsx`，扩展）· `CompositeDefinition` / `ExternalDatasets`（core 类型，引用）· `buildPlotSpec` / `lowerPlots`（plot，下游 adapter 引用，非本 scope）。

## 评估记录（2026-06-13 外部评审）

6 条 findings 全部核实通过、全部采纳（无拒绝项）：

1. **#1 漏第二条遍历链路**：`collect-hydration-handlers.ts:88` 的 `visit` 与 buildIR 同源、同样对函数组件 `(child.type)(props)` 同步调用 → `Layout.tsx:296` 仍会调 `<Plot>` 触发 hooks、复现崩溃。已加文件 scope + 机制第 2 步「两条链路都改」+ 测试守卫。（核实：读 `collect-hydration-handlers.ts` 确认 `visit` 同步调用函数组件。）
2. **#2 缺 namespace 分组键**：adapter 接口加 `namespace`，core 按它分组、makeComposites 每组只调一次。
3. **#3 同 ref 冲突检测不可执行**：契约改为「同 ref 必须同一对象引用」（不做内容比对），可执行可测。
4. **#4 注册形态 vs 零配置示例冲突**：拍板 MVP = 组件静态属性（零配置），`<Layout embeddables>` 显式 prop 作逃生舱；示例与 MVP 对齐。仍待人工签字。
5. **#5 buildIR 返回值破公开 API**：保留 `buildIR` / `convertReactNodeToIR(): IR`，新增内部 `buildIRWithContributions`。
6. **#6 缺 Tier2 标记**：定义独立 `isTier2Embeddable` 标记，有标记缺 adapter → fail-loud。

评审整体认可方向（能力放 core-react、静态 adapter 贡献 IR + datasets + composites，优于 plot 自建 `<Figure>`）。三条核心补强：第二条遍历链路（handler）、adapter 分组 key、公开 buildIR API 兼容边界。

## 下一步

正式启动时走 brainstorm → spec → plan，**人工对「适配器注册形态」最终签字**（MVP 已倾向组件静态属性），落 v0.4 某 alpha milestone 的正式 ADR（红级），与 plot ADR-02 定稿同步推进。本机制就位前，plot 组合用 ADR-02 L2-g fallback。
