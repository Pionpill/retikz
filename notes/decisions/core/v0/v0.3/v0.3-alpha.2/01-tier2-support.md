# ADR-01：Tier 2 支撑——领域节点 schema + 可注册的 lowering 管线

- 状态：Proposed
- 决策日期：2026-06-01
- 更新：2026-06-02 ①路径对齐 monorepo 重组；②范围收窄（延后项拆入 [ADR-02](./02-composite-authoring-context-cache.md)）；③**类型重设计**——Tier 2 节点是**像 Node 一样的一等领域节点**（自定义完整 zod schema + 字段一等 + 每字段 describe）；**判别靠「有无 `namespace`」：tier2 必有 `namespace`，tier1 没有**（core4 零改动）；`ChildSchema = union(core4 discriminatedUnion + 开放 tier2 节点)`；注册项 `{ namespace, type, schema, expand }`，`expand` 收 `schema.parse` 后的强类型节点
- 关联：[ADR-02 Tier 2 延后项](./02-composite-authoring-context-cache.md) · [v0.3 roadmap §alpha.2](../roadmap.md) · [core-design.md §4.3 Tier 2 / Composite](../../../../../architecture/core-design.md) · [plot-design.md](../../../../../architecture/plot-design.md) · [alpha.1 ADR-01~04](../v0.3-alpha.1/) · [v0.2-alpha.3 ADR-01 shape-registry](../v0.2/v0.2-alpha.3/01-shape-registry.md)（registry 模式参照）

> **打包变更（2026-06-01，[../v0.3-alpha.1/05-renderer-repackage.md](../v0.3-alpha.1/05-renderer-repackage.md)）**：renderer 已合并为 `@retikz/render`；本 ADR「renderer 零源码改动」对应 `@retikz/render/{svg,canvas}` 子路径，对照测试落 `packages/core/render/tests/`。
>
> **范围（收窄后）**：alpha.2 把 core-design §4.3 的 Tier 2 / Composite 接入面**落地成可注册的展开管线**：domain 包注册「Tier 2 节点 schema + 展开（lowering）函数」，`compileToScene` 据注册表把 Tier 2 节点展开成 Tier 1 Kernel。本轮交付 **core 基础设施 + 示例 fixture 验证端到端 + react/vanilla 透传**；Tier 2 节点本轮经 `<Layout ir={…}>` 直喂 / AI / fixture 进入。`@retikz/plot` 是首个消费者，但**本 ADR 不实现 plot 本体**。

## 背景

现状(2026-06-01 摸底):

- **`lowerComposites` 未落地**:`CompileOptions`(`packages/core/core/src/compile/compile.ts:104`)无 `composites`;`compileToScene` 内部不调用任何 Tier 2 下沉。
- **IR 装不下 Tier 2**:`ChildSchema`(`packages/core/core/src/ir/scene.ts:18`)是严格 4-way `discriminatedUnion([Node, Path, Coordinate, Scope])`,Tier 2 高层节点无法进 IR。
- **可复用机制**:① registry 模式成熟(`shapes`/`arrows`/…「注入 merge + 查表失败 throw」);② `zIndex` 旁路稳定排序;③ anchor / coordinate / locator 定位完整。
- **不该进 core**:`dataRef` / `scale registry` / `encoding`(plot 包负责)。

Tier 2 支撑的本质:**让 IR 携带「core 不认识的领域高层节点」,compile 第一步用注册表把它们展开成 Tier 1**——展开后布局 / anchor / zIndex / renderer 全自动复用,core 仍零 chart 语义。

## 设计要点

1. **Tier 2 节点 = 一等领域节点**:像 `Node` 一样有自己**完整的 zod schema**(字段一等、每字段 `.describe()`),不裹 `props`;core 导出 `CompositeBaseSchema`(定义必填 `namespace` / `type`),domain schema 用 zod `.extend()` **继承/组合**它再收窄 literal + 加字段。schema 由 domain 包定义并注册,是 LLM 契约的一部分。
2. **判别靠「有无 `namespace`」**:**tier2 节点必有 `namespace`**(`plot` / `flow` …)+ `type`(namespace 内类型名,如 `axis`);**tier1 节点没有 `namespace`**(core4 保持现状、零改动),走 `type` discriminatedUnion。运行时 `'namespace' in node` 即判 tier2——干净互斥,无歧义。
3. **core 静态 schema 对 tier2 宽松**:AxisSchema 是 domain 包运行时注入,core 的 `ChildSchema` 只校验 tier2 节点「有 `namespace`+`type`」(passthrough);精确字段校验在 `lowerComposites` 用注册的 `schema.parse(node)`。
4. **展开是纯结构变换**:`expand(parsedNode) => Tier 1`,据节点字段不同产不同子树;定位靠展开产物的 anchor / coordinate 引用。
5. **递归到 fixpoint** + 深度(默认 32、可配)/ 环守卫。
6. **复用 zIndex / layer**:展开产物自动复用,无需新机制。
7. **未注册容错**:遇未注册的 `namespace/type` → `onWarn` 报错 + **跳过该节点**(不进 Scene),渲染其余;只有环 / 超深度才 throw。

## 选项 A（推荐）：领域节点 schema + `CompileOptions.composites` 注册表

```ts
// core 提供基础 schema 定义必填的 namespace/type；domain 用 zod .extend() 继承 + 加字段（DRY）
const CompositeBaseSchema = z.object({
  namespace: z.string().min(1).describe('Tier 2 domain namespace'),
  type: z.string().min(1).describe('Composite type name within the namespace'),
});

// domain 节点：extend 基础 + 把 namespace/type 收窄为 literal + 加字段（全带 describe，像 Node）
const AxisSchema = CompositeBaseSchema.extend({
  namespace: z.literal('plot').describe('Discriminator: this composite belongs to the plot namespace'),
  type: z.literal('axis').describe('Discriminator marking this child as an axis'),
  id: z.string().min(1).optional().describe('Optional id; required if a path references this axis by string'),
  orientation: z.enum(['horizontal', 'vertical']).describe('Axis orientation'),
  domain: z.tuple([z.number(), z.number()]).describe('Data domain [min, max]'),
  length: z.number().positive().describe('Axis pixel length'),
  ticks: z.union([z.literal('auto'), z.array(z.number())]).default('auto').describe('Tick values or auto'),
  // …更多字段，全部带 describe…
});

// 注册项：只需 schema + expand —— namespace/type 已在 schema 的 literal 里，core 提取、不重复写
type CompositeDefinition<T = unknown> = {
  schema: ZodType<T>;                         // 含 namespace/type literal（extend CompositeBaseSchema）+ 字段 + describe
  expand: (node: T) => IRChild | IRChild[];   // 收 schema.parse 后的强类型节点，产 Tier 1
};

compileToScene(ir, {
  composites: [axisDef, barsDef, …],
  maxCompositeDepth: 32,   // 可选，默认 32（嵌套 fixpoint / 环守卫上限）
});
```

IR / schema 落地（**tier1 core4 不动**——无 namespace 字段）:

```ts
// tier1：node/path/coordinate/scope 保持现状（无 namespace）
// tier2：CompositeBaseSchema.passthrough() —— core 静态只校验 namespace+type，精确字段校验在 lowerComposites
const CompositeNodeSchema = CompositeBaseSchema.passthrough();
// 判别天然互斥：tier1 无 namespace → 只能匹配 core4；tier2 有 namespace → 只能匹配 CompositeNodeSchema
const ChildSchema = z.union([
  z.discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema]),
  CompositeNodeSchema,
]);
```

`lowerComposites` 判别:遍历 IR,**`'namespace' in node` → tier2**(据 `${namespace}.${type}` 查表 → `def.schema.parse(node)` 精确校验 + 强类型 → `def.expand(parsed)` → 替换);否则 tier1(scope 递归 children)。递归到无 tier2 节点(fixpoint),带深度 / 环守卫;未注册 → `throw COMPOSITE_NOT_REGISTERED`。

代价:动 `ChildSchema`(union 化)是 red 改动;**core4 四类 schema 零改动**。

### 被否决的选项

- **B 单函数 `lowerComposites?: (ir)=>ir`**:无 per-type 注册 / 诊断 / schema 校验,与 roadmap「可注册管线」冲突。否决（A 内部可用它做底层）。
- **C adapter builder 期展开（当 Sugar）**:违反 core-design §4.3（Tier 2 必须 IR 之后展开、持久化），canvas / vanilla / SSR / AI 拿不到。否决。展开**始终在 core 的 `lowerComposites`**,不下放各框架。

## 决策：选 A

理由：

1. **唯一满足「可注册 + 可持久化 + 跨 renderer」三条**;展开在 compile 故所有 adapter 自动获得。
2. **Tier 2 节点是一等领域节点**——完整 schema + describe,LLM 生成 / 校验直接吃 schema,字段一等无 `props` 嵌套。
3. **与现有 registry 模式同构**;**renderer 零改动**。
4. **判别零破坏**:「有无 `namespace`」互斥分流——tier1 core4 完全不动,现有 IR / schema / 测试不受影响;tier2 必有 namespace。

## 各包分工（任务拆分）

> Tier 2 的全部"智能"在 **core 的展开管线**;renderer 不碰;runtime 只透传注册表。

### `@retikz/core`（主战场，red）

- **开放 tier2 节点 schema**:新建 `CompositeNodeSchema`(`namespace` / `type` 非空串 + `.passthrough()`);`ChildSchema` 由 `discriminatedUnion` 改 `z.union([discriminatedUnion(core4), CompositeNodeSchema])`(core4 仍 discriminatedUnion;tier2 兜底)。**core4 四类 schema 不动。**
- **基础 schema + 注册表**:core 导出 `CompositeBaseSchema`(`z.object({ namespace, type })`)供 domain `.extend()` 组合(DRY);`CompositeDefinition = { schema, expand }`——**只需 schema + expand**,core 从 `schema` 的 namespace/type **literal 提取**建表(不重复写;schema 须 extend `CompositeBaseSchema` 且 namespace/type 为 literal,否则注册期报错);`CompileOptions.composites?: Array<CompositeDefinition>` + `maxCompositeDepth?: number`(默认 32)。`expand` 纯 IR→IR、无 ctx(ctx 见 [ADR-02](./02-composite-authoring-context-cache.md))。
- **lowering 管线**:新建 `lowerComposites(ir, composites, { onWarn, maxDepth })`——从各 def 的 schema 提取 `${namespace}.${type}` 建表(重复 throw);DFS 遍历,**`'namespace' in node` → tier2**(查表 → `schema.parse(node)` → `expand` → 递归 fixpoint + 环守卫,深度上限 `maxDepth` 默认 32),否则 tier1(scope 递归 children);**未注册 namespace/type → `onWarn(COMPOSITE_NOT_REGISTERED)`(带 `namespace.type` + locator path)+ 跳过该节点(不进 Scene)、继续编译其余**——非硬失败;环 / 超 `maxDepth` 仍 `throw`(死循环防护)。`compileToScene` **第一步**调它。
- **复用,不新增**:展开产物走现有 anchor / coordinate / zIndex / scope 处理。
- **导出**:`index.ts` 导出 `CompositeDefinition` / `IRComposite`(开放节点类型) / `CompositeNodeSchema`。
- **示例 fixture(非 plot)**:`tests/fixtures/` 放一个最小**完整 schema** 的 tier2(如 `{ namespace:'example', type:'labeledBox' }`:有 `text` 字段 + describe,展开成 rect + text)证明端到端。

### `@retikz/render`（`./svg` + `./canvas`，**无源码改动**）

- Tier 2 已在 compile 期展开成 Tier 1 → Scene;`./svg` / `./canvas` 消费 Scene,无需改动。
- 加对照测试(`packages/core/render/tests/`):含 tier2 的 IR 经 `compileToScene` 出的 Scene,`buildSvgDocument`(svg)渲染正确,且 `drawScene`(canvas)与 svg 同 Scene。

### `@retikz/react`（wiring，yellow）

- `Layout` 加可选 prop `composites?: Array<CompositeDefinition>`,与 `shapes` / `arrows` / … 同一行透传给 `compileToScene`。无其它逻辑。
- 测试:`composites` 透传后 `<Layout ir={…}>`(直喂含 tier2 节点的 IR)能渲染。
- **JSX authoring 通道见 [ADR-02](./02-composite-authoring-context-cache.md)**。

### `@retikz/vanilla`（wiring，yellow）

- `CommonOptions = { idPrefix, width, height } & CompileOptions`,`composites` 随 `CompileOptions` **自动透传**(toScene `{ ...options }`);仅补注释 + 测试。
- 命令式 builder 的 `composite()` 构造糖 → 暂不做(见 [ADR-02](./02-composite-authoring-context-cache.md))。

### `@retikz/plot`（**不在本 ADR**）

- plot 本体(axis / panel / mark 等 tier2 节点 schema 及其 `expand`)是后续独立子包,本 ADR 只保证它能注册接入;alpha.2 用示例 fixture 验证。

## 待决策点

- ~~注册表命名~~ **已定 `composites`**;过程 `lowerComposites`。**未注册 namespace/type → warn + 跳过该节点(非 throw)**,渲染其余;环 / 超深度才 throw。
- ~~tier2 节点形态~~ **已定:一等领域节点 schema**——domain 包定义完整 zod(字段一等 + describe),不裹 `props`;core 静态 `ChildSchema` 对 tier2 宽松(passthrough namespace+type),精确校验在 `lowerComposites` 用注册 schema。
- ~~判别字段~~ **已定:有无 `namespace`**。**tier2 必有 `namespace`,tier1 没有**(core4 零改动);运行时 `'namespace' in node` 判 tier2。`type` 是 namespace 内类型名。
- ~~开放节点的 zod 表示~~ **已定**:`ChildSchema = z.union([discriminatedUnion('type', core4), CompositeNodeSchema(passthrough)])`;`namespace` 必填/缺失互斥让 union 天然分流,无歧义。
- **`expand` 返回**:`IRChild | IRChild[]`,允许产 tier2(→ fixpoint + 深度上限,**默认 32、经 `CompileOptions.maxCompositeDepth` 可配**)。
- **CompositeDefinition 形态**:只 `{ schema, expand }`——namespace/type 在 schema 的 literal 里、core 提取,不重复写;schema 用 `CompositeBaseSchema.extend(...)` 组合。core 注册期校验 schema 含 namespace/type literal,否则报错。
- **`schema.parse` 时机**:`lowerComposites` 展开时 parse(精确校验 + 强类型喂 expand)。
- **持久化 / codec**:tier2 节点必须可序列化(字段全 JSON 值);确认 round-trip 覆盖。
- **内置 composite**:core 不内置任何;注册表默认空。
- **延后项**:`<Composite>` JSX authoring、`expand` ctx、lowering 缓存、vanilla `composite()` 糖 → 见 [ADR-02](./02-composite-authoring-context-cache.md)。

## 影响

- **`@retikz/core`**:新建开放 tier2 节点 schema + `ChildSchema` union 化 + composites 注册表 + lowerComposites + `compileToScene` 第一步展开。**core4 四类不动**。**red(动 `ir/scene.ts` + `compile/**`)**。
- **`@retikz/render`**:零源码改动,加对照测试。
- **`@retikz/react`**:加 `composites` 透传(yellow);**`@retikz/vanilla`**:自动透传(仅注释 + 测试)。
- **公开 API**:core 新增 `composites` + `maxCompositeDepth` option + `CompositeDefinition` / `IRComposite` / `CompositeBaseSchema`;Layout 加 `composites` prop;新增 warn code `COMPOSITE_NOT_REGISTERED`。均 additive。
- **IR 兼容**:`ChildSchema` 由 closed discriminatedUnion 变 `union`(放宽,原合法 IR 仍合法);tier1 节点形态不变(无 namespace)。非 breaking。

## 不在本 ADR 范围

- `@retikz/plot` 本体 / 具体 tier2 节点 schema 与其 `expand`。
- `dataRef` / `scale registry` / `encoding`(plot 包负责)。
- `<Composite>` JSX authoring / `expand` ctx / lowering 缓存 / vanilla `composite()` 糖 → 见 [ADR-02](./02-composite-authoring-context-cache.md)。
- layer canvas / progressive(v0.4+)。

---

## 实现契约（必填）

### Level

`red`

判级:动 `packages/core/core/src/ir/scene.ts`(ChildSchema union 化 + 新 CompositeNodeSchema)与 `packages/core/core/src/compile/**`(lowerComposites + compileToScene)→ **red**;`packages/core/core/src/index.ts` 导出新类型亦 red;另动 `packages/core/react/src/kernel/Layout.tsx`、`packages/core/vanilla/src/**`(yellow)。取最高 → **red**。

### Schema 改动

| 文件 | 操作 | 字段 / 类型 | 说明 |
|---|---|---|---|
| `ir/composite.ts`（新建） | 加 | `CompositeBaseSchema`（namespace+type，供 domain `.extend()`）+ `CompositeNodeSchema = CompositeBaseSchema.passthrough()` + `IRComposite` | 基础 schema + 开放 tier2 节点 |
| `ir/scene.ts` | 改 | `ChildSchema = z.union([discriminatedUnion(core4), CompositeNodeSchema])` | IRChild 容纳 tier2（core4 不动） |
| `compile/compile.ts` | 加 | `CompileOptions.composites?: Array<CompositeDefinition>` + `maxCompositeDepth?: number`（默认 32） | tier2 注册表 + 深度上限 |

### 文件 scope

`@retikz/core`：
- `packages/core/core/src/ir/composite.ts`（新建：`CompositeBaseSchema`（供 domain extend）+ `CompositeNodeSchema` + `IRComposite`）
- `packages/core/core/src/ir/scene.ts`（改：`ChildSchema` union 化 + 注册到 scope 递归）
- `packages/core/core/src/composites/types.ts`（新建：`CompositeDefinition`）
- `packages/core/core/src/compile/lowerComposites.ts`（新建：namespace+type 表 + DFS + `'namespace' in node` 判别 + schema.parse + expand + fixpoint + 守卫 + 未注册 throw）
- `packages/core/core/src/compile/compile.ts`（改：`composites` option + 第一步 lower + processChildren 防御分支）
- `packages/core/core/src/ir/scope.ts`（改：`IRScope.children` 类型加 `IRComposite`——scope 可含 tier2 child）
- `packages/core/core/src/index.ts`（导出 `CompositeDefinition` / `IRComposite` / `CompositeBaseSchema`）
- `packages/core/core/tests/lower-composites.test.ts`（新建）
- `packages/core/core/tests/fixtures/example-composite.ts`（新建：完整 schema 的示例 tier2）

> **core4 四类 schema（node/path/coordinate/scope）不在 scope**——判别靠有无 namespace，tier1 零改动。

`@retikz/react`：
- `packages/core/react/src/kernel/Layout.tsx`（加 `composites?` prop + 透传）
- `packages/core/react/tests/composites-passthrough.test.tsx`（新建）

`@retikz/vanilla`：
- `packages/core/vanilla/src/types.ts`（注释补 `composites`；功能随 `& CompileOptions` 自动透传）
- `packages/core/vanilla/tests/composites-passthrough.test.ts`（新建）

`@retikz/render`（**不改源码**，仅测试）：
- `packages/core/render/tests/tier2-render.test.ts`（新建：tier2 IR → Scene → svg + canvas 对照）

### 测试象限

至少 11 个 case：

**Happy path（≥ 3）**：
- `register-and-expand`：注册完整 schema 的 `example.labeledBox`，IR 含该节点 → 展开成 rect + text → Scene 含 primitive。
- `expand-is-ir-to-ir`：展开产物与手写等价 Tier 1 IR 同 Scene。
- `renderer-agnostic`（render 包）：含 tier2 的同一 IR → svg 与 canvas 消费同一展开后 Scene、语义等价。

**边界（≥ 3）**：
- `nested-fixpoint`：tier2 展开出 tier2 → 递归到全 Tier 1。
- `empty-expand`：`expand` 返回 `[]` → 节点消失、不抛。
- `namespace-discriminates`：无 `namespace` 的节点走 core4（tier1）；有 `namespace` 的走 tier2；core4 仍 discriminatedUnion 正常。

**错误路径（≥ 2）**：
- `unregistered-warns-and-skips`：有 `namespace` 但未注册 → `onWarn(COMPOSITE_NOT_REGISTERED)`（带 key）+ 跳过该节点（不抛、不进 Scene），同 IR 的合法节点照常渲染。
- `cycle-guard`：tier2 展开出自身 → 深度守卫 throw、非死循环。
- `bad-node-throws`：节点字段不过注册 `schema` → 展开时 `schema.parse` throw（可诊断）。

**交互（≥ 2）**：
- `zindex-through-lowering`：展开产物带 `zIndex` → 与 sibling 按 zIndex 排序（与手写等价）。
- `anchor-into-tier2-output`：kernel 节点引用 tier2 展开产物的 anchor → 解析成功（展开在 anchor 之前）。

**透传（≥ 1）**：
- `composites-passthrough`：`<Layout composites ir>`（及 vanilla）把注册表透传到 `compileToScene`，渲染展开后的图。

### 依赖的现有元素

- `compileToScene` / `CompileOptions`（`compile.ts`）—— 扩展 `composites` + 第一步 lower。
- `ChildSchema` / `IRChild`（`ir/scene.ts`）—— 由 discriminatedUnion 改 union（加开放 tier2 兜底，保留 `z.lazy` 维持递归）。
- `IRScope.children`（`ir/scope.ts`）—— 类型加 `IRComposite`（scope 可含 tier2 child）。
- registry merge 模式（`compile.ts:290`）—— 注册表 / 查表 / throw 参照。
- zIndex 稳定排序 / anchor / coordinate 解析 —— 展开产物自动复用，不改。
- `Layout` options 透传 / vanilla `toScene` —— 加 / 继承 `composites`。
