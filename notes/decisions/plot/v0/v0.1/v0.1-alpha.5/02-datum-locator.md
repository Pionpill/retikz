# ADR-02：datum locator 命中预演——逻辑地址 → 位置/元素的确定性正向解析纯函数，不逐点预注册

- 状态：Proposed
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.5 roadmap](./roadmap.md) · [plot-design.md §7 anchor / §8.1 id 绑定与可连接性（locator 段）](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 scope-aware id 绑定 + meta 透传](./01-scope-id-meta.md)

## 背景

[ADR-01](./01-scope-id-meta.md) 给低基数结构（root / mark / series）绑了具名 id，给 datum 提供了 opt-in 的 id / meta。但 [plot-design §8.1 风险备注](../../../../../architecture/plot-design.md)明确：**高基数 datum 不该逐点预注册**——万级散点逐点绑 id = 万级 core `nodeIndex` 注册，撑爆 IR 体积、编译成本与命名空间。该场景的正解是 **locator 按需解析**：

> 高基数且只需「按规则定位」的场景，优先用 locator 解析（`<plotId>.datum.<rowIndex>` 连接时按需算出），而非逐点预注册。

即：给一个逻辑地址 `<plotId>.datum.3`，**不需要**事先把第 3 行注册成具名 Node，而是**按需把它在 scene 里的落点算出来**。这正是 v0.1 贯穿原则里「datum locator 命中预演」的本体——它是 v0.3 交互命中的地基：v0.3 拿到指针位置后要反查 datum，而反查的前提是「逻辑地址 ↔ 屏幕位置」这套映射已经确定性建立、且与实际渲染一致。

本 milestone 只做**正向**（地址 → 位置）。反向（屏幕坐标 → 命中哪个 datum）是 v0.3 交互层职责（依赖 core 水合、事件绑定），不在 v0.1。正向解析是反向的基础：反向 = 在正向映射上做空间索引 / 最近邻，正向不确定则反向无从谈起。

## 决策：`createPlotLocator` 返回纯函数 locator，复用 ADR-01 frame，按地址 O(1) 算位置 + 合成 meta，与 lowering 产物位置逐点一致

### API

```ts
/** 解析结果：逻辑地址在 scene 里的落点 + 来源 meta + （若已绑）可连接 id */
type ResolvedAnchor = {
  /** 该 datum / series 的锚点屏幕位置（user units，与 lowering 摆放一致）*/
  position: [number, number];
  /** 来源 meta（与 ADR-01 per-datum meta 同构：dataReference / mark / markIndex / transformedIndex / sourceIndex? / series?；即便 lowering 没开 datumProvenance 也按需合成）*/
  meta: IRJsonObject;
  /** 若 ADR-01 给该元素绑了具名 id（mark/series 句柄、或 datumIdField 命中），回填；否则省略 */
  id?: string;
};

/** plot locator：对一份 spec + 数据 + 渲染选项的确定性正向解析器（纯函数、无副作用、不进 IR）*/
type PlotLocator = {
  /**
   * 按 transformedIndex（transform 后行序 = lowering 迭代序 = 渲染序）解析 datum 锚点。O(1)。
   * markIndex 缺省取首个含位置的 mark；越界 / 该行未被渲染（投影无效 / 零尺寸被 lowering 跳过）→ null。
   */
  datum(transformedIndex: number, opts?: { markIndex?: number }): ResolvedAnchor | null;
  /** 按 series 值解析其区域锚点（该 series 所有已渲染 datum 锚点的 centroid）。O(k)（k=该 series 行数，需扫该 series）。无此 series / 全被跳过 → null */
  series(value: string | number, opts?: { markIndex?: number }): ResolvedAnchor | null;
  /** 按点路径串解析：'<plotId>.datum.<transformedIndex>' / '<plotId>.series.<value>'；不匹配 / plotId 不符 → null */
  resolve(address: string): ResolvedAnchor | null;
};

/** 用与 lowerPlots 同一份 spec + datasets + options 建 locator（复用 ADR-01 resolveFrame，投影单一真源）*/
const createPlotLocator: (
  spec: PlotSpec, datasets: ExternalDatasets, options?: LowerPlotsOptions,
) => PlotLocator;
```

### 一致性保证（命中预演的核心）

locator 的 `datum(i).position` **必须等于** lowering 实际摆放第 i 行那个 Node 的 `position`。两者的唯一可靠对齐方式是**共用同一份逐行锚点计算**——故本 ADR 把「某 mark 的某行 → 锚点位置」抽成共享纯函数 `datumAnchor(mark, row, frame)`，[ADR-01](./01-scope-id-meta.md) 抽出的 `resolveFrame` + 本函数同时被 `mark.ts`（建 Node 时）与 `locate.ts`（解析时）消费。改了几何只改一处，locator 不漂移。

```
spec + data + options
   └─ resolveFrame (ADR-01 抽出)  ──┬─> mark.ts: 每行 datumAnchor → Node.position（实际摆放）
                                    └─> locate.ts: datum(i) → datumAnchor → ResolvedAnchor.position（按需解析）
   两条路同源 ⇒ locator(i).position === lowering 第 i 行 Node.position（测试断言）
```

### 不逐点预注册（复杂度据实，P2 评审修正）

locator 是**纯函数、不进 IR、不注册任何 core 元素**，不预建 N 个锚点、不碰 `nodeIndex`。复杂度据实：

- **`datum(i)` O(1)**——按需算第 i 行的 frame 投影，一次投影一个点。
- **`series(v)` O(k)**——centroid 需扫该 series 的 k 行（或首次惰性预建一次 series→行 索引、后续 O(1)）；**不是 O(1)**。
- 万级散点下 locator 内存 = spec + 数据引用；解析单 datum = 一次投影。

**未渲染 datum → null**：lowering 会跳过投影无效 / 零尺寸的行（[mark.ts](../../../../../packages/plot/plot/src/lower/mark.ts) 各 `Number.isFinite` 守卫 / 退化扇区跳过）。locator 必须对**这些行同样返回 null**（命中预演与实际渲染一致：没渲染的 datum 不可命中）。`series(v)` 的 centroid 只计入已渲染成员。

`meta` 即便 lowering 没开 `datumProvenance`（ADR-01 默认关），locator 也按需合成同构 meta——provenance 零 IR 代价可得。

理由：

1. **兑现 §8.1 locator 路线**——高基数靠按需解析、不靠预注册，IR 体积与解析能力解耦。
2. **共享 `datumAnchor` 杜绝漂移**——locator 与 lowering 同源，「命中预演 ↔ 实际渲染一致」从设计上成立、非靠测试碰运气。
3. **正向边界清晰、不越 v0.3**——只给「地址 → 位置」，反向 hit-test / 事件回调留交互层；v0.1 收口不引入 runtime 依赖。
4. **纯函数易测易组合**——无副作用，v0.3 交互层与跨域组合（v0.5 连 `<plotId>.series.<v>`）都能直接复用。

## 待决策点 🔻

- **datumAnchor 共享 vs 独立重算 + parity 测试**：倾向**共享纯函数**（mark.ts 与 locate.ts 同调，从设计杜绝漂移）；备选「locator 独立重算 + 测试断言等价」实现轻但留漂移口子。倾向前者。
- **interval / sector 的 datum 锚点取哪个点**：point = glyph 中心；interval = 柱的 Node.position（柱中心，倾向）还是顶部中点（更适合挂标签）？sector = Node.position（圆心）还是扇片 centroid（更适合命中，倾向 centroid）？倾向「能命中该图元的代表点」，与 mark 几何对应，实现期按 mark 类型定并测。
- **line / area 的 datum 解析**：line / area 下沉成单 Path、datum 非独立 Node。`datum(i)` 对 line/area 返回**折线顶点投影位置**（倾向，几何上就是该行的点）还是 null（「该 mark 无逐 datum 元素」）？倾向返回顶点位置（正向解析仍有意义），但 `id` 必为空（无具名 Node 可连）。
- **address 串的 plotId 缺省**：root 无 id 时 `resolve('<plotId>.datum.3')` 怎么写？倾向支持无前缀形式 `'datum.3'` / 结构化 `datum(3)`；点路径形式仅在有 plotId 时可用。

## DSL 表面

```ts
// 与 lowerPlots 同参建 locator（命中预演 / v0.3 交互层 / 跨域组合共用）
const spec = buildPlotSpec(/* … */);
const datasets = { sales: [{ q:'Q1', v:120 }, { q:'Q2', v:90 }] };

const locator = createPlotLocator(spec, datasets, { width: 480, height: 300 });

locator.datum(1);
// → { position:[…,…], meta:{ source:'plot', mark:'interval', markIndex:0, datum:1 }, id:'sales.datum.Q2'? }

locator.resolve('sales.series.north');   // → { position:<centroid>, meta:{…,series:'north'} }
locator.datum(999);                       // → null（越界）
```

## 测试设计

`packages/plot/plot/tests/lower/locate.test.ts`（新建）覆盖：

- locator.datum(i).position 与 lowering 实际摆放第 i 行 Node.position 逐点一致（point / interval / sector × cartesian / polar）
- meta 按需合成（lowering 未开 per-datum 时仍给同构 meta）
- 越界 / 不存在 series / 非法 address → null
- id 回填（datumIdField 命中时带 id；否则省）

具体 case 见下「实现契约 § 测试象限」。

## 影响

- **新模块** `packages/plot/plot/src/lower/locate.ts`（`createPlotLocator` + `ResolvedAnchor` / `PlotLocator` 类型）。
- **`src/lower/index.ts`** / **`src/index.ts`**：导出 locator API（新 public surface）。
- **共享几何抽取**：`src/lower/mark.ts` 的逐行锚点计算抽成 `datumAnchor`（与 locate.ts 共用）——属内部重构，mark 下沉产物等价。
- **frame 复用**：消费 [ADR-01](./01-scope-id-meta.md) 抽出的 `resolveFrame`。
- **core**：不依赖、不改（locator 纯 plot 侧）。
- **plot IR schema**：无改动（locator 不进 IR）。
- **文档站**：plot 「provenance / anchor」一节补 locator 用法（命中预演示例；与 ADR-01 同页或紧邻）。
- **对外 API**：新增 `createPlotLocator`（additive）。**非 BREAKING**。

## 不在本 ADR 范围

- **反向 hit-test（屏幕坐标 → datum）/ 空间索引 / 最近邻**：v0.3 交互层（在正向映射上建索引）。
- **事件回调（onHover / onClick）**：v0.3，落 `@retikz/plot-react` / `-vanilla`。
- **line / area 的顶点级具名锚点**：本 ADR `datum(i)` 给 line/area 顶点位置但不绑具名 id；逐顶点可连接锚点留后续。
- **series bbox / 外接锚点**：本 ADR series 锚点取 centroid；bbox 留后续。

---

## 实现契约（必填）🔻

### Level

`red`——新增 `packages/plot/plot/src/index.ts` 导出（public surface）+ 动 `src/lower/**`（locator + 共享几何抽取）。

### Schema 改动

无 IR schema 改动（locator 是 API + 派生类型，不进 IR）。新增导出类型 `ResolvedAnchor` / `PlotLocator` 与函数 `createPlotLocator`（`z.infer` 不适用，手写 TS 类型 + 中文 JSDoc）。

### 文件 scope

- `packages/plot/plot/src/lower/locate.ts`（新建：`createPlotLocator` + 类型）
- `packages/plot/plot/src/lower/mark.ts`（修改：抽 `datumAnchor` 共享几何）
- `packages/plot/plot/src/lower/expand.ts`（按需：导出 / 复用 `resolveFrame`、`datumAnchor`）
- `packages/plot/plot/src/lower/index.ts`（修改：导出 locator）
- `packages/plot/plot/src/index.ts`（修改：re-export public locator API）
- `packages/plot/plot/tests/lower/locate.test.ts`（新建）
- `apps/docs/src/contents/plot/<provenance / anchor 页>.mdx`（修改：locator 用法段 + demo）

### 测试象限

**Happy path（≥ 3）**：

- `datum_position_matches_lowering_point`：point mark，`locator.datum(i).position` === lowering 第 i 行 Node.position（cartesian）
- `datum_position_matches_lowering_interval`：interval mark 同上（柱锚点）
- `datum_meta_synthesized`：lowering 未开 `datumProvenance`，`locator.datum(i).meta` 仍给同构 `{dataReference,mark,markIndex,transformedIndex,sourceIndex?,…}`
- `resolve_path_series`：`resolve('<plotId>.series.<v>')` → 该 series 已渲染成员 centroid 锚点

**边界（≥ 2）**：

- `datum_out_of_range`：`datum(负 / ≥ rowCount)` → null
- `unrendered_datum_null`：某行投影无效 / 零尺寸被 lowering 跳过 → `datum(该行)` 返回 null（与渲染一致，不返回幽灵位置）；该行不计入 `series` centroid
- `series_not_found`：`series(不存在值 / 全被跳过)` → null
- `no_plot_id_structural`：root 无 id → `datum(i)` 仍解析（结构寻址）、点路径形式按待决策处理

**错误路径（≥ 2）**：

- `invalid_address`：`resolve('garbage')` / 非法段 → null（不抛）
- `locator_pure_no_ir_mutation`：建 locator + 多次解析不改 spec / 不产 IR / 不注册 core 元素（断言无副作用）

**交互（≥ 2）**：

- `polar_datum_parity`：polar 下 sector / 径向柱 `datum(i).position` 与 lowering 一致（与 cartesian 同保证）
- `id_backfill_on_datumIdField`：开 `datumIdField` 后 `datum(i).id` === lowering 给该 Node 绑的 `<plotId>.datum.<值>`
- `shared_anchor_no_drift`：同一 (mark,row,frame) 下 `datumAnchor` 被 mark.ts 与 locate.ts 调用结果一致（共享几何单一真源）

### 依赖的现有元素

- `resolveFrame`（[ADR-01](./01-scope-id-meta.md) 从 `expand.ts` 抽出）—— **消费**：locator 与 lowering 共用投影帧。
- `datumAnchor`（本 ADR 从 `mark.ts` 抽出的逐行锚点计算）—— **新建 + 共享**：mark 下沉与 locator 同调，杜绝位置漂移。
- `lowerMark` / `barLayer` / `sectorLayer` 及各 `placed` node 构造（`packages/plot/plot/src/lower/mark.ts`）—— **修改**：改调共享 `datumAnchor`。
- `IRJsonObject`（`packages/core/core/src/ir/json.ts`）—— **复用**：`ResolvedAnchor.meta` 类型（与 ADR-01 / core ADR-08 同源）。
- `PlotSpec` / `ExternalDatasets` / `LowerPlotsOptions`（`packages/plot/plot/src/ir`、`src/lower/expand.ts`）—— **引用**：locator 入参类型。
