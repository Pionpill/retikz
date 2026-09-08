# ADR-03：以 Zod parse 统一 Source 输入校验边界

- 状态：Accepted
- 决策日期：2026-09-04
- 关联：[alpha.4 roadmap](./roadmap.md) · [alpha.2 ADR-14](../alpha.2/14-foundation-package.md) · [alpha.2 ADR-17](../alpha.2/17-foundation-schema-primitives.md)

## 背景与目标

Retikz 的可持久化 Source IR 以 Zod schema 为运行时真源，但当前部分包会在 schema 前后额外递归检查 JSON 容器、复制或冻结数据、清理已知 `undefined` 字段，另一些 schema 又单独拒绝 optional 字段中的显式 `undefined`。同一份输入因此可能经过多次全树遍历，并产生不同于 Zod 的字段、错误与投影语义。

这些额外步骤没有形成独立的领域契约。Zod 已负责字段类型、闭合对象、递归 JSON 值、默认值、结构投影与跨字段 refinement；`parse` 的返回值就是后续阶段应消费的已解析结构。为 Source 再增加一套 JSON 预处理会建立平行真源，也会给每次输入增加额外的 `O(N)` 时间与空间成本。

本 ADR 的目标是让 owner schema 成为 Source 输入唯一的校验与结构投影边界，同时保留确实需要隔离第三方 callback 变异或维护公开只读结果的 runtime 快照职责。

## 决策：每个输入边界只使用其 owner schema 的 parse 结果

unknown、持久化数据或公开 Source producer 在进入明确的领域边界时，直接调用该 owner 的精确 schema，并把 `parse` 返回值作为后续唯一输入：

```ts
const source = SourceSchema.parse(input);
```

同一输入边界不得在 `parse` 前后再以校验或结构投影为目的执行通用 JSON preflight、全树 snapshot、额外 clone / freeze、`undefined` 清理或同义的通用 JSON schema 复核。公开 compile、resolve、lower 与 emit 已接收明确的 `IRXxx`、Canonical 或 Resolution 类型时，信任其 TypeScript 契约，不重复解析上游已经拥有的结构。

开放 Definition 的精确 schema 仍是动态 dispatch 后必需的领域边界。通用 Source schema 负责保存开放 operation 的 JSON 形态，选中的 Definition schema 负责该注册项的精确字段契约；两者不得再以通用 JSON parse 包裹同一结果。开放对象需要约束额外字段时，应由其 Zod schema 直接组合 JSON value / catchall 契约，而不是在 refinement 中再次解析整棵对象。

Zod 自身决定 optional 字段的缺失与显式 `undefined` 语义。各包不再统一拒绝、删除或重新解释已知 optional `undefined`；非空、互斥、引用有效性等真实领域不变量继续由 owner schema 或领域 resolve 负责。严格对象的未知字段、必填字段中的 `undefined` 与递归 JSON value 中的非法叶子仍按对应 Zod schema 失败。

runtime Definition、Inspector、layout、TeX、spatial payload 与公开只读结果等边界若必须隔离对象变异，可以继续使用既有 `cloneAndFreezeJson` 或 owner 专属 runtime guard；即使数据此前已经经过 schema，独立的冻结契约仍可保留。此类操作不参与 Source 输入校验，不得触发第二次领域 schema parse，也不应为了统一形式新增持久化 schema。

理由：

1. schema 是 Source IR 的既有单一真源，`parse` 同时完成校验、结构投影并返回独立的已类型化结果
2. 删除 schema 外的同义 JSON 遍历可以避免重复的 `O(N)` 工作、错误分叉与跨包 helper 编排
3. optional `undefined`、未知字段和递归 JSON 值均应遵循实际 schema，而不是由全仓隐式规则覆盖领域契约
4. 通用 JSON 值与对象不包含 Core 绘图语义，应由 Foundation 提供原子类型与 Zod schema；runtime callback / 公开只读结果的变异隔离仍是与 Source 校验不同的职责

## 基础数据结构与公开契约

Foundation 统一公开无领域的 `JsonValue`、`JsonObject`、`JsonValueSchema` 与 `JsonObjectSchema`。递归 JSON schema 直接使用 Zod 的 JSON schema 能力；不再维护手写递归 walker 或额外的 `parseJsonValue`。Core 与其它领域包直接消费 Foundation 契约，不转手导出，也不保留带 Core IR 所有权暗示的 `IRJsonObject`。

各领域继续公开自己的 `XxxSchema` 与由其推导的 `IRXxx`；通用 JSON schema 只作为字段、开放 catchall 或确实以任意 JSON 为完整输入的 owner schema。调用方需要从 `unknown` 获得领域 Source 时，仍直接使用对应领域 schema 的 `parse` / `safeParse`，不得用通用 JSON schema代替精确 owner schema。

Foundation 继续保留既有 `cloneAndFreezeJson`，只服务具有独立 mutation-isolation 或 immutable-output 契约的数据边界，不作为 Source 输入 parser。不会新增 `snapshotJson`、`omitKnownUndefinedProperties`、`findUndefinedJsonPaths`、`hasDefinedOwnFields`、`parseJsonValue` 或其它通用 Source parser。

## 行为、失败语义与兼容性

- 默认行为：输入只由当前 owner schema 解析一次，后续阶段使用其返回值。optional 字段中的显式 `undefined` 是否保留、默认值是否写入以及对象如何投影，完全遵循当前 Zod schema
- 失败与诊断：字段类型、未知字段、递归 JSON 值和跨字段问题由 Zod 原生 issue 表达，不额外承诺手写 walker 的容器类别、循环引用或深层路径文案；公开 owner 可以在自身错误边界包装 `ZodError` 并保留为 `cause`，但不得先生成一套 Foundation JSON 错误。动态 Definition 的未注册、回调失败和上下文不变量继续由领域错误报告
- 性能：不为 Source 校验增加 schema 之外的全树遍历、复制或冻结。schema parse 本身仍按输入结构执行必要工作；动态 Definition 的精确 schema parse 只承担其独立的开放能力契约；独立 runtime 隔离只在其所有权边界支付快照成本
- 兼容性 / breaking：此前专门拒绝 optional 显式 `undefined` 的 schema 改为遵循 Zod optional 行为；此前在 schema 前后报告 plain-container、snapshot 或通用 JSON 错误的路径改为报告 owner schema 结果。通用 JSON 类型与 schema 从 Core 移至 Foundation，`IRJsonObject` 更名为 `JsonObject`，Core 不保留兼容导出；`cloneAndFreezeJson` 的公共名称和 runtime mutation-isolation 行为保持不变
- React / Vanilla 等价性：React 继续复用对应 Vanilla authoring 链；同一个 Source producer 只使用领域精确 schema，不建立 adapter-local JSON 清理或二次解析。直接 Source、Vanilla、React 与 SSR 在进入同一 owner schema 后共享相同结构与诊断语义

## 结果

Source 与开放 Definition 已统一消费所属 Zod schema 的解析结果，字段投影、optional `undefined` 和失败路径不再被通用 JSON 处理覆盖；通用 JSON 原子契约由 Foundation 单一拥有，Core 不再维护递归 JSON walker；需要不可变性的 runtime callback 与公开输出继续在各自边界独立隔离。

无持久化 schema 的 runtime Definition 仍由领域 owner 的专用 guard 负责，后续新增此类边界时需要分别证明其校验与变异隔离职责，不能复用为 Source 预处理。
