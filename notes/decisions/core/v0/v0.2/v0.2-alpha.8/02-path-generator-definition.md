# ADR-02：PathGeneratorDefinition 注册面（外部曲线生成器 + JSON params + definePathGenerator）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §3 Step](../../../../../analysis/tikz-gap-analysis.md) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（注册面先例）· 本 milestone [ADR-01](./01-arrow-definition.md)（先实现）/ [ADR-03](./03-curve-transform-marking.md)

> **顺序**：本注册面与 [ADR-01 ArrowDefinition](./01-arrow-definition.md) 是两个独立 public API surface，**ArrowDefinition 先实现**（依赖 alpha.7 Paint），本篇随后；两者互不阻塞（评审 P2#2）。

## 背景

step kind 现状 = `discriminatedUnion('kind')` 11 种（`packages/core/src/ir/path/step.ts:287-299`：move/line/fold/cycle/curve/cubic/bend/arc/circlePath/ellipsePath/rectangle），全 core 写死，无外部注入口。

痛点：parabola / sin-cos / 二次方程曲线等"曲线 step"想扩展只能改 core。需要 `ShapeDefinition` / `CompileOptions.shapes`（`compile/compile.ts:119`）那样的注册注入面，外部包注册曲线生成器，core 不内置任何具体曲线。

**约束（评审 P1#3 / P1#4）**：IR 必须 100% JSON 可序列化——generator 的 `params` 只能是 JSON 值（禁 function / `z.any`）；`paramsSchema` 类型须强约束到 JSON，并在注册时验证。

## 选项

### A. `PathGeneratorDefinition` + `CompileOptions.pathGenerators` + generator step kind（**推荐**）

```ts
export type PathGeneratorDefinition = {
  paramsSchema: ZodType<IRJsonObject>;   // 输出 JSON-safe（评审 P1#4）
  targetParams?: Array<string>;          // 哪些 params 是 Target（顶层 key，评审 P2#3）
  generate: (ctx: PathGeneratorContext) => Array<PathCommand>;
};
export type PathGeneratorContext = {
  from: Position; to?: Position;
  params: Record<string, unknown>;             // paramsSchema 校验后
  resolvedTargets: Record<string, Position>;   // targetParams resolve 后
  round: (n: number) => number;
};
// IR: discriminatedUnion 加一支
export const GeneratorStepSchema = z.object({
  kind: z.literal('generator'),
  name: z.string().min(1),
  to: TargetSchema.optional(),
  params: JsonObjectSchema,
  label: StepLabelSchema.optional(),
});
```

- `CompileOptions.pathGenerators?: Record<string, PathGeneratorDefinition>`；未注册名编译期 throw。
- 优：IR 级可扩展（任何 adapter / 直接用 core 都享受）；对齐 shape / arrow 注册面；core 不内置曲线。
- 缺：比 shape / arrow 复杂——`params` 内嵌 Target 需先 resolve（`targetParams`）。

### B. 纯 react sugar 包（外部组件拼现有 step）

外部发 `<Parabola>` 组件，在 react 层算出 `curve` / `cubic` / `line` step。

- 优：core 零改动。
- 缺：react 专属——直接用 core / 其他 adapter 不享受；与"IR 级注册"取向不符（用户选注册面）。作为补充存在，但不替代 A。

### C. core 内置 parabola / sin-cos

- 缺：每加一种曲线改 core；用户明确反对（"否则以后还会有二次方程曲线"）。否决。

## 决策：A

理由：

1. **IR 级注册、core 不内置曲线**：parabola / sin-cos / 二次曲线由外部包注册，core 一次提供注入面、以后不回头改。
2. **守 IR JSON 可序列化**（评审 P1#3/#4）：`params: JsonObjectSchema` + `paramsSchema: ZodType<IRJsonObject>` + `definePathGenerator` 注册时元校验。
3. **对齐已验证注册范式**：与 shape / arrow 同构，第三方可发包。

## 决策细节

1. **generator step kind**：`{ kind:'generator', name, to?, params }` 进 `StepSchema` discriminatedUnion；`params` 类型 = `JsonObjectSchema`（递归 JSON 值）。
2. **`JsonObjectSchema`（新增）**：`z.record(JsonValueSchema)`，`JsonValue` = string/number/boolean/null/array/object 递归；**禁** function / undefined。core 公开供外部 refine。
3. **`paramsSchema: ZodType<IRJsonObject>` + 运行时双 parse 护栏（评审 P1#4）**：类型约束输出 JSON-safe；但 zod 自省**难可靠**证明"输出 only-JSON"，故**真正的护栏在 compile 运行时**——`paramsSchema.parse(params)` 后再对结果跑一次 `JsonObjectSchema.parse(parsed)`：即便外部传了 `z.any()` / `z.function()`，最终非 JSON 输出（function / undefined / 循环引用）也被第二道 parse 拦下。`definePathGenerator(def)` 工厂只做注册时 best-effort 早报错，**不作为唯一保证**。
4. **`targetParams` 仅顶层 key（评审 P2#3）**：嵌套（`{ control:{ at:{id} } }`）/ 数组内 Target 不支持，须放 params 顶层；JSON-Pointer / dot-path 寻址留未来扩展。
5. **resolve 时序**：compile 解析 generator step 时——查表（未注册 throw）→ `paramsSchema.parse(params)` → **`JsonObjectSchema.parse(parsed)` 二次确认 JSON-safe**（评审 P1#4 护栏）→ `targetParams` 列出的顶层值经 target resolve（复用 alpha.6 target lookup）成 `resolvedTargets` → `generate(ctx)` → splice `PathCommand[]` 进 path 命令流。
6. **`generate` 返回 `PathCommand[]`**：低层命令（line / curve / cubic 等），不再走 step 编译（避免二次递归）。
7. **游标推进**：generator 产段后 cursor 落在最后一个命令的终点（与现有 step 一致）。
8. **英文 `.describe`**：`GeneratorStepSchema` 各字段（`name` / `to` / `params`）+ `JsonObjectSchema` 带英文 describe。

## 待决策点

- `JsonObjectSchema` 是否限制最大深度 / 大小（防滥用），倾向不限。
- `generate` 是否允许返回更高层 step（而非 PathCommand）——倾向只 PathCommand（简单、无二次递归）。
- `definePathGenerator` 元校验的具体手段（zod schema 自省 / 样例 round-trip JSON.stringify 验证）。
- generator 是否能产生 sub-path（move 中断）——倾向允许（sin 波段可能多段）。

## DSL 表面

```tsx
// 外部包定义 parabola 生成器（不在 core）
export const parabola = definePathGenerator({
  paramsSchema: z.object({ bend: NodeTargetSchema }),  // bend 是顶层 Target
  targetParams: ['bend'],
  generate: ({ from, to, resolvedTargets }) => [/* 一个 curve 命令 */],
});
compileToScene(ir, { pathGenerators: { parabola } });
// IR
{ "type": "step", "kind": "generator", "name": "parabola", "to": {/*…*/}, "params": { "bend": { "id": "C" } } }
```

## 影响

- `packages/core/src/ir/path/step.ts`：加 `GeneratorStepSchema` 进 union。
- `packages/core/src/ir/json.ts`（新建）：`JsonValueSchema` / `JsonObjectSchema` / `IRJsonObject`。
- `packages/core/src/pathGenerators/`（新建，仿 `shapes/`）：`PathGeneratorDefinition` 类型 + `definePathGenerator`。
- `packages/core/src/compile/compile.ts`：`CompileOptions.pathGenerators`。
- `packages/core/src/compile/path/`：generator step 解析（查表 + params 校验 + targetParams resolve + generate splice）。
- `packages/core/src/index.ts`：公开 `PathGeneratorDefinition` / `definePathGenerator` / `JsonObjectSchema` / `IRJsonObject`。
- 对外 API：纯叠加（新 step kind + 新 CompileOptions）；core 不内置任何曲线。

## 不在本 ADR 范围

- **ArrowDefinition**→ [ADR-01](./01-arrow-definition.md)；**out/in·self-loop / 路径变换 / marking**→ [ADR-03](./03-curve-transform-marking.md)。
- **具体曲线**（parabola / sin-cos）：外部包，core 不实现（仅文档给示例代码）。

---

## 实现契约（必填）

### Level

`red`

- 动 `ir/path/step.ts`（新 step kind）+ 新 `ir/json.ts` + 新 `pathGenerators/` + `compile/**`（CompileOptions + 解析）+ `index.ts`
- 取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/json.ts` | 新建 schema | `JsonObjectSchema` | `z.record(z.lazy(() => JsonValueSchema))` | — | JSON 对象（递归 JSON 值；守 IR 可序列化） |
| `ir/json.ts` | 新建 type | `IRJsonObject` | `z.infer<typeof JsonObjectSchema>` | — | JSON 对象类型 |
| `ir/path/step.ts` | 新建 schema | `GeneratorStepSchema` | `z.object({ kind:'generator', name, to?, params: JsonObjectSchema, label? })` | — | 路径生成器 step：按 name 调注册的生成器 |
| `ir/path/step.ts` | 改 schema | `StepSchema` | discriminatedUnion 追加 `GeneratorStepSchema` | — | step union 加 generator 分支 |

> `PathGeneratorDefinition` / `PathGeneratorContext` 为 TS type（运行时注入）。**英文 `.describe`**：`GeneratorStepSchema` 各字段 + `JsonObjectSchema` 必须英文。

### 文件 scope

- `packages/core/src/ir/json.ts`（新建）
- `packages/core/src/ir/path/step.ts`（加 GeneratorStep）
- `packages/core/src/pathGenerators/{types,define}.ts`（新建：类型 + `definePathGenerator`）
- `packages/core/src/compile/compile.ts`（`CompileOptions.pathGenerators`）
- `packages/core/src/compile/path/`（generator 解析）
- `packages/core/src/index.ts`（公开）
- `packages/core/tests/compile/path-generator.test.ts`（新建）
- `apps/docs/src/contents/core/concepts/path-generator/`（含 parabola / sin 示例代码，不进 core）

### 测试象限

#### Happy path（≥ 3）

- `register_parabola_to_curve`：注册 parabola → generator step 产 1 个 curve 命令、端到端编译
- `register_sin_sampled`：注册 sin → 产采样 cubic / line 段
- `target_param_resolved`：`targetParams:['bend']` 的 `bend`（NodeTarget）先 resolve 成世界坐标喂 generate
- `cursor_advances`：generator 产段后 cursor 落最后命令终点

#### 边界（≥ 2）

- `generator_no_to`：无 `to` 的 generator（如纯参数曲线）正常
- `deterministic_output`：同 IR + 同 generator → 输出确定
- `multi_segment_subpath`：generator 产含 move 的多段（sin 波）

#### 错误路径（≥ 2）

- `unregistered_generator_throws`：`name:'nope'` → 编译期 throw
- `params_non_json_rejected`：`params` 含 function / undefined → schema / definePathGenerator 拒
- `any_schema_output_caught_at_compile`：即便注册了 `paramsSchema: z.any()`，compile 对 parse 结果跑 `JsonObjectSchema.parse` → 非 JSON 输出（function 等）被拦（评审 P1#4 双 parse 护栏，不靠注册时自省）
- `nested_target_param_unsupported`：`targetParams` 指向嵌套路径 → 按 P2#3 不解析（文档化 / 报错）

#### 交互（≥ 2）

- `generator_with_label`：generator step 带 `label` → 边标注正确
- `generator_in_scope_transform`：generator step 在 transformed scope 内 → 坐标投回正确
- `generator_then_line`：generator 段后接 line → cursor 衔接正确

### 依赖的现有元素

- `packages/core/src/ir/path/step.ts` 的 `StepSchema` discriminatedUnion —— **修改**：加 generator 分支
- `packages/core/src/compile/compile.ts` 的 `CompileOptions` —— **修改**：加 `pathGenerators`
- `packages/core/src/shapes/{types,index}.ts`（`ShapeDefinition` / `CompileOptions.shapes`）—— **范式参照**
- alpha.6 target lookup（`compile/path/anchor.ts`）—— **引用**：`targetParams` resolve
- `packages/core/src/primitive/path.ts` 的 `PathCommand` —— **引用**：generate 返回类型
