# ADR-03：Cell selector、rule 与确定性级联

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Table grammar 把 Rules 与 Structure、Presentation、Layout 分开。作者需要按 Cell 地址、行列、语义位置、角色、来源字段或值覆盖 formatter、presentation 与 appearance，而不把条件逻辑复制进 detail/manual structure 或 custom presentation callback。

Selector 必须 JSON-safe、可持久化且对未来 group / pivot canonical model 可复用。函数 predicate、整行 datum callback 或 DOM state 会破坏 IR；从 lowering 后 Core primitive 反查 Cell 又会丢失语义 identity。

Rule 的覆盖顺序也必须明确。按“选择器具体度”自动排序会产生隐藏优先级，并在未来增加 selector 字段时改变旧表行为；对象深合并若没有字段级规则，也会让背景、内容默认和四侧 border 出现不一致。

## 决策：以 canonical Cell 元数据匹配，按声明顺序级联

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

契约如下：

- selector 至少声明一个除 `negate` 外的条件
- 每个数组非空、元素唯一；id / field 为非空字符串，index 为非负整数
- 同一字段数组内部使用 membership OR；不同字段之间使用 AND
- `roles.any` 至少命中一个，`roles.all` 必须全部存在；roles object 至少声明一项
- `fields` 只匹配 `source.kind === 'field'` 的 field；不读取 dataset row
- `payloadKinds` 显式匹配 canonical payload 的 `value` / `content` discriminator；因此可安全表达“所有 value Cell，包括 raw null”或“所有 direct content Cell”
- `value` 只对 value Cell 的 raw scalar 求值；若同时声明 `payloadKinds`，schema 要求其精确为 `['value']`
- `value` 存在时，value payload 是 selector 的求值域；content Cell 不进入最后的 `negate`，因此 `{ value: predicate, negate: true }` 不会反选 content Cell
- 在上述求值域内，所有条件求值后再应用 `negate`

`TableCellSourceKind` / `TableCellSourceKindValue` 从 `contract/structure/output.ts` 下移到无依赖的 `shared/cell-source.ts`，source runtime schema、rule schema、structure providers、normalize 与 lower 都从 shared owner / barrel 消费同一词汇。`TableCellSourceKindValue` 使用本地 indexed-access 推导，不让 shared 依赖 Core `ValueOf`。包根继续直接导出这两个公开符号，不由 contract 或 schema 转手导出。`TableCellPayloadKind` / `TableCellPayloadKindValue` 继续由 canonical payload schema 拥有，rule schema 从 Cell schema owner 精确复用。

`fields` 只承诺匹配当前 canonical `field` source。未来 group / pivot 若产生 aggregate 或派生来源，必须先扩展 canonical source vocabulary 与 lineage，再决定是否具有 field 语义；本 ADR 不让 `generated.structureKind` 自动继承 field selector。

不提供嵌套 `and` / `or` selector tree。数组表达同维度 OR，多条 rule 表达跨条件 OR；这能保持 JSON 与诊断平直。未来若有不能拆成多 rule 的真实需求，再独立扩展。

### Value predicate

```ts
type IRTableValuePredicate =
  | { kind: 'equal'; value: IRDataScalarValue }
  | { kind: 'oneOf'; values: Array<IRDataScalarValue> }
  | {
      kind: 'compare';
      operator: 'lt' | 'lte' | 'gt' | 'gte';
      value: string | number;
    }
  | {
      kind: 'between';
      min: string | number;
      max: string | number;
      includeMin?: boolean;
      includeMax?: boolean;
    }
  | { kind: 'null'; isNull?: boolean };
```

- `equal` / `oneOf` 使用 JSON scalar 的严格相等语义（`===`）；schema 已拒绝 NaN / Infinity，`-0` 与 `0` 按 JSON round-trip 后的同一数值处理
- `compare` 要求 raw value 与 operand 同为 number 或同为 string；类型不一致是不匹配，不做 coercion
- `between` 要求 min/max 同型且 `min <= max`；两个 include 字段默认 `true`
- `null.isNull` 默认 `true`；`false` 匹配任意非 null scalar
- string compare 使用 ECMAScript relational comparison 的 UTF-16 code-unit 顺序，不读取 locale

Predicate 是 Table selector 的闭合正确性合同，不开放 runtime predicate registry。需要业务函数的宿主应先把结果变成数据字段或显式 Table value，不能把函数写进 IR。

### Rule schema

```ts
type IRTableCellRule = {
  selector: IRTableCellSelector;
  formatter?: IRTableFormatterRef;
  presentation?: IRTablePresentationRef;
  appearance?: IRTableCellAppearance;
};
```

rule 至少声明 formatter、presentation、appearance 中一项。Table root 增加：

```ts
type IRTableSpec = {
  // existing fields
  rules?: Array<IRTableCellRule>;
};
```

`rules` 省略等价于空数组。规则按数组声明顺序逐条求值；所有匹配项都应用，不计算 specificity，也不短路。

### 级联与 merge

alpha.3 的基础级联顺序固定为：

```text
built-in empty appearance + identity formatter + text presentation
  < structure / explicit Cell formatter, presentation and layout.borders
  < matching root rules in declaration order
```

ADR-05 在最前加入 selected theme rules，ADR-04 在 explicit Cell 与 root rules 之间加入 ordered encodings；两者都不得重新解释 explicit Cell 与 root rule 的相对顺序。

- formatter / presentation 使用 last-specified-wins
- background 以完整对象为单位 last-specified-wins
- content appearance 按 Core Scope 顶层字段逐项 last-specified-wins；`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` 各自再按字段合并
- borders 按 top / right / bottom / left 逐侧 last-specified-wins：theme appearance < semantic Cell `layout.borders` < root rule appearance。`{ kind: 'none' }` 是普通显式候选，后出现的 none 清除先前 line，后出现的 line 也可覆盖先前 none
- merge 产生新 detached frozen value，不修改 rule、theme 或 semantic model

rule formatter / presentation 只适用于 value Cell。若 selector 匹配 content Cell 且 rule 声明其中任一字段，pipeline fail-loud，并报告 rule index 与 Cell id；不静默忽略。appearance 可用于两类 Cell。

规则解析产生内部 `ResolvedTableCellPlan`：

```ts
type TableCellPlanSource =
  | { kind: 'default' }
  | { kind: 'structure' }
  | { kind: 'theme'; source: 'definition' | 'override'; ruleIndex?: number }
  | { kind: 'encoding'; encodingId: string }
  | { kind: 'rootRule'; ruleIndex: number };

type ResolvedTableCellPlan = Readonly<{
  cellId: string;
  formatter: IRTableFormatterRef;
  presentation: IRTablePresentationRef;
  appearance: DeepReadonly<IRTableCellAppearance>;
  trace: Readonly<{
    formatter: TableCellPlanSource;
    presentation: TableCellPlanSource;
    appearance: Readonly<Record<string, TableCellPlanSource>>;
    matchedRuleIndices: ReadonlyArray<number>;
  }>;
}>;
```

`TableCellPlanSource` 是闭合内部 lineage，区分 `default`、`structure`、theme definition / override、`encoding` 与 `rootRule`，并分别携带适用的 rule index 或 encoding id。`appearance` trace 使用规范 JSON Pointer 记录最终获胜叶字段；background 记录 `/background`，content 记录到最终 leaf，border 记录 `/borders/top|right|bottom|left`。它记录 winner，不用候选集合代替最终来源。

plan 与 semantic Cells 等长同序，供 formatter、visual encoding、presentation、layout 与 manifest 继续消费。ADR-04 / ADR-05 只填充已预留的 encoding / theme source，不改变 trace 结构；ADR-06 再决定 manifest 中的公开压缩形态。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: detailStructure,
  rules: [
    {
      selector: { locations: ['columnHeader'] },
      appearance: {
        content: { nodeDefault: { font: { weight: 600 } } },
      },
    },
    {
      selector: {
        fields: ['revenue'],
        value: { kind: 'compare', operator: 'lt', value: 0 },
      },
      formatter: { name: 'number', options: { specifier: '$,.2f' } },
      appearance: {
        content: { nodeDefault: { textColor: '#b42318' } },
      },
    },
  ],
};
```

## 测试设计

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-03.md`。长期摘要：

- selector 覆盖 identity、index、location、roles、source field、payload kind、raw value 与 negate 求值域
- value predicate 覆盖 scalar 类型、边界、null 与不做 coercion / locale compare
- cascade 覆盖声明顺序、field-level merge、explicit Cell border precedence、双向显式清除与 immutable inputs
- resolved plan 对 formatter、presentation 与 appearance leaf 记录最终 winner
- formatter / presentation 对 content Cell 的非法覆盖 fail-loud
- manual / detail / custom structure 在相同 canonical model 上得到相同 rule 语义

## 影响

- `TableSpecSchema` 增加 `rules`
- source kind vocabulary 下移到 shared，contract source schema 与 rule schema 同源消费
- 新增 selector / predicate / rule schema 与纯 matcher / cascade pipeline
- formatter 阶段改为消费 resolved Cell plan 选出的 ref
- Presented / manifest trace 后续记录 matched rule indices
- adapters 只透传 root rules，不提供函数 callback 或私有 CSS selector

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Rules、Cell Semantics、Presentation
- **解决的问题**：按 Table canonical identity 与 raw value 对 Cell 呈现做可持久化覆盖
- **主责包与协作包**：Table 主责 selector / rule；Data 只提供 scalar；adapters 只 author
- **是否可由现有能力组合**：canonical model 已提供地址/角色/来源，但缺少 JSON selector 与级联，需要扩展当前域
- **是否需要下沉**：不下沉 Data / Core；selector 是 Table Cell 语义
- **内部表达链路**：selector matcher → ordered rules → resolved plan → formatter / presentation / appearance
- **外部扩展链路**：selector/predicate 闭合；开放语义通过 formatter/presentation/encoding definitions，而非函数 selector
- **下游执行 / adapter 等价性**：同一 IR rules 在 React / Vanilla 共用 Table pipeline
- **不支持边界与诊断**：不读整行 datum、不读 Scene/DOM、不自动 specificity；非法 content rewrite fail-loud
- **本轮结论**：扩展 Table Rules 域，复用 canonical model，不建立 adapter selector

## 不在本 ADR 范围

- nested Boolean selector、regex、locale compare 与任意函数 predicate
- hover / selected / active 等 runtime state selector
- layout / span / track 修改
- conditional visual scale 与 Legend descriptor
- theme rules 的注册与 precedence

---

## 实现契约

### Level

`red`：新增 public TableSpec schema、selector/rule API 与 pipeline 阶段。

### Schema 改动

| 文件                      | 操作 | 字段名          | 类型                                | 默认值       | describe 中文摘要              |
| ------------------------- | ---- | --------------- | ----------------------------------- | ------------ | ------------------------------ |
| `schemas/rule/schema.ts`  | 新增 | selector fields | nonempty unique arrays / predicate  | —            | canonical Cell 选择条件        |
| 同上                      | 新增 | `payloadKinds`  | nonempty unique payload kind array? | —            | value/content payload 选择条件 |
| 同上                      | 新增 | `formatter`     | formatter ref?                      | —            | 匹配后的 formatter 覆盖        |
| 同上                      | 新增 | `presentation`  | presentation ref?                   | —            | 匹配后的 presentation 覆盖     |
| 同上                      | 新增 | `appearance`    | Cell appearance?                    | —            | 匹配后的视觉覆盖               |
| `schemas/table/schema.ts` | 新增 | `rules`         | rule array?                         | `[]` runtime | ordered root rules             |

### 文件 scope

- `packages/viz/table/src/shared/{cell-source,index}.ts`
- `packages/viz/table/src/schemas/{rule,table}/**`
- `packages/viz/table/src/contract/{model,structure}/**`
- `packages/viz/table/src/providers/structure/{detail,manual}.ts`
- `packages/viz/table/src/pipeline/{rule,presentation,manifest}/**`
- `packages/viz/table/src/pipeline/normalize/validate.ts`
- `packages/viz/table/src/pipeline/lower/meta.ts`
- `packages/viz/table/src/{schemas,contract,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,rule,presentation,manifest,public-api}/**`
- React / Vanilla root authoring types、runtime passthrough 与 parity tests
- alpha.3 对应 docs 文件（ADR-07）

### 测试象限

**Happy path**

- id/index/location/role/field/payload kind/value selector 分别命中预期 Cell
- 多条件 AND、数组 membership OR、negate 产生确定集合
- 多条匹配 rule 按声明顺序覆盖 refs 并合并 appearance

**边界**

- row/column index 0、null predicate、空 string value 与 false 均可区分
- payloadKinds value 匹配含 null 的所有 value Cell，content 匹配 direct content
- negated value predicate 不会把 content Cell 纳入结果
- between 两端相等、include flags、UTF-16 lexical compare
- future custom location/role 仍由 schema vocabulary 和 canonical metadata 控制

**错误路径**

- 空 selector、空/重复数组、空 rule、非法 predicate / reversed range 被 schema 拒绝
- value predicate 与包含 content 的 payloadKinds 组合被 schema 拒绝
- content Cell 被 formatter/presentation rule 命中时带 rule index / cellId 失败
- 内部 plan 与 semantic identity 不一致时 fail-loud

**交互**

- root rule 覆盖 detail column / manual Cell 的 formatter / presentation
- theme / explicit Cell / root rule border 的逐侧 precedence；later none 清 line、later line 覆盖 none
- trace 对 formatter / presentation / appearance 每个最终字段指向真正 winner
- rule 选择 raw value，不受 number formatter 输出影响
- manual/detail/custom 相同 canonical model 的 selector 结果一致

### 依赖的现有元素

- `SemanticTableCell` / `TableCellSource` / location / roles / row / column identity
- shared `TableCellSourceKind` 与 schema-owned `TableCellPayloadKind`
- ADR-01 formatter ref 与 `TableCellContext`
- ADR-02 appearance schema
- existing `deepFreeze()` 与 schema-derived public types
