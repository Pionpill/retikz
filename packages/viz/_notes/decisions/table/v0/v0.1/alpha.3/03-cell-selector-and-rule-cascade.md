# ADR-03：Cell selector、rule 与确定性级联

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景与目标

作者需要按 Cell 地址、行列、语义位置、角色、来源字段或 raw value 覆盖 formatter、presentation 与 appearance，而不把条件逻辑复制进 structure 或 custom presentation。该能力必须 JSON-safe、可持久化，并在 manual、detail、custom 及未来 canonical structures 上保持同一语义。

本 ADR 同时冻结 selector 的求值域、ordered rule cascade 与字段级 merge。它不按 specificity 隐式排序，也不从 lowering 后的 Core primitive 反查 Cell。

## 决策

### Cell selector

```ts
type IRTableCellSelector = {
  cellIds?: Array<string>;
  rowIds?: Array<string>;
  columnIds?: Array<string>;
  rowIndices?: Array<number>;
  columnIndices?: Array<number>;
  locations?: Array<TableCellLocationValue>;
  roles?: {
    any?: Array<TableCellRoleValue>;
    all?: Array<TableCellRoleValue>;
  };
  sourceKinds?: Array<TableCellSourceKindValue>;
  fields?: Array<string>;
  payloadKinds?: Array<TableCellPayloadKindValue>;
  value?: IRTableValuePredicate;
  negate?: boolean;
};
```

- selector 至少声明一个除 `negate` 外的条件
- 每个数组非空且元素唯一；id/field 非空，index 为非负整数
- 同一字段数组为 membership OR，不同字段之间为 AND
- row/column id 与 index 只匹配 span Cell 的 origin，不匹配被覆盖轨道
- `roles.any` 命中任一项，`roles.all` 要求全部存在
- `fields` 只匹配 canonical field source，不读取 dataset row
- `payloadKinds` 显式匹配 value/content discriminator
- `value` 只在 value Cell raw scalar 求值；若与 `payloadKinds` 并用，后者必须精确为 `['value']`
- content Cell 不进入 value predicate 的 negate 域；`{ value, negate: true }` 不会反选 content Cell
- 所有条件求值完成后再应用 `negate`

不提供嵌套 `and`/`or` 树。数组表达同维度 OR，多条 rule 表达跨条件 OR；需要业务函数的宿主应先把结果变成字段或显式 Table value。

### Value predicate

```ts
type IRTableValuePredicate =
  | { kind: 'equal'; value: IRDataScalarValue }
  | { kind: 'oneOf'; values: Array<IRDataScalarValue> }
  | { kind: 'compare'; operator: 'lt' | 'lte' | 'gt' | 'gte'; value: string | number }
  | { kind: 'between'; min: string | number; max: string | number; includeMin?: boolean; includeMax?: boolean }
  | { kind: 'null'; isNull?: boolean };
```

`equal`/`oneOf` 使用 JSON scalar 严格相等；compare 要求 raw value 与 operand 同为 number 或同为 string，类型不同只是不匹配，不 coercion。between 两端同型且 `min <= max`，include flags 默认 true。`null.isNull` 默认 true；false 匹配任意非 null scalar。string comparison 使用 ECMAScript UTF-16 relational order，不读取 locale。

Predicate 是闭合正确性合同，不建立 runtime predicate registry。

### Rule 与声明顺序

```ts
type IRTableCellRule = {
  selector: IRTableCellSelector;
  formatter?: IRTableFormatterRef;
  presentation?: IRTablePresentationRef;
  appearance?: IRTableCellAppearance;
};

type IRTableSpec = {
  rules?: Array<IRTableCellRule>;
};
```

每条 rule 至少声明一个输出字段。`rules` 省略等价空数组，authoring schema 不物化默认。规则按数组声明顺序逐条求值，所有匹配项都应用，不计算 specificity，也不短路。

rule formatter/presentation 只适用于 value Cell。若匹配 content Cell 且声明其中任一字段，pipeline 必须报告 rule index 与 Cell id 并 fail-loud；appearance 可用于两类 Cell。

### 级联与 merge

alpha.3 的完整优先级由 ADR-04/05 补齐，本 ADR 冻结其稳定骨架：

```text
defaults < style tokens < structure / explicit Cell < ordered encodings < ordered root rules
```

- formatter/presentation 为 last-specified-wins
- background 作为完整对象替换
- content 的公开 Core Scope 顶层字段逐项覆盖；paint、tuple、array、discriminated object 与 `resetStyle` array 均整体替换
- node/path/label/arrow default 按各自顶层字段覆盖；其中 `font` 只按 family/size/weight/style 逐叶合并
- borders 按 top/right/bottom/left 逐侧覆盖；`none` 与 `line` 都是普通显式候选，后者可双向替换前者
- merge 产生 detached frozen value，不修改 authoring input 或 canonical model

### 稳定 lineage 契约

winner trace 使用唯一的闭合公开 source union，随真实消费链路演进：

```ts
type TableCellPlanSource =
  | { kind: 'default' }
  | { kind: 'styleToken'; key: TableStyleTokenKey; source: 'preset' | 'user' }
  | { kind: 'structure' }
  | { kind: 'encoding'; encodingId: string }
  | { kind: 'rootRule'; ruleIndex: number };
```

Appearance trace path 是当前 merge tree 叶级字段的闭合 JSON Pointer vocabulary，包括 background leaf、content 原子 leaf、default 顶层字段、font leaf 与四侧 border。未知路径、父对象路径和被整体替换后残留的 stale path 都 fail-loud。trace 只记录最终 winner；matched rule indices 另按声明顺序保存，不用候选集合冒充 winner。

该 source/path contract 是 public lineage output，不是 authoring IR。后续 manifest 直接复用同一 schema/type，不复制第二套 union。

## DSL 表面

```ts
const rules = [
  {
    selector: { locations: ['columnHeader'] },
    appearance: { content: { nodeDefault: { font: { weight: 600 } } } },
  },
  {
    selector: {
      fields: ['revenue'],
      value: { kind: 'compare', operator: 'lt', value: 0 },
    },
    formatter: { name: 'number', options: { specifier: '$,.2f' } },
    appearance: { content: { color: '#b42318' } },
  },
];
```

## 功能与包边界

- Table 拥有 canonical Cell selector、predicate、rule、merge 与 lineage
- Data 只提供 scalar contract，不执行 Table predicate
- Core 提供 appearance 所复用的 style vocabulary，不理解 Table selector
- adapters 只 author/透传 JSON rules，不提供函数 selector、CSS selector 或 DOM state

## 兼容性与影响

- `TableSpec` additive 增加 `rules`
- formatter/presentation ref 可被 ordered rule 覆盖
- source-kind vocabulary 必须由无依赖 owner 统一提供，避免 structure/rule/lineage 各自定义
- manifest 后续公开 matched rule indices 与 leaf winner source

## 测试策略摘要

- schema/predicate 证明闭合输入、AND/OR、origin、payload/value domain、null、边界与不 coercion
- cascade 证明声明顺序、显式清除、字段/逐侧 merge、immutable inputs 与 stale trace 清理
- pipeline 证明 value/content 失败语义、canonical identity/order 和 raw-value 选择
- structure/adapter parity 证明 manual、detail、custom、React、Vanilla、SSR 共享同一语义

详细 case、路径、命令和正式证据位于对应 ignored mirror plan 的 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Rules、Cell Semantics、Presentation
- **问题归属**：selector 读取 Table canonical identity，属于 Table 而非 Data/Core/adapter
- **内部闭环**：selector → ordered rules → final refs/appearance → formatter/presentation/layout → lineage
- **扩展边界**：selector/predicate 闭合；开放行为继续经过 formatter/presentation/scale definitions
- **结论**：扩展 Table Rules 域，不建立 adapter selector 或 renderer 反查机制

## 被否决方案

- 函数 predicate 或整行 datum callback：破坏 JSON IR 与 SSR
- specificity 自动排序：未来增加 selector 字段会隐式改变旧表优先级
- 任意 deep merge：无法稳定定义 structured paint、tuple、array 与 discriminated union
- 从 Core primitive 反查 Cell：lowering 后已丢失 Table 语义 identity

## 不在本 ADR 范围

- nested Boolean selector、regex、locale compare 与任意函数 predicate
- hover/selected/active 等 runtime state selector
- layout/span/track 修改
- conditional visual scale 与 Legend 呈现
- 用户注册 selector field 或 token consumer
