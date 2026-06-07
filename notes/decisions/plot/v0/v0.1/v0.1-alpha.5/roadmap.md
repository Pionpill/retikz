# plot v0.1-alpha.5 实施待办：scope-aware id 绑定 + meta 透传 + datum locator 命中预演（v0.1 收尾）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §7 anchor / §8.1 id 绑定与可连接性`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.4`](../v0.1-alpha.4/roadmap.md)

## 目标

v0.1 的**收尾里程碑**：把 alpha.1 起就埋好的 **anchor / scope 预留字段**接通可用，让 plot 下沉出的 core IR 不再是「丢了来源的纯几何黑盒」——每个下沉元素都能反查「它来自哪个 series / 哪行 datum / 哪个 layer」，并提供一个**确定性的 datum locator** 做命中预演，为 v0.3 交互命中铺好地基。

具体三块（对齐 [plot v0.1 roadmap](../roadmap.md) 的「贯穿原则」）：

- **scope-aware 落地**：按 [plot-design §8.1](../../../../../architecture/plot-design.md) 把 id 绑定补齐——mark 下沉成的 `Scope`、line/area 每条 series 的 `Path`、datum（opt-in）下沉成的 `Node` 绑 id，内部 id 统一带 `<plotId>.` 前缀（root 已是 `localNamespace` scope，alpha.1 就位）。**注意 localNamespace 语义**：内部 `<plotId>.` id 是 **plot-local**（供 plot 内连接 + locator 寻址 + meta 关联），**不自动上浮**到父帧；外部只能连整图 root id 的 bbox。外部连子元素（export anchor）留 v0.5——v0.1「可被组合」义务由 root id 满足。
- **meta 透传**：消费 core 新增的 `Node` / `Scope` / `Path` `meta`（core v0.3-alpha.4 [ADR-08](../../../../core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md) 已就绪），把 layer / series / datum 来源写进下沉元素的 `meta`，compile 原样带进 Scene——交互层命中渲染图元后即可读 `meta` 反查来源。这是 v0.3 hit-test 的**主通道**（不占命名空间、无 nodeIndex 高基数代价）。**默认关**（`provenance` 总开关默认 false → 产物逐字节等价 alpha.4）；开启才写 meta，且 core ADR-08 保证 meta 渲染中立。
- **datum locator 命中预演**：提供逻辑地址（`<plotId>.datum.<rowIndex>` / `.series.<value>`）→ 屏幕位置 / 元素的**确定性正向解析纯函数**，且**不逐点预注册**（§8.1 风险备注：万级散点逐点绑 id 会撑爆 nodeIndex）。高基数场景按需算位置、不进 IR。**只做正向解析**——反向 hit-test（屏幕坐标 → datum）与事件回调留 v0.3 交互。

端到端验收（折线 / 柱状 × cartesian / polar 双系，带 id / meta / locator 一致性断言）**作为两条 ADR 的测试象限分摊**，不单独成 ADR。

不在 alpha.5（顺延 / 留后续）：反向 hit-test 与事件回调（v0.3 交互）、ternary / 1D 坐标系、log / pow scale、size / opacity / shape 非位置通道、legend、facet、跨域组合（基于 core `Scope` 的通用能力，plot 只保证「可被组合」=本 milestone 的 id/anchor 接通已满足）。详见 [plot v0.1 roadmap backlog](../roadmap.md)。

## core 依赖（已就绪，已回灌 next-plot）

- **core meta provenance**（v0.3-alpha.4 [ADR-08](../../../../core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md)）：`Node` / `Scope` / `Path` 的可选 `meta`（`JsonObjectSchema`）+ `ScenePrimitive.meta?` + compile 沿 alpha.3 id-stamp 同路把 `meta` 带进 Scene、renderer 忽略。**plot alpha.5 的 meta 透传完全消费这条能力，不需要再补 core**。
- **既有 core id / anchor 能力**（无需新增）：`Scope.id`（设了即在父帧注册 bbox 句柄）+ `localNamespace`、`Node.id`（可选）、`Coordinate.id`（必填，无视觉 anchor 点）——id 绑定全部消费这些现成能力。

> 经核对：除 meta 外，plot alpha.5 接通 anchor/scope 的全部 id 绑定 + locator 正向解析，core 已足够，**不依赖任何其他 core 改动**。

## 执行模式

**单条串行**：每条 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开下一条。两条 ADR 草案先一次性起草为 `Proposed`，用户 review ack 后逐条进实现（沿用 alpha.4）。

**设计阶段多 LLM 评估**：红色 ADR（本 milestone 两条全红）按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 要求贴给至少一个外部 LLM 跑挑刺 / 替代方案视角，意见合进 ADR 的「决策」/「待决策点」/「不在范围」段。

## 实现顺序（编号 ≠ 实现顺序，依赖叶子优先）

```
01 scope-aware id 绑定 + meta 透传 (真叶子：改 lowering 产物，绑 id / 写 meta)
 └─ 02 datum locator 命中预演 (dep 01：locator 解析结果须与 01 下沉产物位置一致)
```

- **01 是真叶子**：它把 root / mark / series / datum 下沉元素绑 id + 写 meta，并抽出可复用的 frame 构造（locator 要共用同一投影）。
- **02 依赖 01**：locator 的「正向解析位置」必须与 01 lowering 实际摆放 datum 的位置**逐点一致**（命中预演的核心断言）；故 02 复用 01 抽出的 frame 构造，不另造一套投影。
- 实现顺序：`01 → 02`。

> **测试 case 规则**：plot alpha milestone 放宽为「按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言（id 绑定路径、meta 内容、locator 与 lowering 位置一致），不硬凑每 ADR ≥ 9」。此放宽已写进 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) SKILL 与 [plot `_template.md`](../../../_template.md)（测试象限段）。

## 前置 setup

无新包。alpha.5 主要在 `src/lower/{expand,mark,guide}.ts` 改（绑 id / 写 meta + 抽 frame 构造），新建 `src/lower/locate.ts`（locator），扩 `LowerPlotsOptions`（`provenance` 总开关 + `datumProvenance` + `datumIdField`），并改 `packages/plot/react/src/Plot.tsx` + vanilla 入口转发新 option（评审 P1）。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-scope-id-meta.md) | scope-aware id 绑定 + meta 透传（mark → `Scope.id`、line/area series → `Path.id`、datum opt-in → `Node.id` + 各级 `meta`；`<plotId>.` plot-local 前缀；`provenance` 总开关默认关→等价 alpha.4、per-datum + datumIdField 独立 opt-in；datum index = transformed/source；抽出可复用 frame；react/vanilla 转发 option） | red | core ADR-08（已回灌）| Accepted |
| [02](./02-datum-locator.md) | datum locator 命中预演（逻辑地址 → 位置/元素的确定性正向解析纯函数，复用 01 frame，不逐点预注册；与 lowering 产物位置一致性断言）| red | ADR-01 | Accepted |

> ✅ **2026-06-07 alpha.5 封口**：ADR-01/02 全部 `Accepted`；绿灯关（`@retikz/plot` **368** 测试 + `plot-react` 59 + `plot-vanilla` 10 + 三包 tsc + eslint + docs build）全过；三轮对抗已留痕——Bug Hunter（修 datumProvenance 蕴含 bug + 3 回归）、Contract Auditor（四方对账无 BLOCKER）、**封口后多 LLM cross-review**（修 3 BLOCKING：anchor placement 收成单一真源除 dodge/stack/polar-dodge 漂移、datum-id 提升 plot 级 fail-loud、locator 与 lowering fail-loud 对齐 + 6 回归）；changelog（三包，双语）已入库。暂不发版。
>
> **v0.1 minor 至此 alpha.1~alpha.5 全部完成**——8 段管线 × cartesian/polar 端到端闭环 + scope-aware/anchor 接通。beta / rc 收尾另排。

## 头号设计决策（已定：ADR-01 决策段，含多 LLM 评审 2026-06-07 合并）

> 起草初稿后经多 LLM 评审（挑刺 / 替代方案视角），下列已在 ADR-01「决策」段拍板；剩余细节在各 ADR「待决策点」：

- **`<plotId>.` 前缀 + localNamespace 边界**：root `node.id` 作 plotId，内部 id 带 `<plotId>.` 前缀但**仅 plot-local**（不上浮，外部连子元素留 v0.5 export anchor）；root 无 id 则内部匿名、locator 按结构索引寻址。
- **meta 默认关（评审 P1 修正）**：`provenance` 总开关默认 false → **逐字节等价 alpha.4**；开启才写 layer/series meta + 合成内部 id。per-datum meta（`datumProvenance`）与 datum id（`datumIdField`）各自独立 opt-in。
- **series 落点（评审 P1 修正）**：现 lowering point/interval/sector 按 color 分组、非 series；故 series id/meta **只绑 line/area 的每条 Path**，其余 mark 走 layer 级 + datum meta 带 series；color→series 重构归 backlog。
- **datum index 语义（评审 P1 修正）**：meta 带 `dataReference` + `transformedIndex`（渲染序）+ `sourceIndex`（best-effort 回原始行）；locator `datum(i)` 的 i = transformedIndex。
- **datumIdField 严格（评审 P2 拍板）**：缺字段 / 重复值 **fail loud**（不 last-wins）。
- **frame 构造抽取**：ADR-01 把投影帧构造抽成可复用纯函数（spec + rows + options → frame），mark 下沉与 locator 共用，杜绝两套投影漂移。
- **React/vanilla 转发（评审 P1 修正）**：`@retikz/plot-react` `<Plot>` 当前丢弃 `LowerPlotsOptions` 新字段，ADR-01 file scope 已纳入 `Plot.tsx` + 测试 + vanilla 对等。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.5 是**兑现点**：

- **anchor / scope 预留 → 接通**：alpha.1 埋的 root/mark `id` 字段、root `meta` 字段，alpha.5 全部接通可用；id 绑定走 §8.1 命名约定、meta 走 core ADR-08 通道。
- **零成本埋点 → 可用能力**：alpha.1 只验证字段位就位、不附语义；alpha.5 附上「下沉时绑 id + 写来源」的语义，并用 locator 证明「按地址能命中」。
- **scope-aware IR（v0.5 组合 / facet 要用）**：本 milestone 的 root id + localNamespace 让每张图 lower 进**整图可引用** scope（外部连 root bbox），满足 plot 对组合的 v0.1 义务「可被组合」。子元素跨域可连接（export anchor）是 v0.5 增量，本 milestone 内部 id 只作 plot-local。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
