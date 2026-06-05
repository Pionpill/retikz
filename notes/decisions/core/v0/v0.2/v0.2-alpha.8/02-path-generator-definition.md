# ADR-02：PathGeneratorDefinition 注册面（外部曲线生成器 + JSON params + definePathGenerator）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §3 Step](../../../../../analysis/tikz-gap-analysis.md) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（注册面先例）· 本 milestone [ADR-01](./01-arrow-definition.md)（先实现）/ [ADR-03](./03-curve-transform-marking.md)

## 背景 / 约束

- step kind 原为 `discriminatedUnion('kind')` 11 种（move/line/fold/cycle/curve/cubic/bend/arc/circlePath/ellipsePath/rectangle），全 core 写死，无外部注入口。parabola / sin-cos / 二次方程曲线等「曲线 step」想扩展只能改 core。
- 需要与 `ShapeDefinition` / `CompileOptions.shapes` 同构的注册注入面：外部包注册曲线生成器，core 不内置任何具体曲线。
- IR 必须 100% JSON 可序列化——generator 的 `params` 只能是 JSON 值（禁 function / `z.any`）；`paramsSchema` 须强约束到 JSON 并在注册 / 编译时验证。

## 决策：`PathGeneratorDefinition` + `CompileOptions.pathGenerators` + generator step kind

`{ kind:'generator', name, to?, params }` 进 `StepSchema` discriminatedUnion；`params` 类型 = `JsonObjectSchema`（递归 JSON 值，禁 function / undefined）。`CompileOptions.pathGenerators?: Record<string, PathGeneratorDefinition>`，未注册名编译期 throw。`PathGeneratorDefinition` / `PathGeneratorContext` 为 TS type（运行时注入、不进 IR）；签名真源见 `core/src/pathGenerators/types.ts`。

理由：

1. **IR 级注册、core 不内置曲线**：parabola / sin-cos / 二次曲线由外部包注册，core 一次提供注入面、以后不回头改（任何 adapter / 直接用 core 都享受，不限 react）。
2. **守 IR JSON 可序列化**：`params: JsonObjectSchema` + `paramsSchema: ZodType<IRJsonObject>` + `definePathGenerator` 注册时元校验。
3. **对齐已验证注册范式**：与 shape / arrow 同构，第三方可发包。

### 设计细节（具体决策）

- **`JsonObjectSchema`（新增 `core/src/ir/json.ts`）**：`z.record(JsonValueSchema)`，`JsonValue` = string/number/boolean/null/array/object 递归；禁 function / undefined。core 公开供外部 refine。
- **双 parse 护栏**：类型约束 `paramsSchema: ZodType<IRJsonObject>` 输出 JSON-safe，但 zod 自省难可靠证明「输出 only-JSON」，故真正护栏在 compile 运行时——`paramsSchema.parse(params)` 后再跑一次 `JsonObjectSchema.parse(parsed)`，即便外部传 `z.any()` / `z.function()`，最终非 JSON 输出（function / undefined / 循环引用）也被第二道 parse 拦下。`definePathGenerator(def)` 工厂只做注册时 best-effort 早报错，不作唯一保证。
- **`targetParams` 仅顶层 key**：哪些 params 是 Target（须放 params 顶层）；嵌套（`{ control:{ at:{id} } }`）/ 数组内 Target 不支持，JSON-Pointer / dot-path 寻址留未来扩展。
- **resolve 时序**：查表（未注册 throw）→ `paramsSchema.parse` → `JsonObjectSchema.parse` 二次确认 → `targetParams` 顶层值经 target resolve（复用 alpha.6 target lookup）成 `resolvedTargets` → `generate(ctx)` → splice `PathCommand[]` 进 path 命令流。
- **`generate` 返回 `PathCommand[]`**：低层命令（line / curve / cubic 等），不再走 step 编译（避免二次递归）；允许产含 move 的 sub-path（sin 波多段）。
- **游标推进**：generator 产段后 cursor 落在最后一个命令的终点（与现有 step 一致）。

### 被否决的选项

- **B：纯 react sugar 包**——外部发 `<Parabola>` 组件在 react 层算成 `curve` / `cubic` / `line` step。core 零改动，但 react 专属，直接用 core / 其他 adapter 不享受，与「IR 级注册」取向不符。可作补充存在，不替代注册面。
- **C：core 内置 parabola / sin-cos**——每加一种曲线改 core，用户明确反对（「否则以后还会有二次方程曲线」）。

## 不在本 ADR 范围

- **ArrowDefinition**→ [ADR-01](./01-arrow-definition.md)；**out/in·self-loop / 路径变换 / marking**→ [ADR-03](./03-curve-transform-marking.md)。
- **具体曲线**（parabola / sin-cos）：外部包，core 不实现（仅文档给示例代码）。

---

> **实现指针**：level `red`（动 `ir/path/step.ts` 新 step kind + 新 `ir/json.ts` + 新 `pathGenerators/` 注册面 + `compile/**` 解析 + 公开导出），向后兼容非 breaking（纯叠加新 step kind + 新 CompileOptions，core 不内置任何曲线）。真源以代码为准——`PathGeneratorDefinition` / `PathGeneratorContext` + `definePathGenerator`（`core/src/pathGenerators/{types,define}.ts`）、`GeneratorStepSchema`（`core/src/ir/path/step.ts`）、`JsonObjectSchema` / `IRJsonObject`（`core/src/ir/json.ts`）、`CompileOptions.pathGenerators` + generator 解析（`core/src/compile/compile.ts`、`core/src/compile/path/`）、target resolve 复用（`core/src/compile/path/anchor.ts`）、公开导出（`core/src/index.ts`）。测试在 `core/tests/compile/path-generator{,.adversarial}.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 待决策点）见本文件 git 历史。
