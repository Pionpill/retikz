# ADR-03：Cell payload 与基础 Presentation Definition

- 状态：Proposed
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Cell 是 Table 的语义和布局槽位，不应被建模为 Core Node。另一方面，若 Table 自建 `text | image | plot` 内容 union，就会复制 Core IR 并限制未来 Tier 2 组合。

manual Cell 需要直接容纳任意 Core `IRChild`，list Cell 则需要把 Data scalar 转成可绘制内容。alpha.1 只提供最小 text presentation，但必须从第一版就让内置与自定义走同一 Definition / registry。

## 决策：Cell 统一使用 value 或直接 IRChild 两类 payload

```ts
type IRTableCellPayload =
  | {
      kind: 'value';
      value: IRDataScalarValue;
      presentation?: IRTablePresentationRef;
    }
  | {
      kind: 'content';
      content: IRChild;
    };

type IRTablePresentationRef = {
  name: string;
  options?: IRJsonObject;
};
```

- `kind: 'content'` 表示作者已提供 Core 内容，Table 只在局部 Cell scope 中放置它
- `kind: 'value'` 表示 Table 通过 presentation registry 把 scalar 转成 `IRChild`
- `presentation` 省略时使用内置 `text`
- `options` 只允许 JSON object；Definition 的 schema 在 pipeline 精确校验
- list column 的 field value 在 canonical model 中形成 runtime value payload，不把数据值回写进 Table IR

### Presentation Definition

```ts
type CellPresentationDefinition<TOptions> = {
  name: string;
  optionsSchema: ZodType<TOptions>;
  present: (input: CellPresentationInput, options: TOptions) => IRChild;
};
```

alpha.1 的输入合同刻意保持最小并独立于 SemanticTableModel：

```ts
type CellPresentationInput = {
  value: IRDataScalarValue;
  cellId: string;
};
```

它只暴露 scalar value 与稳定 Cell id，不暴露 pipeline mutable state、renderer 或 ADR-02 的完整模型。location、roles、theme 等上下文需要真实 presentation 需求后再扩展。

`defineCellPresentation()`、`resolveCellPresentationRegistry()` 与 `cellPresentationDefinitionOf()` 分别归 contract / providers。Registry 使用 `Map`；内置先注册，用户 key 不能覆盖内置或重复用户 key。

### 内置 text

内置 `text` presentation 输出局部原点 `[0, 0]` 的透明 Core Node：

```ts
{
  type: 'node',
  position: [0, 0],
  text: value === null ? '' : String(value),
  stroke: 'none',
  fill: 'none',
  padding: 0,
}
```

alpha.1 不做 number/date/currency formatter。`text` 只执行确定性的 scalar → string；格式化进入 alpha.3。

直接 `IRChild` 的局部原点由内容作者负责。Table 不改写内容内部坐标，也不按 namespace 特判 Plot 或其它 Tier 2。alpha.1 只验证 nested composite 的 JSON 边界、注册与递归 lowering；基于真实 bounds 的对齐、fit、clip 和 overflow 在 alpha.2 通过通用 `IRChild` constrained layout 闭环。

理由：

1. `IRChild` 是跨 Core / Tier 2 的统一内容边界
2. value 与 content 分开，既支持数据驱动 list，也支持 manual 任意内容
3. text 从第一版走 registry，后续 image/badge/dataBar/sparkline 不需要改 Cell 根模型

`null` 在内置 text 中固定显示为空字符串；em dash 等缺失值表达由 alpha.3 formatter 决定。Presentation Definition 固定返回一个 `IRChild`；多内容由调用方返回 Core Scope 组合。

## DSL 表面

```ts
const textCell = {
  address: { row: 0, column: 0 },
  payload: { kind: 'value', value: 'Revenue' },
};

const compositeCell = {
  address: { row: 1, column: 1 },
  payload: {
    kind: 'content',
    content: { namespace: 'badge', type: 'status', value: 'ok' },
  },
};
```

## 测试设计

- value/string/number/boolean/null 经 text provider 输出确定 Core Node
- content payload 原样保留 `IRChild`
- 非 scalar value、ReactNode、函数或非 JSON options 被 schema 拒绝
- custom presentation 通过 define / registry / dispatch 输出内容
- 未注册 presentation 与重复 key fail-loud
- direct nested composite 不要求 Table 依赖对应 feature package

## 影响

- 新增 Cell payload / presentation-ref schema
- `CellPresentationInput` 不依赖 structure/model，ADR-02 反向消费本 ADR 的 payload contract
- 新增 presentation contract、text provider、registry 与 resolve pipeline
- Core `ChildSchema` 作为 content schema 真源；Table 不复制 child union
- alpha.3 在同一 contract 上增加 formatter、更多 presentation、rules 与 theme
- alpha.2 以通用内容 bounds 替代 alpha.1 的局部原点假设，并增加 allocated content box、fit 与 overflow 合同

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Cell Semantics 与 Presentation
- 解决的问题：统一显式 Core 内容和数据驱动 scalar 的 Cell 表达
- 主责包与协作包：Table 主责 presentation；Data 提供 scalar；Core 提供 IRChild
- 是否可由现有能力组合：Core 能表达内容，但不能表达 Cell value → content 策略，需要 Table Definition
- 是否需要下沉：不下沉；通用 Child schema 直接复用 Core
- 内部表达链路：payload → presentation ref → registry → present → PresentedTableModel
- 外部扩展链路：defineCellPresentation → custom definitions → resolver → same dispatch
- pipeline / lowering 与下游消费：ADR-04 放置 Presented Cell，ADR-05 lowering Core content
- React / Vanilla adapter 等价性：两者只构造同一 payload / presentation ref
- provenance / lineage / locator：presented content 保留 semantic cell id，具体 contribution mapping 进入 ADR-05/alpha.6
- 本轮结论：扩展 Table Presentation；不建立封闭 CellContent registry 或 feature-package 依赖

## 不在本 ADR 范围

- formatter、conditional rule、theme、badge/dataBar/sparkline
- 内容 intrinsic / constrained measurement、bounds-aware alignment、fit、clip 或 overflow
- Cell padding、border 与 span

---

## 实现契约（必填）🔻

### Level

`red`：新增公开 Cell payload schema、Presentation Definition 与 runtime dispatch。

### Schema 改动

| 文件                             | 操作 | 字段名         | 类型                                    | 默认值 | describe 中文摘要          |
| -------------------------------- | ---- | -------------- | --------------------------------------- | ------ | -------------------------- |
| `schemas/cell/payload.ts`        | 新增 | `kind`         | `'value' \| 'content'`                  | —      | Cell payload 判别          |
| 同上                             | 新增 | `value`        | `ScalarValueSchema`                     | —      | value payload scalar       |
| 同上                             | 新增 | `presentation` | `TablePresentationRefSchema.optional()` | text   | value presentation 引用    |
| 同上                             | 新增 | `content`      | Core `ChildSchema`                      | —      | 直接 Core / Tier 2 内容    |
| `schemas/presentation/schema.ts` | 新增 | `name`         | 非空字符串                              | —      | presentation provider name |
| 同上                             | 新增 | `options`      | `JsonObjectSchema.optional()`           | —      | provider JSON options      |

### 文件 scope

- `packages/viz/table/src/schemas/cell/payload.ts`
- `packages/viz/table/src/schemas/presentation/**`
- `packages/viz/table/src/contract/presentation/**`
- `packages/viz/table/src/providers/presentation/{text,definitions,registry,index}.ts`
- `packages/viz/table/src/pipeline/presentation/**`
- 对应 owner barrels 与包根导出
- `packages/viz/table/tests/{ir,presentation}/**`

### 测试象限

**Happy path**：五种 Data scalar；direct Core Node；direct nested composite；custom provider。

**边界**：空字符串；null；空 options；局部原点内容。

**错误路径**：非 scalar value；非法 content；未注册 name；重复/内置冲突 key；options schema 失败。

**交互**：manual payload 与 list runtime value 共用 presentation；custom output 进入 ADR-04 layout；nested composite 由 Core 递归 lowering。

### 依赖的现有元素

- `ChildSchema`、`IRChild`、`JsonObjectSchema`、`NodeSchema`（`@retikz/core`）——内容与 JSON 边界
- `ScalarValueSchema`、`IRDataScalarValue`（`@retikz/data`）——value payload
- `defineComposite` 递归 expansion——direct nested Tier 2 由 Core 消费，不在 Table dispatch
