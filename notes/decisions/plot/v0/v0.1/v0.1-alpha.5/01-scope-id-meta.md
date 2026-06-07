# ADR-01：scope-aware id 绑定 + meta 透传——下沉元素绑 `<plotId>.` 命名 id + 写来源 meta，让 plot 不再是丢了来源的几何黑盒

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.5 roadmap](./roadmap.md) · [plot-design.md §7 anchor / §8.1 id 绑定与可连接性](../../../../../architecture/plot-design.md) · **core 依赖**：[core v0.3-alpha.4 ADR-08 meta provenance](../../../../core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md)（已回灌 next-plot）· **预留来源**：[plot v0.1-alpha.1 ADR-01 根节点](../v0.1-alpha.1/01-plot-spec-root.md)（`id` / `meta` 字段位埋点）

## 背景

`@retikz/plot` 把高层 grammar 经 `lowerComposites` 下沉成 core Kernel：root / mark 层下沉成 `Scope`、datum 下沉成 `Node`。**下沉那一刻，「这个 Node 是 series `sales` 第 5 行 datum」「这个 Scope 是 `bar` mark 层」这类来源信息就丢了**——lowering 产物只剩纯几何。v0.3 交互层命中一个渲染图元后，无从映射回原始 datum / series；跨域组合（v0.5）想连到「某条 series 的区域」也没有可寻址的句柄。

plot v0.1 从 [alpha.1](../v0.1-alpha.1/roadmap.md) 起就为此**埋了零成本字段**：root `id`（describe 明写「reserved as the scope reference id / anchor target … resolution deferred to alpha.5」）、mark `id`（「reserved scope/anchor target … deferred to alpha.5」）、root `meta`（「reserved so lowering can preserve provenance into core IR meta」）。alpha.1 只验证字段位、不附语义。**alpha.5 是兑现点**——把这些字段接通成可用能力。

接通分两条独立通道，正好对应 [plot-design §7](../../../../../architecture/plot-design.md) 的两类需求：

1. **id（可连接句柄）**——core 的「连接」本质是 id 驱动的（[§8.1](../../../../../architecture/plot-design.md)：`Scope.id` 设了即在父帧注册 bbox、`Node.id` 可被 path step 引用）。下沉元素绑 id ⇒ 可被连接（plot 内即时；外部连子元素须经 export anchor，v0.5）。代价：进命名空间、有基数成本（万级散点逐点绑 id 会撑爆 nodeIndex，§8.1 风险备注），故 datum 级 **opt-in**。
2. **meta（不可连接的来源标签）**——core v0.3-alpha.4 [ADR-08](../../../../core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md) 新增的 `Node` / `Scope` / `Path` `meta`，compile 原样 stamp 进 Scene 图元、renderer 忽略。下沉元素写 meta ⇒ 交互层命中图元即可读 `prim.meta` 反查来源。零命名空间代价（meta 不进 nodeIndex），是 v3 hit-test 的**主通道**。

两条通道互补：低基数结构（root / mark / series）两者都给；高基数 datum 默认只走 meta（且 opt-in），要逐点连接才开 id。

## 决策：id 走 `<plotId>.` plot-local 命名（§8.1）+ meta 走 core ADR-08 通道；`provenance` 总开关默认关（等价 alpha.4）、per-datum / datumIdField 独立 opt-in；抽出可复用 frame 构造

### localNamespace 下「可连接范围」的边界（先厘清，否则 id 语义会被高估）

root scope 是 `localNamespace`（alpha.1 就位）。core 语义（[scope.ts](../../../../../packages/core/core/src/ir/scope.ts) `localNamespace` describe）：**localNamespace 内部 id 不上浮到父帧，只有 scope 自己的 `id` 注册进父帧**。因此：

- **整图 `sales` 可被外部引用**（root `Scope.id` 在父帧注册 bbox 句柄）——v0.1「可被组合」的义务由此满足：外层 annotation / connector 连到整图。
- **内部 `<plotId>.mark.0` / `.series.north` / `.datum.Q1` **不**自动对外可见**——它们活在 plot 的 local namespace 里。其用途是**三项 plot-local 能力**：① plot 内部连接（同 namespace 内 path step 可引用）；② [ADR-02](./02-datum-locator.md) locator 寻址（locator 是 plot 侧纯函数、不走 core 命名空间查找，故不受 localNamespace 限制）；③ 与 meta 关联的稳定命名。
- **外部直接连到子元素**（如从图外 path 指到 `sales.series.north`）需要一套「export anchor / proxy」机制——把选定子锚点在父帧再注册一个代理 bbox。**该机制留 v0.5 跨域组合**（见「不在本 ADR 范围」），v0.1 不做；本 ADR 的内部 id **不承诺外部可达**。

> 修正起草初稿的过度表述：内部 `<plotId>.` id 是 plot-local 句柄，**不是**「任意子元素跨域可连接」。跨域子锚点是 v0.5 能力。

### 命名与绑定层级（§8.1）

| 下沉元素 | core 落点 | id（句柄）| meta（来源标签，仅 `provenance` 开时写）|
|---|---|---|---|
| **root** | 外层 `Scope`（`localNamespace`，已有）| `Scope.id = node.id`（外部句柄，**现状即绑**）| `{ source:'plot', dataReference }` |
| **mark 层** | 每 mark 一个图层 `Scope` | 用户给 `mark.id` → `<plotId>.<markId>`；缺省合成 `<plotId>.mark.<markIndex>` | `{ source:'plot', layer:'mark', mark:<type>, markIndex }` |
| **series（仅 line/area）** | 每条 series 一条 `Path`（现状结构）| `<plotId>.series.<seriesValueSlug>` | `{ …, series:<value> }`（写在 `Path.meta`）|
| **datum**（opt-in）| 可见 mark 的 `Node`（point / interval / sector）| `<plotId>.datum.<idFieldValue>`（配 `datumIdField` 时）| 见下「datum 来源标识」（per-datum，`provenance` 开时）|
| **guide 层** | 轴 / 网格 `Scope`（`guide.id` 已绑）| 用户 `guide.id`（仅 **axis** 层）→ `<plotId>.<guideId>`；缺省 / **grid** 层 → `<plotId>.<axis\|grid>.<dimension>`（grid 恒用结构 id，避免与 axis 的用户句柄撞） | `{ source:'plot', layer:'axis'\|'grid', dimension }` |

**series 只在 line/area 有结构落点（P1 评审修正）**：现 lowering 对 point/interval/sector **按 color 分子 Scope（样式分层），不按 `mark.series` 分**（[mark.ts colorGroupedScope](../../../../../packages/plot/plot/src/lower/mark.ts)）；只有 line/area 多系列才是「每 series 一条 Path」（[mark.ts](../../../../../packages/plot/plot/src/lower/mark.ts)）。故 v0.1：

- **line/area**：series 是真实结构维度 → series id/meta 绑到**每条 series `Path`**（消费 core ADR-08 `Path.meta`）。
- **point/interval/sector**：现无 series 子 Scope（grouping 是 color）→ **只给 layer 级 id/meta**；series 值由 **datum meta 承载**（per-datum meta 带 `series`），provenance 不丢。
- **把 color 分组重构成 series 分组**（color 仅作样式分层、series 作结构维度）是更彻底的模型，但属较大 lowering 重构 → **归 backlog**，不在 v0.1 收尾。

### datum 来源标识（index 语义，P1 评审修正）

lowering 先 `applyTransforms`（sort 重排行、stack 派生新行对象）再下沉（[expand.ts](../../../../../packages/plot/plot/src/lower/expand.ts) / [transform.ts](../../../../../packages/plot/plot/src/lower/transform.ts)），故「第几行」有歧义。per-datum meta **同时带三者**：

```ts
meta = {
  source: 'plot', dataReference: <data.reference>,
  mark: <type>, markIndex,
  transformedIndex,   // 在 transform 后行数组里的位置（= lowering 实际迭代序、= 渲染序）
  sourceIndex,        // 映射回原始 dataset 行序（best-effort，见下）
  series?: <value>,
}
```

- **`transformedIndex`** 始终有（lowering 迭代序，与渲染一一对应）。
- **`sourceIndex`** best-effort：sort 仅重排、保留行对象，可携带原序；stack 等**派生新行**的 transform 可能无法回指单一源行 → 该情形 `sourceIndex` 省略（不伪造）。交互命中要「反查原始 datum」时优先用 `sourceIndex`，缺失则退 `transformedIndex` + `dataReference` 自行对账。

### 基数与默认兼容性（P1 评审修正：默认逐字节等价）

- **`provenance` 总开关（默认关）**：`LowerPlotsOptions.provenance`（布尔，默认 `false`）。**关 → 完全不写任何 meta、不合成内部 id**，lowering 产物**逐字节等价 alpha.4**（无新 key）。开 → 写 layer/series meta + 合成 `<plotId>.mark.<i>` / `.series.<v>` 内部 id。
- **用户显式 id 不受开关约束**：root `node.id` 仍如现状绑 `Scope.id`（alpha.4 已有行为）；`mark.id` 设了即绑 layer scope.id（接通 alpha.1 预留——「设了却被忽略」是现状 bug）。即默认产物变化**仅发生在用户主动命名处**（opt-in by naming）。
- **per-datum meta**：`LowerPlotsOptions.datumProvenance`（默认关，蕴含需 `provenance` 开）——每个 datum Node 写 per-datum meta，是 O(rows) IR 增量，故独立开关。
- **datum 级 id**：`LowerPlotsOptions.datumIdField`（数据属性名，opt-in）——把该字段值绑成 `<plotId>.datum.<值>` 的 `Node.id`。**缺字段 / 字段值重复 → fail loud**（抛清晰错误，见决策末）。高基数只需定位 → 不绑 id，走 [ADR-02](./02-datum-locator.md) locator 按需算。

> **meta 即便开 provenance 也是 render/几何中立**——core ADR-08 保证 renderer 忽略 meta、不进 DOM、不参与 layout/bbox/prune。故「开 provenance」改的是 IR 的 meta key（与 viewBox / 图元几何无关），**渲染输出不变**；默认（关）则连 IR key 都不变。

### `<plotId>.` 前缀来源

- root `node.id` **在** → 作 plotId：内部 id 带 `<plotId>.` 前缀，路径稳定可寻址（plot-local）。**meta 不含 `plotId` key**——前缀已在 id 上、`dataReference` 标数据集，meta 无需再冗余 plotId。
- root `node.id` **缺** → 内部元素匿名（无合成 id）；meta（若开）照常写、不含 plotId（与有 id 时一致）；locator 按结构索引（markIndex / 行序）寻址，不依赖具名 id。

```ts
// lowering 产物示意（root.id='sales'，bar mark[0]，provenance + datumProvenance 开）
{ type:'scope', id:'sales', localNamespace:true, meta:{ source:'plot', dataReference:'sales' }, children:[
  { type:'scope', id:'sales.mark.0', meta:{ source:'plot', layer:'mark', mark:'interval', markIndex:0 },
    nodeDefault:{ /* bar 样式 */ }, children:[
      { type:'node', meta:{ source:'plot', dataReference:'sales', mark:'interval', markIndex:0, transformedIndex:0, sourceIndex:0 }, position:[…], minimumWidth:…, minimumHeight:… },
      { type:'node', meta:{ source:'plot', dataReference:'sales', mark:'interval', markIndex:0, transformedIndex:1, sourceIndex:1 }, position:[…], … },
    ] },
] }
```

### datumIdField 严格性（P2 评审拍板，移出待决策）

- **缺字段**：`datumIdField` 指定的属性在某行不存在（`undefined`）→ **抛清晰错误**（不静默跳过——anchor 不完整会让下游定位静默失败）。
- **重复值**：两行产出同一 `<plotId>.datum.<值>` → **抛清晰错误**（**不沿用 core nodeIndex 的 last-wins**——anchor 必须稳定唯一，重复即用户数据/配置错，fail loud）。

### 抽出可复用 frame 构造

`expand.ts` 现把投影帧（cartesian / polar）构造**内联**在 `expandPlot` 里。本 ADR 抽成可复用纯函数 `resolveFrame(spec, rows, options) → { frame, … }`，使 mark 下沉与 [ADR-02](./02-datum-locator.md) locator **共用同一投影**——locator 正向解析的位置必须与 lowering 实际摆放一致，共用 frame 是杜绝两套投影漂移的唯一可靠手段。本 ADR 只做抽取（产物等价），locator 在 ADR-02 消费。

理由：

1. **id / meta 双通道对号入座 §7 两类需求**——可连接句柄走 id（有基数代价、按层级 opt-in），不可连接来源标签走 meta（零命名空间代价、hit-test 主通道）；不混为一谈。
2. **守 §8.1 基数红线 + 默认零回归**——provenance 总开关默认关 ⇒ 默认产物逐字节等价 alpha.4；datum 级 id / meta 各自 opt-in，不给「默认万级注册 / 默认 O(rows) meta」留口子。
3. **frame 单一真源**——locator 与 lowering 共用投影，命中预演的「位置一致」断言才有意义；抽取是 ADR-02 的前置。
4. **纯消费 core 能力**——meta 走 ADR-08 既有通道、id 走既有 `Scope.id`/`Node.id`，plot 不反向改 core（守 AGENTS.md 子组边界）。

## 实现期偏离（2026-06-07，Contract Auditor 对账后记）

- **`sourceIndex` 经 symbol tag、`transform.ts` 未改**：原文件 scope 列 `transform.ts`「按需」改。实际用 `provenance.ts` 的 `SOURCE_INDEX` symbol 在 ingest 打标（object spread 跨 stack、sort 保 identity 自动存活），`transform.ts` 无需改动。
- **provenance 启用判定收口在 expand**：`provenance / datumProvenance / datumIdField` 任一开即启用（后两者蕴含 provenance），统一在 `expandPlot` 判定。
- **guide id 默认形 + axis-only 用户句柄**：见上表 guide 行（用户 `guide.id` 仅挂 axis 层、grid 恒结构 id）。
- **datum-id 注册器提升到 plot 级（cross-review 修复）**：原实现每 mark 各自建注册器，同图多个 datum-bearing mark（如 point + bar）+ 同 `datumIdField` 会各自生成 `<plotId>.datum.<值>` → 同命名空间撞 id。改为 **plot 级共享注册器**（`expandPlot` 建一次、贯穿所有 mark），跨 mark 重复 id 同样 **fail loud**（与单 mark 内重复一致）——一个 plot 内多 datum mark 想绑 id 须用不同字段/值消歧。

## 待决策点 🔻

- **mark 层 id 命名**：用户给 `mark.id='trend'` 时，layer scope.id 用 `<plotId>.trend`（直接挂用户句柄，倾向）还是 `<plotId>.mark.trend`（统一加 `mark.` 段）？倾向前者（用户句柄优先、更短，对齐 §8.1「用户 id 优先」）；缺省合成统一 `<plotId>.mark.<index>`。
- **series 值非字符串 / 含 `.` 的 id 安全**：`<plotId>.series.<value>` 当 value 含 `.` 或非串时路径歧义——倾向对 value 做确定性 slug（非串 `String()`、`.`→`_`），slug 冲突时 fail loud（与 datumIdField 重复同策，保 anchor 稳定）。细节实现期定。
- **datumIdField 作用域**：`LowerPlotsOptions.datumIdField` 是全局一个字段名（倾向，最简、对齐 §8.1「lowering option」），还是按 mark 配？倾向全局；按 mark 需求出现再非破坏扩展。
- **`sourceIndex` 追踪深度（P1 评审遗留）**：sort 重排可保原序、stack 派生新行可能断链——是「best-effort（断链则省 `sourceIndex`，倾向）」还是「强制全链路追踪源行（每个 transform 都透传 sourceIndex / 多源行给数组）」？倾向 best-effort（v0.1 收尾不重写 transform 管线），强链路追踪归 backlog。
- **guide meta `dimension` 取值**：polar 下用 `'angle'`/`'radius'` 还是归一化角色 `'angular'`/`'radial'`？倾向沿用 guide IR 的 `dimension` 原值（与轴定义一致、不引入第三套词）。

## DSL 表面

> id / meta 主要由 lowering **程序化注入**——用户在 plot spec 给 `id`（root / mark）+ 在 `lowerPlots` options 开 datum 级，lowering 自动绑。用户不手写 core meta。

```tsx
// react —— root / mark 给 id；lowerPlots 开 datum 级 provenance + id 源字段
const datasets = { sales: [{ q:'Q1', v:120, region:'north' }, /* … */ ] };

<Layout compileOptions={{ composites: lowerPlots(datasets, {
  provenance: true,           // 总开关：写 layer/series meta + 合成 <plotId>. 内部 id（默认关 → 逐字节等价 alpha.4）
  datumProvenance: true,      // 每个 datum Node 写 per-datum meta（hit-test 用；蕴含需 provenance 开）
  datumIdField: 'q',          // 把 q 字段值绑成 <plotId>.datum.<q> 的 Node.id（可连接；缺字段/重复值 fail loud）
}) }}>
  <Plot id="sales" data="sales" coordinate="cartesian2D">
    <BarMark id="bars" x="q" y="v" />
  </Plot>
</Layout>
// → 下沉出 scope#sales > scope#sales.bars（meta layer:mark）> node#sales.datum.Q1（meta datum:0）…
```

```ts
// 消费侧（v0.3 交互层预览）—— 命中图元读 meta 反查来源
const prim = hitTest(scene, pointer);
prim?.meta;   // → { source:'plot', mark:'interval', markIndex:0, datum:0 }
```

## 测试设计

`packages/plot/plot/tests/lower/scope-id-meta.test.ts`（新建）覆盖：

- root / mark / series scope 的 id 命名与 `<plotId>.` 前缀
- layer / series meta 内容；per-datum meta 开关行为
- datumIdField 绑 `Node.id`；缺省不绑（产物等价 alpha.4）
- 无 root id 时退回匿名（无合成 id）；meta 一律不含 plotId key
- cartesian / polar 双系下 id / meta 一致
- core ADR-08 通道连通：含 meta 的 lowering 产物经 `compileToScene` → Scene 图元带 meta

具体 case 见下「实现契约 § 测试象限」。

## 影响

- **lowering 产物变化（默认零回归）**：`provenance` 默认关 → 产物**逐字节等价 alpha.4**（无新 key）。开 provenance → mark/series 元素多 `id`（root.id 在时）+ layer/series meta；datum 开关另控 per-datum meta。用户设 root.id / mark.id 时该处绑 id（opt-in by naming）。**meta 渲染中立**（core ADR-08）：开 provenance 不改 viewBox / 图元几何 / 渲染输出。
- **`LowerPlotsOptions` 扩**：加 `provenance?: boolean`（总开关，默认 false）/ `datumProvenance?: boolean`（默认 false）/ `datumIdField?: string`（运行时选项，**不进 IR**）。
- **React / vanilla 适配器必须转发新 options（P1 评审）**：`@retikz/plot-react` 的 `PlotCommonProps extends LowerPlotsOptions`，但 `Plot.tsx` 当前**只转发 `{ width, height, fontSize, margin }`**（[Plot.tsx](../../../../../packages/plot/react/src/Plot.tsx)）——新增三 option 会被静默丢弃。须把 `provenance` / `datumProvenance` / `datumIdField` 纳入转发，并同步 `@retikz/plot-vanilla` 对等入口（develop-design 适配器对等）。
- **core**：纯消费 ADR-08 的 `Scope.meta` / `Node.meta` / `Path.meta`（line/area series）+ 既有 `Scope.id` / `Node.id`；**不改 core**。
- **plot IR schema**：无字段增删（`mark.id` / root `id` / root `meta` alpha.1 已在）。
- **文档站**：`@retikz/plot` 文档需补「provenance / anchor」一节——root/mark `id` 的 anchor 语义、`lowerPlots` 的 `provenance` / `datumProvenance` / `datumIdField` 选项、meta 用于交互命中的说明 + index 语义（source vs transformed）（双语 + 一个「命中读 meta」概念示例；meta 不可见，无渲染 demo）。
- **对外 API**：`lowerPlots` options additive（三个可选字段）+ react/vanilla `<Plot>` 多接三 prop；plot spec 表面无变化。**非 BREAKING**。

## 不在本 ADR 范围

- **datum locator 正向解析**：[ADR-02](./02-datum-locator.md)（本 ADR 只抽出共用 frame 构造）。
- **反向 hit-test（屏幕坐标 → datum）/ 事件回调**：v0.3 交互。
- **meta 进命名空间 / 可被引用**：meta 是随行数据、不是句柄（core ADR-08 已定）；引用走 id。
- **Path（line / area）的 per-datum 锚点**：line / area 下沉成单条 `Path`，datum 不是独立 Node——其 per-datum meta / 锚点（折线顶点级命中）留后续；本 ADR 的 per-datum meta 仅覆盖「datum = 独立可见 Node」的 mark（point / interval / sector）。line / area 带 layer 级（layer scope）+ series 级（每条 series Path）id/meta。
- **export anchor / proxy 机制（外部连到子元素）**：localNamespace 内部 id 不上浮，外部直接连 `<plotId>.series.north` 等子锚点需在父帧注册代理 bbox——**留 v0.5 跨域组合**（plot-design §14）。v0.1 外部只连整图 root id。
- **color 分组 → series 分组重构**：让 point/interval/sector 也按 `series` 分子 Scope（color 退为样式分层）、从而都有 series 级 id/meta——属较大 lowering 重构，**backlog**。v0.1 这三类 mark 的 series 信息走 datum meta。
- **`sourceIndex` 全链路强追踪**：跨所有 transform（含派生行）精确回指源行——backlog；v0.1 best-effort。
- **legend / 跨域组合 UI**：v0.5。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/plot/plot/src/lower/**`（下沉到 core IR 的契约边界：产物新增 id / meta）。无 plot IR schema 改动，但 lowering 产物契约变化按 plot `_template.md` 判级归 red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/lower/expand.ts` | 加 option（**非 IR**，TS 类型）| `LowerPlotsOptions.provenance` | `boolean`（可选）| `false` | 总开关：开启才写 layer/series meta + 合成 `<plotId>.` 内部 id；关 → 逐字节等价 alpha.4 |
| `packages/plot/plot/src/lower/expand.ts` | 加 option（**非 IR**，TS 类型）| `LowerPlotsOptions.datumProvenance` | `boolean`（可选）| `false` | 每个 datum Node 写 per-datum meta（hit-test 来源；蕴含需 provenance 开）|
| `packages/plot/plot/src/lower/expand.ts` | 加 option（**非 IR**，TS 类型）| `LowerPlotsOptions.datumIdField` | `string`（可选）| 省略 | 数据属性名：把该字段值绑成 `<plotId>.datum.<值>` 的 `Node.id`（opt-in 可连接；缺字段/重复值 fail loud）|

> **plot IR schema 无改动**（root `id` / `meta`、`mark.id` alpha.1 已在；本 ADR 接通它们的 lowering 语义，不改字段）。上表两项是 `lowerPlots` 运行时选项、不进 IR。

### 文件 scope

- `packages/plot/plot/src/lower/expand.ts`（修改：抽 `resolveFrame`；root/mark 绑 id + 写 meta；扩 `LowerPlotsOptions` 三 option；plotId 前缀 + provenance 开关逻辑；datumIdField fail-loud）
- `packages/plot/plot/src/lower/mark.ts`（修改：lowerMark 接 provenance 上下文——plotId / markIndex / datum 开关；**line/area 每条 series Path 绑 id+meta**；point/interval/sector 仅 layer 级 + per-datum node 写 id+meta；datum meta 带 dataReference/transformedIndex/sourceIndex/series）
- `packages/plot/plot/src/lower/guide.ts`（修改：轴 / 网格 scope 加 `<plotId>.` 前缀 + layer meta）
- `packages/plot/plot/src/lower/transform.ts`（按需：threads sourceIndex best-effort——sort 保原序透传，派生行断链则省）
- `packages/plot/plot/src/lower/index.ts`（按需：导出 `resolveFrame` 供 ADR-02）
- `packages/plot/react/src/Plot.tsx`（修改：`PlotCommonProps` → lowerPlots 转发新增 `provenance` / `datumProvenance` / `datumIdField`）
- `packages/plot/vanilla/src/<入口>.ts`（修改：vanilla 渲染入口对等转发三 option）
- `packages/plot/plot/tests/lower/scope-id-meta.test.ts`（新建）
- `packages/plot/react/tests/<plot-options>.test.ts`（新建 / 修改：断言三 option 透传到 lowerPlots，不被丢弃）
- `apps/docs/src/contents/plot/<provenance / anchor 概念页>.mdx` + 同级 `.demo.tsx`（新建 / 修改：anchor + lowerPlots options + index 语义说明）

### 测试象限

**Happy path（≥ 3）**：

- `root_id_to_scope_id`：`<Plot id="sales">` + `provenance:true` → 外层 scope.id='sales' + localNamespace + meta `{source:'plot',dataReference:'sales'}`
- `mark_layer_id_meta`：bar mark[0] → 图层 scope.id='sales.mark.0'、meta `{layer:'mark',mark:'interval',markIndex:0}`
- `line_series_path_id_meta`：line 多系列 → 每条 series **Path** 带 id='sales.series.<value>' + `Path.meta` 带 series（验证 series 落在 Path、非子 scope）
- `datum_provenance_on`：`datumProvenance:true` → 每个 datum Node 带 meta `{dataReference,mark,markIndex,transformedIndex,sourceIndex,series?}`

**边界（≥ 2）**：

- `provenance_off_byte_identical`：默认（`provenance` 关）→ lowering 产物**逐字节等价 alpha.4**（无任何 meta / 合成 id key）
- `no_root_id_anonymous`：`provenance:true` 但 root 无 id → 内部 scope 匿名（无合成 id）、meta 不含 plotId key、locator 按结构索引仍可寻址
- `series_value_slug`：series 值非串 / 含 `.` → id 路径确定性 slug；slug 冲突 → fail loud
- `transformed_vs_source_index`：spec 带 sort transform → datum meta 的 `transformedIndex`=渲染序、`sourceIndex`=原 dataset 行序，二者不同且都正确

**错误路径（≥ 2）**：

- `datum_id_field_missing`：`datumIdField` 指向某行不存在的字段 → **抛清晰错误**（fail loud）
- `duplicate_datum_id`：`datumIdField` 值在两行重复 → **抛清晰错误**（不 last-wins，保 anchor 稳定）

**交互（≥ 2）**：

- `polar_id_meta_parity`：polar 下 sector / 径向柱层 id / meta 与 cartesian 同构
- `compile_meta_reaches_scene`：含 meta 的 lowering 产物 → `compileToScene` → Scene 图元带同款 meta（验证 ADR-08 通道连通）；renderer 输出与无 meta 版几何/字节中立
- `react_options_forwarded`：`<Plot>` 经 `@retikz/plot-react` 传 `provenance`/`datumProvenance`/`datumIdField` → 实际到达 `lowerPlots`（不被静默丢弃；回归 P1 评审）
- `id_meta_coexist`：root+mark id 与 meta 共存、互不影响；compile 后图元同时带 id（data-retikz-id）与 meta

### 依赖的现有元素

- `Scope.meta` / `Node.meta` / `Path.meta`（`packages/core/core/src/ir/{scope,node,path/path}.ts`，[core ADR-08](../../../../core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md)）—— **消费**：写下沉元素来源（Path.meta 给 line/area series）；compile 自动 stamp 进 Scene。
- `Scope.id` + `localNamespace`、`Node.id`、`Path.id`（`packages/core/core/src/ir/{scope,node,path/path}.ts`）—— **消费**：id 绑定句柄；root scope 已 localNamespace（内部 id 不上浮）。
- `expandPlot` / `LowerPlotsOptions`（`packages/plot/plot/src/lower/expand.ts`）—— **修改**：抽 `resolveFrame`、绑 id/meta、扩三 option、provenance 开关 + datumIdField fail-loud。
- `lowerMark` 及 `barLayer` / `sectorLayer` / `colorGroupedScope` / line·area 的 series Path 构造 / 各 `placed` node 构造（`packages/plot/plot/src/lower/mark.ts`）—— **修改**：接 provenance 上下文；line/area series Path 绑 id+meta；point/interval/sector datum node 写 id+meta。
- `lowerGuide`（`packages/plot/plot/src/lower/guide.ts`，已绑 `guide.id`）—— **修改**：加前缀 + layer meta。
- `PlotCommonProps`（`packages/plot/react/src/Plot.tsx`，`extends LowerPlotsOptions` 但仅转发 width/height/fontSize/margin）—— **修改**：转发新增三 option；`@retikz/plot-vanilla` 入口对等。
