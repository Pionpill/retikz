# core v0.4 ADR：可嵌入 Tier2 in `<Layout>` —— buildIR 经适配器静态识别 Tier2 子组件、Layout 汇总贡献的 datasets + composites 并入 compile

- 状态：Accepted MVP（2026-06-15 人工签字：适配器注册形态 = 组件静态属性）
- 记录日期：2026-06-13（2026-06-15 升级）
- 关联：[v0.4 路线讨论](../roadmap.md) · [plot v0.1-alpha.10 ADR-02 可被组合（首个消费方 / 硬依赖本文档）](../../../../../../viz/_notes/decisions/v0/v0.1/alpha.10/02-plot-composable.md) · [core v0.3-alpha.2 ADR-01 Tier2 支持（composite 展开机制）](../../v0.3/alpha.2/01-tier2-support.md) · [core-design.md §7 AI 一等公民](../../../../../../../notes/architecture/core-design.md) · [plot-design §7 多坐标组合](../../../../../../viz/_notes/architecture/plot-design.md)

## 背景

塑造决策的硬约束：

- core 已有 **Tier2 composite 展开机制**：带 `namespace` 的高层节点经 `compileToScene` 的 `CompileOptions.composites` 在 compile 第一步展开成 Tier1（v0.3-alpha.2）；`<Layout composites={...}>` 把注册表当 prop 外传，plot 借此落地（`<Plot>` 内部渲染 `<Layout ir composites={lowerPlots(...)}>`）。
- 但「把多个 Tier2 子组件直接写进同一个 `<Layout>`」当时不成立，两个阻塞点：(1) `buildIR` 只认固定 kernel 元素，其余函数组件一律当 Sugar 同步调用展开 —— 把 `<Plot>` 写进 children 会触发它自身 hooks、污染外层渲染组件的 hook 序列（本次 demo 实测「切语言崩溃」根因）；(2) `<Layout>` 没有「子组件贡献 composites + datasets」的通道，外层 Layout 拿不到子组件各自的 lowering 贡献。
- 这是 **core 纵向底座能力**，不是 plot 专属（v0.4「core 只做纵向底座深化」）：core 提供「`<Layout>` 收纳任意 Tier2 可嵌入子组件并汇总其 lowering 贡献」的通用机制，plot / flow / table / 未来任意 domain 复用；core 不认识具体 domain。
- 与 plot ADR-02 的关系：ADR-02 把「`<Plot>` 可嵌入 `<Layout>`」（L2-a）做完，但把它依赖的 core-react 新机制（L2-b）另起 core 文档承接，对本文档**硬依赖**。本文档即该 core 文档。

## 决策

**Tier2 子组件经「可嵌入适配器注册表」静态贡献，`<Layout>` 汇总后并入 compile。**

`buildIR` 静态遍历 children 时，除固定 kernel 外再认一类「可嵌入 Tier2 元素」：经适配器把元素 props **静态**翻成 `{ IR 节点, datasets, makeComposites }` 贡献，**不渲染该组件**（延续 buildIR「只静态读 props、不渲染子组件」取向，规避 hook 污染与时序坑）。`<Layout>` 收齐贡献后按 namespace 合并 datasets、汇总各 domain composites，与用户显式 `composites` prop 并入 `compileToScene`。

定稿数据结构（最能表达决策的最小片段）：

```ts
type EmbeddableTier2Adapter<P = unknown> = {
  /** 匹配的组件 displayName（如 '@retikz/plot/Plot'） */
  displayName: string;
  /** domain 分组键（= composite namespace）：core 据此把同 domain 的多个贡献归组，
   *  同 namespace 的 datasets 合并成一份、makeComposites 每组只调一次 */
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

关键设计：

- **适配器注册形态 = 组件静态属性**（2026-06-15 人工签字）：domain 组件挂 `Component.isTier2Embeddable = true` + `Component.embeddableAdapter = {...}`，core 遍历命中函数组件时读这两个静态属性，使 `<Layout><Plot/></Layout>` 零配置接入、无 import 副作用全局表。`<Layout embeddables={[adapter]}>` 显式 prop 作可选逃生舱（测试注入 / 显式控制 / 未挂静态属性的 domain），按 `displayName` 匹配并覆盖静态属性。
- **可嵌入标记与 adapter 分离**：组件挂独立的 `isTier2Embeddable` 标记。遍历命中标记 → 必须解析出 adapter，否则 **fail-loud**（不退化为 Sugar 调用）；无标记的普通函数组件仍走 Sugar。仅靠 adapter 不够——否则「忘记挂 adapter 的 Tier2 组件」会被静默当 Sugar 调用，缺 adapter 这条 fail-loud 无从写。
- **两条静态遍历链路都改**：`readSceneChildren`（构造 IR）与 `visit`（收 `on<Event>` handler）同源、都把非 kernel 函数组件当 Sugar 同步调用。两条命中标记后都**不调用组件**——这是规避 hook 污染的根本约束。buildIR 侧调 `adapter.contribute(props)`、`node` 进 IR、`{namespace,datasets,makeComposites}` 进 side-channel 累加器；handler 侧只读外层元素自身的 `on<Event>`、不递归不调用组件。漏改 handler 链路则崩溃复现。
- **buildIR 公开 API 兼容**：`buildIR` 经 `index.ts` 导出为 `convertReactNodeToIR`、签名 `(): IR`，不改返回值破 API。新增内部 `buildIRWithContributions(): { ir, contributions }` 供 `Layout` 用，累加器是其局部态、不引入隐藏全局态；公开入口内部共用实现、丢弃 contributions。
- **同 ref 合并契约**：同一 `reference` 在多贡献中出现时，**必须是同一对象引用**，否则 fail-loud（错误信息带 `reference` 名 + 冲突来源）。不做内容比对（`.slice()` 不同引用同内容会误判、同引用后续 mutation 非 core 可管）——「同一引用」是唯一可执行、可测的硬规则。ref 语义归 domain adapter，core 不懂 ref 语义。
- **嵌入 vs standalone 不靠 React context**，靠「谁在处理元素」：被 `<Layout>` buildIR 命中 adapter → 走 `contribute`（静态、不渲染）= 嵌入态；被 React 直接渲染（顶层）→ 跑组件自身逻辑、自建 svg = standalone。渲染函数只在 standalone 跑。
- **vanilla 对等**（lockstep）：vanilla 无 JSX，直接用 builder 造同一棵 core IR（plot 节点 + translate `<Scope>` + 标注）+ `composites: lowerPlots(datasets)`。共同真源 = core IR，react 适配器是 React 专属糖，二者不漂移。

代价 / 取舍：

- **core 不写死任何 domain**：只定 `EmbeddableTier2Adapter` 接口 + buildIR 派发 + Layout 汇总；domain 各自提供 adapter，core 不 import plot（守分层）。
- **adapter.contribute 必须纯函数、禁 hooks**：两条遍历链路都禁止调用可嵌入组件。
- **additive、共同真源 = core IR**：不动 core IR schema（composite 机制已存在），不新造组合 schema；buildIR 加分支、Layout 加汇总均 additive，现有 `<Layout>` children / `composites` prop 与 standalone `<Plot>` 行为逐字不变。0.x 无旧写法别名负担。

## 被否决的选项

- **plot 自建 `<Figure>`**（plot 侧造平行组合容器）：评审认可把能力放 core-react、由静态 adapter 贡献 IR + datasets + composites 的方案，优于 plot 自建 `<Figure>`（违分层、平行机制）。
- **adapter 不带 namespace、core 按函数引用 / displayName 猜分组**：会把两个 plot 贡献错分或重复调 makeComposites。改为接口显式带 `namespace`。
- **同 ref 做内容比对**：不可执行（不同引用同内容误判、后续 mutation 不可控）。改为「同一对象引用」机械检测。
- **改 `buildIR` 返回值携带 contributions**：破公开 API。改为新增内部 `buildIRWithContributions`。

## 实现

实现见 `@retikz/react` kernel：`kernel/embeddable.ts`（adapter 接口 / `isTier2Embeddable` 标记 / 解析）· `kernel/builder.ts`（`readSceneChildren` 派发 + 内部 `buildIRWithContributions`）· `kernel/collect-hydration-handlers.ts`（`visit` 可嵌入识别）· `kernel/Layout.tsx`（按 namespace 汇总并入 `compileToScene`）· `index.ts`（导出公开接口，不导出 `buildIRWithContributions`）+ 对应测试。core IR schema 无改动。

## 不在本文档范围

- **plot 侧 `<Plot>` 嵌入态实现**（displayName + adapter + 嵌入 props，`PlotDslProps` 增 `id`/`dataRef`/`x`/`y`/`width`/`height`）——归 plot ADR-02 L2-a；本 ADR 不追踪 plot 包实现。
- **anchor 相对摆位**（TikZ `right of`）——ADR-02 MVP 只绝对 x/y。
- **布局托管**（grid / region 自动分配）——ADR-02 走自由摆位。
- **非矩形面板包络 anchor**——[core v0.4 scope 多态 bounding shape](./02-scope-polymorphic-bbox.md)，独立。
- **series / datum 级 anchor**——依赖 datum locator，ADR-02 roadmap。
- **可选薄 `composePlots` vanilla builder**——deferred。

> 🔖 本文件压缩前完整施工蓝图 = `git show 13765be7:_notes/decisions/core/v0/v0.4/alpha.2/01-embeddable-tier2-in-layout.md`（封板全文）。
