# ADR-02：Plot 数据引用与数据模型（DataRef / DataModel + 外部数据契约）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 核心概念 / §8 lowering](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 消费方：[ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景 / 约束

根节点（ADR-01）有一个 `data` 槽位。硬约束 **数据不进 IR**（plot-design §3）——一张图拆成 ① IR（配置）② 外部数据（任意 JS，单独存）③ 绑定函数。本 ADR 因此要同时定义**分属两个世界**的两类东西：

1. **进 IR 的**：`data` 槽位形态——具名引用 `ref` + 可选数据模型 `model`（字段名 + 类型），JSON-safe。
2. **不进 IR 的**：外部数据契约——运行时喂给 `lowerPlots(datasets)` 的数据形态、encoding 怎么按 `a.b.c` 路径访问它。外部数据是任意 JS（可嵌套），**不受 IR 的 100% JSON 约束**（它从不进 IR）；只有绑定函数从中抽出的标量才进 lowered core IR。

## 决策：IR 持 `{ ref, model? }`；外部数据任意 JS，经路径 accessor 抽标量

**进 IR（`DataRefSchema`）**：`data = { ref: string, model?: DataModel }`。`ref` 是具名数据集名（编译期 `lowerPlots(datasets)` 按名查）；`model` 可选——给了就声明字段名与类型，用于校验 encoding 引用、推 scale 类型、让 LLM 不看数据即知字段，不给则绑定期从外部数据推断。

**不进 IR（外部数据契约）**：`datasets` 是 `Record<string, Array<Row>>`，`Row` 是任意 JS 对象（可嵌套）。encoding 的 `field`（ADR-05）是路径 accessor `'a.b.c'`，对 `Row` 解析后**必须落到一个标量**（`ScalarValue`）才能喂 scale——嵌套对象本身不能直接编码成位置。外部数据无 IR zod schema（仅 TS 类型契约 `ExternalRow` / `ExternalDatasets`）。

`ScalarValueSchema`（标量值：scale 映射输入 + channel 常量字面量）也在本 ADR 定义并被 ADR-05 的 `ChannelSchema.value` 复用——它是「一个标量值」的统一定义，避免「什么算合法标量」两处漂移。

**命名决策**（字面即决策，故记最小片段）：

```ts
/** 字段类型：grammar-of-graphics 标准集；alpha.1 lowering 仅消费 quantitative（linear scale） */
export const PlotFieldType = {
  Quantitative: 'quantitative',
  Nominal: 'nominal',
  Ordinal: 'ordinal',
  Temporal: 'temporal',
} as const;
export type FieldType = ValueOf<typeof PlotFieldType>;
```

理由：

1. **数据不进 IR**：IR 只存 `ref` + 可选 `model`，体积随配置而非数据量；外部数据经 `lowerPlots(datasets)` 闭包注入（对齐 core「函数 / 数据走 `CompileOptions`」哲学）。
2. **具名引用**：`ref` 让多 mark / 未来 facet / 多数据源按名共享或区分数据集（Vega-Lite named datasets 风）。
3. **外部数据任意 JS + 路径 accessor**：可直接喂 API 返回的嵌套 JSON，`field: 'user.age'` 取值；只有抽出的标量进 lowered IR，IR 仍 100% JSON-safe。
4. **`model` 可选**：给了增强（校验 / 推类型 / LLM 友好），不给保持最小 spec 可跑。
5. **`FieldType` 先放全集**：alpha.1 lowering 只用 quantitative，其余先入 schema（纯枚举、零成本），非破坏待后续消费。

## 不在本 ADR 范围

- **`field` 路径语法的 schema**（点路径字符串）→ ADR-05；**路径解析 / 标量抽取 / `model` 一致性校验 / `ref` 解析 / 空数据 / 外部数据运行时校验** → ADR-06 lowering。
- **transform（filter / sort / groupBy / stack / flatten）** → alpha.3。
- **external dataRef 的 url / 大数据采样**（这里 `ref` 是内存具名数据集名）→ 后续。
- **nominal / ordinal / temporal 的 lowering 消费**（alpha.1 只 quantitative）→ alpha.3。

---

> **实现指针**：level `red`（动 `plot/src/ir/**`）、additive 非 breaking。真源以代码为准——`PlotFieldType` / `FieldDefSchema` / `DataModelSchema` / `DataRefSchema` / `ScalarValueSchema` + 派生类型 + `ExternalRow` / `ExternalDatasets` TS 契约（`plot/src/ir/data.ts`，复用 core `ValueOf`）。外部数据是 TS 类型、非 IR zod schema。测试在 `packages/plot/plot/tests/ir/data.schema.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。
