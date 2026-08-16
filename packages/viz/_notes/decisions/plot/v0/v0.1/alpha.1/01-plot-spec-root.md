# ADR-01：Plot 根节点（`plot` composite 节点 + 数据引用 + JSON 透传约束）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 / §8 / §8.1 / §11 / §13.1](../../../../../architecture/plot-design.md) · 子结构：[ADR-02 data](./02-plot-data.md) · [ADR-03 scale](./03-plot-scale.md) · [ADR-04 coordinate](./04-plot-coordinate.md) · [ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景 / 约束

塑造方案的硬约束：

- **数据不进 IR**（plot-design §3）：一张图 = ① IR（配置：图类型 / 数据引用 / scale / coordinate / mark）② 外部数据（任意 JS，单独存）③ 绑定函数 `(IR + 数据) → core IR`。把数据集内联进 IR 会让体积随数据量爆炸、拖垮持久化与 LLM 生成。这正是 core 处理所有 Tier 2 与扩展点（shapes / arrows / patterns / pathGenerators / composites）的既定模式——「含函数与数据、不进 IR、经 `CompileOptions` 运行时注入」。
- **复用 core 既有 Tier 2 通道**：core 已有 open composite child（`type: string` passthrough）+ `CompileOptions.composites` + `compileToScene` 第一步 `lowerComposites`，plot 根只需做成一个 composite 节点接进去，零新机制。

## 决策：`plot` composite 节点，挂 data 引用 / scales / coordinate / marks + id / meta 预留

Plot IR 根是 `{ namespace: 'plot', type: 'plot', ... }`，扩展 core composite 基础契约，承载数据引用、命名 scales、coordinate 或 composition、marks、guides、theme 与 layout。真实数据和 runtime definitions 不进入 IR；根节点只组合各 owner 的公开 schema，不复制它们的内部语义。

实际数据在编译期经 `lowerPlots(datasets)` 闭包注入（`data.ref` 按名查 `datasets`），renderer 后端只见 lowered 后含具体数字的 core IR，碰不到 plot 原始数据。`meta` 复用 core 的 `JsonObjectSchema`（递归 JSON 对象），全字段 JSON 可序列化（无函数 / ReactNode / Map）。

**命名决策**（字面即决策，故记最小片段）：

```ts
/** plot 域 namespace（单一固定值，作 Tier 2 路由键的单一真源） */
export const PLOT_NAMESPACE = 'plot';
/** plot namespace 内的 composite 类型判别值集（后续加 axis / legend…） */
export const PlotComposite = { Plot: 'plot' } as const;
export type PlotNodeType = ValueOf<typeof PlotComposite>;
```

- 根类型名取 `IRPlot`（非 `IRPlot` / `Plot`）——「spec」表意「声明式规格」，与 Vega-Lite 习惯一致、对 AI 友好。
- composite `type` 取 `'plot'`（路由键 `plot.plot`，非 `'spec'`）——alpha.1 plot 只有一种顶层节点；alpha.2+ 若出 axis / legend 等独立 composite，用各自 `type`（`plot.axis`…），根仍是 `plot.plot`。
- `namespace` / `type` 收窄为 literal，使根能作为 core open composite child 被 `lowerComposites` 按 `plot.plot` 路由展开。

理由：

1. **数据不进 IR**：IR 只持 `data.ref` + 可选 `model`，体积随配置而非数据量；持久化 / 传输 / 喂 LLM 都紧凑，与 core 全局哲学一致。
2. **根是 composite 节点而非自定义顶层**：复用 core 既有 Tier 2 通道，零新机制。
3. **根只管组合，不管内部**：四槽位各引用子 ADR schema，演进互不牵动。
4. **AI 友好优先**（core-design §7）：全称 grammar 词汇（`data` / `scales` / `coordinate` / `marks`）、每槽位清晰 `type` / 显式引用、全字段 JSON-safe。

### 未来兼容性考虑

- **`id` 是「可被连接」的句柄，非 scope 容器本身**：根 `id` 在 lowering 时必须绑到 plot lower 成的 core `Scope.id`（外部句柄，core 的连接 = path step 用 `{ id, anchor }` 引用具名元素，plot-design §8.1）。alpha.1 只埋字段位、不解析（alpha.5 接通）。
- `id` / `meta` 为预留位，让 alpha.5 的 anchor / scope-aware 与 ADR-06 的 provenance **非破坏接入**；`marks.min(1)` 锁定「至少一层」根级不变量。

### 被否决的选项

- **自定义顶层节点（不 extend `CompositeBaseSchema`）** —— 需要 core 新增识别机制；做成 composite 复用既有通道更省。
- **`meta` 自建 `ir/json.ts`** —— 复用 `@retikz/core` 的 `JsonObjectSchema` 即可，不在 plot 重复定义 JSON 值 schema。

## 不在本 ADR 范围

- **lowering / 数据绑定 `lowerPlots(datasets)`** → ADR-06。本 ADR 无运行时行为，只定根 schema 与 JSON 透传约束。
- **data 引用 / 数据模型字段、外部数据契约** → ADR-02；**scale / coordinate / encoding / mark 字段** → ADR-03 ~ ADR-05。
- **guide（axis / grid / legend）schema** → alpha.2。
- **anchor 命中 / datum locator / scope-aware 解析** → alpha.5（本 ADR 只留 `id` / `meta` 字段位、不解析）。
- **框架绑定 authoring（`<Plot>` JSX / data prop 拆分 / vanilla plot builder）** → ADR-07 / ADR-08。

---
