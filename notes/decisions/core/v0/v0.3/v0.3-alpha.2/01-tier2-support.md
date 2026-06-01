# ADR-01：Tier 2 支撑——开放 composite IR 节点 + 可注册的 lowering 管线

- 状态：Proposed
- 决策日期：2026-06-01
- 关联：[v0.3 roadmap §alpha.2 Tier 2 支撑能力 / §Alpha 切分](../roadmap.md) · [core-design.md §4.3 Tier 2 / Composite](../../../../../architecture/core-design.md) · [plot-design.md](../../../../../architecture/plot-design.md) · [alpha.1 ADR-01~04](../v0.3-alpha.1/) · [v0.2-alpha.3 ADR-01 shape-registry](../v0.2/v0.2-alpha.3/01-shape-registry.md)（registry 模式参照）

> **打包变更（2026-06-01，[../v0.3-alpha.1/05-renderer-repackage.md](../v0.3-alpha.1/05-renderer-repackage.md)）**：renderer 已合并为 `@retikz/render`；本 ADR 下述「`@retikz/svg` / `@retikz/canvas` 零源码改动」对应 `@retikz/render/{svg,canvas}` 子路径，其对照测试落 `packages/render/tests/`。
>
> **范围**：alpha.2 把 v0.2 起在 core-design §4.3 定义、但**至今只在文档里**的 Tier 2 / Composite 接入面**真正落地成可注册的展开管线**：domain 包注册「Tier 2 type → 展开（lowering）函数」，`compileToScene` 据注册表把 Tier 2 节点解析、展开成 Tier 1 Kernel。`@retikz/plot` 是首个消费者,但**本 ADR 不实现 plot 本体**——只交付基础设施 + 一个示例 composite 验证端到端。

## 背景

现状(2026-06-01 摸底):

- **`lowerComposites` 未落地**:`CompileOptions`(`packages/core/src/compile/compile.ts:104`)有 `shapes` / `arrows` / `patterns` / `pathGenerators` / `measureText` / `nodeDistance` 等 8 字段,**无 `lowerComposites`**;`compileToScene`(`:283`)内部不调用任何 Tier 2 下沉。core-design §4.3 的 `lowerComposites?: (ir)=>ir` 仅是规划。
- **IR 装不下 Tier 2**:`ChildSchema`(`packages/core/src/ir/scene.ts:7`)是严格 4-way `discriminatedUnion([Node, Path, Coordinate, Scope])`,各分支 `.strict()` 严拒未知字段。Tier 2 高层节点**无法进 IR**。
- **可复用的现成机制**:① registry 模式成熟——`shapes`/`arrows`/`patterns`/`pathGenerators` 都是「内置集合 + 运行时注入 merge,查表失败 throw」(`compile.ts:290`);② `zIndex` 在 IR(node/path/scope)有,compile 用旁路 `Map` 稳定排序后产纯序 Scene(`compile.ts:350`)——renderer 只认数组序;③ anchor / coordinate / locator 定位机制完整(`anchor-cache.ts` / `coordinate.ts`)。
- **不在 core 的**:`dataRef` / `scale registry` / `encoding` 完全没有,且**不该进 core**(plot 包负责)。

所以 Tier 2 支撑的本质是:**让 IR 能携带「core 不认识的高层节点」,并在 compile 第一步用注册表把它们展开成 core 认识的 Tier 1**——展开后一切照常(布局 / anchor / zIndex / renderer 全自动复用),core 仍零 chart 语义。

## 需要提供的功能（总览）

1. **IR 能容纳 Tier 2 节点**：开放 composite 节点(open discriminator),可序列化、可持久化、可被 AI 生成。
2. **可注册的 lowering 管线**：`CompileOptions.composites` 注册表(`type → 展开函数`),`compileToScene` 第一步展开。
3. **展开是纯 IR→IR 结构变换**：expand 不碰几何;定位靠展开产物里的 anchor / coordinate 引用(走现有 Tier 1 解析),与 core-design §4.3「lowerComposites 在 Tier 1 之前、`(ir)=>ir`」一致。
4. **递归展开到 fixpoint**：composite 可展开出 composite(嵌套),管线迭代至无 composite,带深度 / 环守卫。
5. **可诊断错误**：未注册 type → throw(带 locator path),参照 shape 查表失败。
6. **复用 zIndex / layer**：展开产物带 `zIndex`,现有排序自动生效——**无需新机制**。
7. **端到端验证**：一个**示例 composite**(测试 fixture,非 plot)证明 注册→IR→展开→Scene→svg/canvas 一致。

## 选项

> 核心决策：Tier 2 怎么进 IR + 展开逻辑放哪。

### A. 开放 composite IR 节点 + `CompileOptions.composites` 注册表（**推荐**）

```ts
// IR：新增开放 composite 节点（type 不在 kernel 保留集 {node,path,coordinate,scope}）
type IRComposite = {
  type: string;                 // domain type，如 'plot.axis'
  props?: JsonObject;           // 可序列化参数（zod JsonObjectSchema 守）
  children?: IRChild[];         // 可嵌套
  zIndex?: number; name?: string;
};

// 注册表（参照 pathGenerators：paramsSchema + 函数）
type CompositeDefinition = {
  paramsSchema?: ZodType;
  expand: (node: IRComposite, ctx: CompositeContext) => IRChild | IRChild[];
};
// compileToScene 第一步：lowerComposites(ir, { ...BUILTIN(空), ...options.composites })
compileToScene(ir, { composites: { 'plot.axis': axisDef, ... } });
```

Tier 2 节点**持久化进 IR**(可序列化 / AI 生成),compile 第一步据注册表查表展开成 Tier 1,之后照常。与 core-design §4.3 + 现有 4 个 registry 模式对称。代价:动 `ChildSchema`(放开一个 open 分支)是 red 改动,zod open discriminator 需谨慎设计。

### B. 单函数 `lowerComposites?: (ir) => ir`（core-design 原始形态）

caller 自己把多个 domain 的 lowering 组合成一个函数传入。代价:多 domain 包要 caller 手动 compose、无 per-type 注册 / 无 per-type 错误诊断、无 paramsSchema 校验——与 roadmap「**可注册**的展开管线」直接冲突。**否决**(但 A 内部可用它做底层,registry 是其上的糖)。

### C. Tier 2 在 adapter builder 期展开（当 Sugar 处理）

像 React Sugar 那样在进 IR 前展平。代价:违反 core-design §4.3(Tier 2 必须 **IR 之后**展开、持久化),且 canvas / vanilla / SSR 拿不到(它们不经 React builder)。**否决**。

## 决策：选 A

理由：

1. **唯一满足「可注册 + 可持久化 + 跨 renderer」三条**:registry 给 per-type 注册 / 诊断 / 校验;IR 携带让 SSR / canvas / vanilla / AI 全都拿得到;展开在 compile 故所有 adapter 自动获得(对齐 core-design §4.3「跨 adapter 自动可用」)。
2. **与现有 4 个 registry 模式对称**,实现与心智零新范式;`composites` 就是第 5 个注入集合。
3. **renderer 零改动**(架构红利,见下分工):Tier 2 → Tier 1 → Scene,svg/canvas 消费 Scene 不变。

## 各包分工（任务拆分）

> Tier 2 的全部"智能"在 **core 的展开管线**;renderer 不碰;runtime 只透传注册表。

### `@retikz/core`（主战场，red）

- **IR 开放 composite 节点**：新建 `CompositeSchema`(`type: string` 且不在 kernel 保留集、`props?` 走 `JsonObjectSchema`、`children?: IRChild[]`、`zIndex?` / `name?`);改 `ChildSchema` 让它在 kernel 4 类之外接受 composite 分支。**kernel 4 类仍 `.strict()`**,只 composite 这一支放开。
- **注册表 + 类型**：`CompileOptions.composites?: Record<string, CompositeDefinition>`;`CompositeDefinition = { paramsSchema?, expand }`;`CompositeContext`(最小:`onWarn` + 递归展开入口 + 只读 compile options;**不给几何 / layout**——expand 是纯 IR→IR)。
- **lowering 管线**：新建 `lowerComposites(ir, registry)`——深度优先遍历 IR 树,遇 composite 查表→(可选 `paramsSchema.parse(props)`)→`expand`→替换节点,**递归到无 composite(fixpoint)**,带**深度 / 环守卫**;未注册 type → `throw COMPOSITE_NOT_REGISTERED`(带 locator path)。`compileToScene` **第一步**调它(Tier 1 处理之前)。
- **复用,不新增**:展开产物是普通 Tier 1,走现有 anchor / coordinate / zIndex / scope 处理;core **不为 Tier 2 加任何几何 / scale / data 语义**。
- **导出**:`index.ts` 导出 `CompositeDefinition` / `CompositeContext` / `IRComposite` 类型。
- **示例 fixture(非 plot)**:`tests/fixtures/` 放一个最小 composite(如 `labeledBox`:展开成 rect + text)证明端到端。

### `@retikz/svg`（**无源码改动**）

- Tier 2 已在 compile 期展开成 Tier 1 → Scene;svg 消费 Scene,**无需任何改动**。
- 仅加 **1 条对照测试**:含 composite 的 IR 经 `compileToScene` 出的 Scene,`buildSvgDocument` 渲染正确。
- 这是架构红利:renderer 自动获得 Tier 2,不该也不需要认识它。

### `@retikz/canvas`（**无源码改动**）

- 同 svg:消费展开后的 Scene,无改动。
- 仅加 **1 条对照测试**:同一 composite IR → 同一 Scene → `drawScene` 与 svg 输出语义等价(承 alpha.1 的双 renderer 等价线)。

### `@retikz/react`（wiring）

- `Layout` 加可选 prop `composites?: Record<string, CompositeDefinition>`,与 `shapes` / `arrows` / ... **同一行透传**给 `compileToScene`(`Layout.tsx:104`)。无其它逻辑。
- 测试:`composites` 透传后 `<Layout>` 能渲染含 Tier 2 节点的 IR。

### `@retikz/vanilla`（wiring）

- `toScene` / `renderToSvgString` / `mountSvg` / `Figure` 的 options 类型加 `composites`,透传给 `compileToScene`(`toScene.ts:10`)。
- 命令式 builder 是否加 `composite(type, props, children)` 构造糖 → **暂不做**(YAGNI,留 plot 包自带具名构造器;见待决策)。

### `@retikz/plot`（**不在本 ADR**）

- plot 本体(axis / panel / mark 等 Tier 2 type 及其 `expand`)是后续独立子包,本 ADR 只保证它能**注册接入**;alpha.2 用示例 fixture 代替验证。

## 待决策点

- ~~注册表命名~~ **已定：`composites`**。对称现有 `shapes`/`arrows`/`patterns`/`pathGenerators`(同"名词复数 = 注册的那类东西"),且 **domain 中立**——不绑 dataviz 的 `marks`(那是 plot 包内部词汇)。贴合 OSS 惯例:unified `handlers` / Mermaid `diagrams` 的"按名词命名注册表" + 编译器 `lower` 动词。配套定名:单个 `CompositeDefinition.expand`、过程 `lowerComposites`。未注册 type 取**严格 throw**(随 Mermaid / MLIR-full,非 unified 的 passthrough)——因 Scene 无"未展开 composite"槽位,留着 renderer 画不出。
- **开放节点的 zod 表示**：`discriminatedUnion` 不能 open → 用 `ChildSchema = z.union([...kernel4, CompositeSchema])`,`CompositeSchema` 用 `type: z.string().refine(不在 {node,path,coordinate,scope})` 消歧;确保 kernel 4 类优先匹配、composite 兜底。
- **`expand` 返回**：`IRChild | IRChild[]`,**允许产 composite**(→需 fixpoint + 深度上限,默认如 32 层)。
- **`CompositeContext` 边界**：倾向只给 `onWarn` + 递归展开器 + 只读 options;**不给 layout / 几何**(expand 纯结构,定位靠 anchor/coordinate 字符串引用,与 Tier 1 同解析)。
- **`paramsSchema` 校验时机**：倾向**展开时** `parse(node.props)`(像 pathGenerators),失败发可诊断错误。
- **持久化 / codec**：composite 节点**必须可序列化**(Tier 2 的意义)——确认 IR codec / round-trip 覆盖 composite。
- **内置 composite**：core **不内置任何** composite(对比 shapes 有内置)——core 零 domain 语义,注册表默认空。
- **vanilla 命令式 `composite()` 糖**：暂不做。

## 测试设计

`packages/core/tests/lower-composites.test.ts` 为主,svg/canvas/react/vanilla 各 1 条接入/对照。具体见"实现契约 § 测试象限"。

## 影响

- **`@retikz/core`**：新增 IR composite 节点 + composites 注册表 + lowerComposites 管线;`compileToScene` 第一步多一遍展开。**这是 red(动 `ir/**` + `compile/**`)**。
- **`@retikz/svg` / `@retikz/canvas`**：**零源码改动**,各加 1 条对照测试。
- **`@retikz/react` / `@retikz/vanilla`**：各加 `composites` 透传(1 prop / 1 option)。
- **公开 API**：core 新增 `composites` option + `CompositeDefinition`/`IRComposite` 类型;Layout 新增 `composites` prop;vanilla options 加 `composites`。均 additive。
- **IR 兼容**：`ChildSchema` 由 closed 4-way 变 open——**放宽**(原合法 IR 仍合法),非 breaking;但**反向**(老 codec 遇 composite)需确认。
- **无 breaking**:纯新增 + schema 放宽。

## 不在本 ADR 范围

- `@retikz/plot` 本体 / 具体 plot Tier 2 type 与其 `expand`。
- `dataRef` / `scale registry` / `encoding` 数据绑定(plot 包负责,不进 core)。
- 坐标化层 / panel / axis 的**具体**语义(本 ADR 只保证 anchor/coordinate 可被展开产物复用)。
- vanilla 命令式 `composite()` 构造糖。
- layer canvas / progressive(承 roadmap §AI 增量渲染,v0.4+)。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/core/src/ir/**`(ChildSchema + 新 CompositeSchema)与 `packages/core/src/compile/**`(lowerComposites + compileToScene)命中 **red**;`packages/*/src/index.ts`(core 导出新类型)亦 red;另动 `packages/react/src/kernel/**`、`packages/vanilla/src/**`(yellow)。跨级取最高 → **red**。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/composite.ts`（新建） | 加 | `IRComposite` | `{ type: string(非 kernel 保留名), props?: JsonObject, children?: IRChild[], zIndex?: number, name?: string }` | — | Tier 2 开放 composite 节点 |
| `packages/core/src/ir/scene.ts` | 改 | `ChildSchema` | `z.union([Node, Path, Coordinate, Scope, Composite])`（兜底 composite） | — | IRChild 容纳 Tier 2 节点 |
| `packages/core/src/compile/compile.ts` | 加 | `CompileOptions.composites` | `Record<string, CompositeDefinition>` | `{}` | Tier 2 type → 展开逻辑注册表 |

### 文件 scope

`@retikz/core`：
- `packages/core/src/ir/composite.ts`（新建：`CompositeSchema` / `IRComposite`）
- `packages/core/src/ir/scene.ts`（改：`ChildSchema` 加 composite 兜底分支）
- `packages/core/src/composites/types.ts`（新建：`CompositeDefinition` / `CompositeContext`）
- `packages/core/src/compile/lowerComposites.ts`（新建：注册表 merge + DFS 展开 + fixpoint + 深度/环守卫 + 未注册 throw）
- `packages/core/src/compile/compile.ts`（改：`CompileOptions.composites`；`compileToScene` 第一步调 `lowerComposites`）
- `packages/core/src/index.ts`（导出 `CompositeDefinition` / `CompositeContext` / `IRComposite`）
- `packages/core/tests/lower-composites.test.ts`（新建）
- `packages/core/tests/fixtures/example-composite.ts`（新建：示例 Tier 2 type，非 plot）

`@retikz/react`：
- `packages/react/src/kernel/Layout.tsx`（加 `composites?` prop + 透传 compileToScene）
- `packages/react/tests/composites-passthrough.test.tsx`（新建）

`@retikz/vanilla`：
- `packages/vanilla/src/types.ts`（options 加 `composites?`）
- `packages/vanilla/src/toScene.ts`（透传 `composites`）
- `packages/vanilla/tests/composites-passthrough.test.ts`（新建）

`@retikz/svg` / `@retikz/canvas`（**不改源码**，仅测试）：
- `packages/svg/tests/tier2-render.test.ts`（新建：composite IR → Scene → SVG 正确）
- `packages/canvas/tests/tier2-render.test.ts`（新建：同 Scene → canvas 等价）

不在白名单：`packages/svg/src/**`、`packages/canvas/src/**`（Tier 2 不该碰 renderer）。偏离需加条目自注解或开新 ADR。

### 测试象限

至少 11 个 case：

**Happy path（≥ 3）**：
- `register-and-expand`：注册 `labeledBox` composite，IR 含该节点 → `compileToScene` 展开成 rect + text → Scene 含对应 primitive。
- `expand-is-ir-to-ir`：`expand` 产出的 Tier 1 节点走正常 compile（位置 / 样式正确，与手写等价 IR 同 Scene）。
- `renderer-agnostic`：含 composite 的同一 IR → `buildSvgDocument`(svg) 与 `drawScene`(canvas) 消费同一展开后 Scene、语义等价。

**边界（≥ 3）**：
- `nested-composite-fixpoint`：composite A 展开出 composite B → 递归展开到全 Tier 1。
- `empty-expand`：`expand` 返回 `[]` → 节点消失、无 Scene 输出、不抛。
- `kernel-strict-intact`：kernel node/path/coordinate/scope 仍 `.strict()` 拒未知字段；只 composite 分支放开。

**错误路径（≥ 2）**：
- `unregistered-composite-throws`：IR 含未注册 type → `compileToScene` throw `COMPOSITE_NOT_REGISTERED`（带 locator path），不静默。
- `expand-cycle-guard`：composite 展开出自身（环）/ 超深度 → 守卫 throw 可诊断错误，非死循环。
- `bad-params-throws`：`props` 不过 `paramsSchema` → 展开时可诊断 throw。

**交互（≥ 2）**：
- `zindex-through-lowering`：展开产物带 `zIndex` → 与 sibling kernel 节点按 zIndex 交错排序进最终 Scene。
- `anchor-into-composite-output`：kernel 节点引用 composite 展开产生的节点 anchor（如 `'panel.north'`）→ 解析成功（证明展开在 anchor 解析之前）。

### 依赖的现有元素

- `compileToScene` / `CompileOptions`（`packages/core/src/compile/compile.ts`）—— 扩展 `composites` + 加 lowering 第一步。
- `ChildSchema` / `IRChild`（`packages/core/src/ir/scene.ts`）—— 放开为 open union。
- `JsonObjectSchema`（core）—— composite `props` 可序列化守卫。
- shapes/arrows/patterns/pathGenerators registry merge（`compile.ts:290`）—— 注册表 merge / 查表 / throw 模式参照。
- zIndex 稳定排序（`compile.ts:350`）—— 展开产物自动复用，不改。
- anchor / coordinate 解析（`anchor-cache.ts` / `coordinate.ts`）—— 展开产物复用，不改。
- `Layout` options 透传（`Layout.tsx:104`）/ vanilla `toScene`（`toScene.ts:10`）—— 加 `composites` 透传。
