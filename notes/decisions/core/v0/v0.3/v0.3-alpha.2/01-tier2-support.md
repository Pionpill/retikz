# ADR-01：Tier 2 支撑——领域节点 schema + 可注册的 lowering 管线

- 状态：Accepted（已实现）
- 决策日期：2026-06-01
- 关联：[ADR-02 Tier 2 延后项](./02-composite-authoring-context-cache.md) · [v0.3 roadmap §alpha.2](../roadmap.md) · [core-design.md §4.3 Tier 2 / Composite](../../../../../architecture/core-design.md) · [plot-design.md](../../../../../architecture/plot-design.md) · [v0.2-alpha.3 ADR-01 shape-registry](../../v0.2/v0.2-alpha.3/01-shape-registry.md)（registry 模式参照）

> **范围**：把 core-design §4.3 的 Tier 2 / Composite 接入面落地成可注册的展开管线——domain 包注册「Tier 2 节点 schema + 展开（lowering）函数」，`compileToScene` 据注册表把 Tier 2 节点展开成 Tier 1 Kernel。本轮只交付 core 基础设施 + 示例 fixture 端到端验证 + react/vanilla 透传；`@retikz/plot` 是首个消费者，但本 ADR 不实现 plot 本体。

## 背景 / 约束

塑造方案的硬约束：

- **IR 装不下 Tier 2**——v0.2 的 `ChildSchema` 是严格 4-way `discriminatedUnion([Node, Path, Coordinate, Scope])`，高层领域节点无处进 IR。
- **展开必须在 IR 之后**（core-design §4.3）——Tier 2 节点要持久化进 IR、再展开，canvas / vanilla / SSR / AI 才都拿得到；不能在某个框架的 builder 期当 Sugar 展平。
- **不该进 core 的留给 plot 包**——`dataRef` / `scale registry` / `encoding` 是 chart 语义，core 仍零 chart 知识。
- **可复用机制已就绪**——registry 模式（`shapes` / `arrows` 的「注入 merge + 查表失败 throw」）、`zIndex` 旁路稳定排序、anchor / coordinate / locator 定位完整，展开产物可全自动复用。

Tier 2 支撑的本质：让 IR 携带「core 不认识的领域高层节点」，compile 第一步用注册表把它们展开成 Tier 1，之后布局 / anchor / zIndex / renderer 全自动复用。

## 决策：领域节点 schema + `CompileOptions.composites` 注册表

设计要点：

1. **Tier 2 节点 = 一等领域节点**：像 `Node` 一样有完整 zod schema（字段一等、每字段 `.describe()`），不裹 `props`。core 导出 `CompositeBaseSchema`（定义必填 `namespace` / `type`），domain schema 用 `.extend()` 继承再收窄 literal + 加字段；schema 是 LLM 契约的一部分。
2. **判别靠「有无 `namespace`」**：tier2 节点必有 `namespace`（`plot` / `flow` …）+ `type`（namespace 内类型名）；tier1 core4 没有 `namespace`、零改动，仍走 `type` discriminatedUnion。运行时 `'namespace' in node` 即判 tier2——干净互斥、无歧义。
3. **core 静态 schema 对 tier2 宽松**：`ChildSchema` 对 tier2 只校验「有 `namespace` + `type`」（passthrough），精确字段校验在 `lowerComposites` 用注册的 `def.schema.parse(node)` 做。
4. **展开是纯结构变换**：`expand(parsedNode) => IRChild | IRChild[]`，据节点字段产不同 Tier 1 子树；定位靠展开产物的 anchor / coordinate 引用。`expand` 本轮是纯函数、无 ctx（ctx 见 [ADR-02](./02-composite-authoring-context-cache.md)）。
5. **递归到 fixpoint**：`expand` 可产 tier2 → 递归展开，带深度上限（默认 32、`CompileOptions.maxCompositeDepth` 可配）+ 环守卫。
6. **未注册容错**：遇未注册的 `namespace/type` → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过该节点（不进 Scene）、渲染其余；只有环 / 超深度才 throw。

判别与注册形态（字面即决策，最小片段）：

```ts
// tier1 无 namespace → 只能匹配 core4；tier2 有 namespace → 只能匹配 CompositeNodeSchema
const ChildSchema = z.union([
  z.discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema]),
  CompositeNodeSchema, // = CompositeBaseSchema.passthrough()
]);

// 注册项只需 schema + expand —— namespace/type 已在 schema 的 literal 里，core 提取、不重复写
type CompositeDefinition<T = unknown> = {
  schema: ZodType<T>;
  expand: (node: T) => IRChild | IRChild[];
};
```

`CompositeDefinition` 只收 `{ schema, expand }`：core 从 schema 的 `namespace` / `type` literal 提取建表（schema 须 `.extend(CompositeBaseSchema)` 且二者为 literal，否则注册期报错），不让 domain 把 namespace/type 写两遍。schema 须可序列化（字段全 JSON 值），round-trip 覆盖。core 不内置任何 composite，注册表默认空。

理由：

1. **唯一满足「可注册 + 可持久化 + 跨 renderer」三条**——展开在 compile，故所有 adapter 自动获得。
2. **Tier 2 节点是一等领域节点**——完整 schema + describe，LLM 生成 / 校验直接吃 schema，字段一等无 `props` 嵌套。
3. **与现有 registry 模式同构**，renderer 零改动。
4. **判别零破坏**——「有无 `namespace`」互斥分流，tier1 core4 完全不动，现有 IR / schema / 测试不受影响。

### 被否决的选项

- **B：单函数 `lowerComposites?: (ir) => ir`** —— 无 per-type 注册 / 诊断 / schema 校验，与 roadmap「可注册管线」冲突；否决（A 内部可用它做底层）。
- **C：adapter builder 期展开（当 Sugar）** —— 违反 core-design §4.3（Tier 2 必须 IR 之后展开、持久化），canvas / vanilla / SSR / AI 拿不到；否决。展开始终在 core 的 `lowerComposites`，不下放各框架。

## 不在本 ADR 范围

- `@retikz/plot` 本体 / 具体 tier2 节点 schema 与其 `expand`；`dataRef` / `scale registry` / `encoding`（plot 包负责）。
- `<Composite>` JSX authoring 通道 / `expand` 上下文 ctx / lowering 缓存 / vanilla `composite()` 构造糖 → 见 [ADR-02](./02-composite-authoring-context-cache.md)。
- layer canvas / progressive 渲染（v0.4+）。

---

> **实现指针**：level `red`（动 `ir/scene.ts` ChildSchema union 化 + `compile/**` lowering 管线 + index 导出），core4 四类 schema 零改动；additive 非 breaking（`ChildSchema` 由 closed discriminatedUnion 放宽为 union，原合法 IR 仍合法；新增 `composites` / `maxCompositeDepth` option、`CompositeDefinition` / `IRComposite` / `CompositeBaseSchema` 导出、`COMPOSITE_NOT_REGISTERED` warn code、Layout `composites` prop 均 additive）。renderer 零源码改动，runtime 只透传注册表。真源以代码为准——`CompositeBaseSchema` / `CompositeNodeSchema` / `IRComposite`（`core/src/ir/composite.ts`）、`ChildSchema`（`core/src/ir/scene.ts`）、`CompositeDefinition`（`core/src/composites/types.ts`）、`lowerComposites`（`core/src/compile/lowerComposites.ts`，DFS + `'namespace' in node` 判别 + `schema.parse` + `expand` + fixpoint + 环 / 深度守卫）、`compileToScene` 第一步展开（`core/src/compile/compile.ts`）、`Layout` 透传（`react/src/kernel/Layout.tsx`）、vanilla 随 `& CompileOptions` 自动透传（`vanilla/src/types.ts`）；用户侧示例见文档站 Tier 2 / composite 相关页。测试：`core/tests/lower-composites.test.ts` + `lower-composites.adversarial.test.ts`（含示例 fixture `example.labeledBox`、fixpoint、未注册 warn+skip、环守卫、anchor-into-output、zindex-through-lowering）、`render/tests/tier2-render.test.ts`（svg / canvas 对照）、`react/tests/composites-passthrough.test.tsx`、`vanilla/tests/composites-passthrough.test.ts`。完整施工契约（Level / Schema 改动表 / 文件 scope / 11+ 测试象限 / 各包分工）见本文件 git 历史。

> 🔖 封板压缩 commit `febe281d`；压缩前完整施工蓝图 = `git show febe281d^:notes/decisions/core/v0/v0.3/v0.3-alpha.2/01-tier2-support.md`。
