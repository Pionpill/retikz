# ADR-01：Table composite 根节点与外部数据边界

- 状态：Proposed
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Table 家族已经确定为与 Plot 平行的 Tier 2 能力，但当前只有包级 `AGENTS.md`，没有 npm package、Table IR 或 Core composite 注册入口。若先从 React 组件或 renderer 输出开始，会形成 adapter 私有表格模型，无法被 Vanilla、AI JSON 生成与其它 renderer 复用。

Core 已提供 `CompositeBaseSchema`、`CompositeDefinition` 与递归 composite lowering；Data 已提供 `DataReferenceSchema` 与 `ExternalDatasets`。Table 应直接复用这两条现有边界：IR 只记录外部数据引用，运行时 datasets 经 lowering options 注入。

## 决策：建立 JSON-safe TableSpec composite 根节点

新增 `@retikz/table` package scaffold，并定义根节点：

```ts
type IRTableSpec = {
  namespace: 'table';
  type: 'table';
  id?: string;
  data?: IRDataReference;
  structure: IRTableStructureOperation;
  layout?: IRTableLayout;
  meta?: IRJsonObject;
};
```

字段契约：

- `namespace` 固定为 `table`，交给 Core composite registry 路由
- `type` 固定为 `table`，不为 manual/list/pivot 建立多个根 composite
- `id` 是 Table 外部身份；存在时 lowering 根 Scope 使用同一 id
- `data` 只保存 `IRDataReference`，实际 rows 不进入 IR
- `structure` 引用 ADR-02 的开放结构 operation
- `layout` 引用 ADR-04 的布局 spec；省略时由 pipeline 使用基础固定轨道默认值
- `meta` 复用 Core `JsonObjectSchema`，只承载 JSON-safe opaque metadata

`TableSpecSchema.superRefine` 对 alpha.1 内置结构执行：

- `kind: 'list'` 必须存在 `data`
- `kind: 'manual'` 不消费 `data`；若提供则拒绝，避免未使用数据产生错误预期
- 自定义 structure 的数据要求由对应 `TableStructureDefinition` 在 pipeline 校验

包版本从 `0.1.0-alpha.1` 起，三个 Table 包使用 `releaseGroup: "table"` lockstep；本 ADR 只初始化核心 `@retikz/table`，两个 adapter 由 ADR-06 初始化。

`@retikz/table` 标记 `domain: "viz"`、`releaseGroup: "table"`、`layer: "feature"`、`publishable: true`；运行依赖固定为 `@retikz/core` / `@retikz/data` / `@retikz/math` 的 `workspace:^` 与 `zod: "catalog:"`。

实现顺序上，本 ADR 在 ADR-02 的 structure schema 与 ADR-04 的 layout schema 之后落地；编号只表示从根契约开始阅读。alpha.1 也不会在 ADR-06 的 adapter 与双语文档闭环前独立发布。

package scaffold 同时完成首阶段仓库治理接入；ADR-01 先以单成员建立 group，ADR-06 在 adapter package 出现的同一改动中扩成最终三成员，避免 release-group 配置引用尚不存在的 package：

- `scripts/release-groups.config.mjs` 注册 feature group `table` 与 `@retikz/table`
- 根 `lint:viz`、`typecheck:viz`、`test:viz`、`coverage:viz` 先加入 `@retikz/table`
- `scripts/publish-artifact-limits.json` 在首次 build + pack 后通过现有 update-limits 流程写入核心 package 的实测预算
- `scripts/check-release-groups.test.mjs` 先验证 Table feature group；最终三包同组依赖测试由 ADR-06 扩展
- `packages/viz/AGENTS.md` 与 `notes/architecture/capability-design.md` 从“未来 Table”更新为已建立的 Table 能力域、主责包与协作包

理由：

1. 单一根 composite 让所有表格结构共享同一 pipeline、layout 与 lowering
2. 数据外置保持 IR 体积稳定，并与 Plot / Data 现有契约一致
3. 根 schema 只表达领域配置，不把 runtime、renderer 或 ReactNode 带入 IR

`meta` 完全沿用 Core opaque JSON 语义，不预留 Table 私有 key。custom structure 缺数据或输入不合法时由 ADR-02 pipeline 以 `table:` 前缀的 `Error` fail-loud，不进入非阻断 diagnostics。

## DSL 表面

```ts
const spec: IRTableSpec = {
  namespace: 'table',
  type: 'table',
  id: 'sales-table',
  data: { reference: 'sales' },
  structure: {
    kind: 'list',
    columns: [
      { id: 'product', field: 'product', header: { kind: 'value', value: 'Product' } },
      { id: 'revenue', field: 'revenue', header: { kind: 'value', value: 'Revenue' } },
    ],
  },
};
```

## 测试设计

`packages/viz/table/tests/ir/table-spec.test.ts` 覆盖：

- manual 根节点无 data 可通过
- list 根节点带外部 data reference 可通过
- 缺 namespace / type / structure 被拒绝
- 非 `table.table` 判别值被拒绝
- list 缺 data 被拒绝
- manual 携带 data 被拒绝
- data 中实际 rows 或函数无法进入 schema
- meta 只接受 JSON-safe 值

## 影响

- 新增 Table 核心 package scaffold 与公开 IR 根类型
- 新增 `table` release group，并先把核心包纳入 viz 全仓脚本、发布产物预算与 release-group 测试；ADR-06 完成最终三包集合
- 复用 `@retikz/core` composite / JSON schema 和 `@retikz/data` data reference，不修改上游
- `pnpm-workspace.yaml` 已由 `packages/*/*` glob 覆盖，无需修改 workspace 列表
- 用户文档入口与可运行 demo 由 ADR-06 在 alpha.1 闭环时统一建立；本 ADR 未单独形成可运行用户能力
- ⚠️ 新公开 package 尚无兼容负担，但字段一旦人工确认即成为 v0.1 alpha 契约

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / 根 IR 与 Data Consumption
- 解决的问题：为所有 Table 结构提供统一、可序列化、可 lowering 的根入口
- 主责包与协作包：`@retikz/table` 主责；Data 提供引用，Core 提供 composite
- 是否可由现有能力组合：Core composite 与 DataReference 可复用，但 Table 根语义必须扩展当前域
- 是否需要下沉：不修改 Data / Core；任意内容测量另由 alpha.2 gating
- 内部表达链路：TableSpecSchema → structure/layout schema → table pipeline
- 外部扩展链路：structure 字段进入 ADR-02 Definition / registry
- pipeline / lowering 与下游消费：ADR-05 注册 `lowerTables`，renderer 只接收 Core IR
- React / Vanilla adapter 等价性：ADR-06 消费同一 IRTableSpec
- provenance / lineage / locator：根 id / data reference 从首版保留；完整 artifact 在 alpha.6
- 本轮结论：扩展 Table 域；不在 adapter 或 renderer 建立根模型

## 不在本 ADR 范围

- manual/list 具体字段与 SemanticTableModel
- Cell presentation、layout、lowering 与 adapter
- data transform、group、pivot、span、border、fragmentation

---

## 实现契约（必填）🔻

### Level

`red`：新增 package、公开 Table IR schema 与包根导出。

### Schema 改动

| 文件                                             | 操作 | 字段名      | 类型                             | 默认值            | describe 中文摘要           |
| ------------------------------------------------ | ---- | ----------- | -------------------------------- | ----------------- | --------------------------- |
| `packages/viz/table/src/schemas/table/schema.ts` | 新增 | `namespace` | `z.literal('table')`             | —                 | Table Tier 2 namespace 判别 |
| 同上                                             | 新增 | `type`      | `z.literal('table')`             | —                 | Table composite type 判别   |
| 同上                                             | 新增 | `id`        | `z.string().min(1).optional()`   | —                 | 可选稳定 Table id           |
| 同上                                             | 新增 | `data`      | `DataReferenceSchema.optional()` | —                 | 外部数据集引用              |
| 同上                                             | 新增 | `structure` | `TableStructureOperationSchema`  | —                 | 表格结构 operation          |
| 同上                                             | 新增 | `layout`    | `TableLayoutSchema.optional()`   | pipeline 基础默认 | 表格布局配置                |
| 同上                                             | 新增 | `meta`      | `JsonObjectSchema.optional()`    | —                 | opaque JSON metadata        |

所有 `.describe(...)` 使用英文并说明 IR / runtime 边界。`IRTableSpec` 由 `z.infer<typeof TableSpecSchema>` 派生。

### 文件 scope

- `packages/viz/table/package.json`、`tsconfig.json`、`vite.config.ts`、`README.md`、`LICENSE`
- `packages/viz/table/src/index.ts`
- `packages/viz/table/src/schemas/index.ts`
- `packages/viz/table/src/schemas/table/{constants,schema,types,index}.ts`
- `packages/viz/table/tests/ir/table-spec.test.ts`
- `packages/viz/table/tests/deps-guard/package-boundary.test.ts`
- `scripts/release-groups.config.mjs`
- `scripts/check-release-groups.test.mjs`
- `scripts/publish-artifact-limits.json`
- 根 `package.json`
- `packages/viz/AGENTS.md`
- `notes/architecture/capability-design.md`

### 测试象限

**Happy path**：manual root；list + data reference；id/meta 保留。

**边界**：最短非空 id/reference；layout 省略；custom structure JSON payload 由 ADR-02 schema 接受。

**错误路径**：错误判别值；list 缺 data；manual 多余 data；非 JSON meta。

**交互**：根 schema 与 ADR-02/04 schema 组合；Core `defineComposite` 可注册 `table.table` schema。

**仓库治理**：release-group 校验识别核心 Table package；viz scripts 覆盖核心包；publish artifact checker 存在核心包预算；ADR-06 扩展后三包检查仍通过。

### 依赖的现有元素

- `CompositeBaseSchema`、`JsonObjectSchema`、`IRChild`（`@retikz/core`）——复用 Tier 2 与 JSON 边界
- `DataReferenceSchema`、`IRDataReference`、`ExternalDatasets`（`@retikz/data`）——复用外部数据契约
- `defineRetikzLibraryConfig`（`config/vite/library-config.ts`）——镜像现有 viz library 构建
