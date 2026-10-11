---
description: 将 Runtime trace 的阶段与计数单位改为 owner 预声明的开放名称，由 Core 提供 IR 与 Scene 词汇，保留通用结果、有限声明与失败隔离
keywords: Runtime、trace、Core、owner、RuntimeTracePhaseDefinition、阶段声明、计数单位、解耦
---

# ADR-050：Runtime Trace 领域词汇由 Owner 声明并注入

- 状态：Accepted
- 决策日期：2026-10-10
- 关联：[v0.5 Roadmap](./roadmap.md)、[能力完备性与模块边界](../../../../../../notes/architecture/capability-design.md)、[包职能设计](../../../../../../notes/architecture/package-responsibility-design.md)、[Drawing Complete](../../../architecture/core-drawing-complete.md)、[010](./010-performance-observability-baseline.md)、[012](./012-computation-transaction-lifecycle.md)、[013](./013-incremental-core-compile.md)、[014](./014-scene-patch-retained-renderer.md)

## 背景与目标

Runtime 提供领域中立的执行观测底座，却在公开 trace 契约中定义了 `compile`、`commit`、`update` 阶段，以及 `ir-child`、`scene-primitive`、`scene-change` 等计数单位。即使 Runtime 没有导入 Core，这些封闭词汇仍使它承担了 Core IR、Scene 和后端执行的语义所有权；新的领域阶段也必须修改 Runtime 才能被表达。

目标是让 Core 将自身的阶段和计数单位注入 Runtime，并让其他 owner 通过同一契约声明自己的观测语义。开放名称不能取消有限预算、固定 owner、确定性计数与失败隔离。

## 决策：领域 Owner 定义词汇，Runtime 校验声明和记录

`phase` 与 `unit` 改为开放字符串，由发出记录的 owner 预先声明。复用 `RuntimeTracePhaseDefinition`：Computation 和 Participant 通过已有 `tracePhases` 注入，独立执行入口通过 `createRuntimeTraceReporter({ owner, phases, sink })` 注入。内置与第三方 owner 使用完全相同的声明、校验和报告机制。

Runtime 保留 `PerformanceTraceOutcome` 的通用封闭取值：`full`、`incremental`、`bailout`、`fallback`、`commit`。它拥有记录结构、owner 绑定、声明快照、计数不变量及诊断隔离，不解释阶段名称或被计数实体的领域含义。

领域词汇的所有权如下：

| Owner                               | 拥有的观测语义                                                                              | 注入方式                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Core                                | Core 完整编译与增量更新阶段；IR child、Scene primitive 和 Scene change 的计数单位及领域口径 | 为自身公开执行入口和 Computation 提供相应声明；共享 Scene 单位通过 Core 公开契约提供 |
| Render                              | SVG / Canvas 等后端提交和更新阶段及其发射规则                                               | 为完整渲染入口和 Participant 提供相应声明；计数 Scene 实体时复用 Core 的公开单位词汇 |
| Plot / Table 等领域包与第三方 owner | 自身的 compile、lowering、layout 等阶段及领域计数口径                                       | 经同一声明入口注入；不修改 Runtime 的词汇表                                          |

Core 与 Render 不建立反向依赖，Runtime 不依赖任何领域 owner。Core 对共享 Scene 单位保持唯一语义真源；后端阶段仍由 Render 定义。没有实际报告需求的单位不因原常量表中曾存在而新增公开能力。

`owner` 区分执行归属，`phase` 区分该 owner 内的执行阶段。例如 Plot 与 Table 可以分别报告 `owner = '@retikz/plot'`、`owner = '@retikz/table'` 下的 `phase = 'compile'`；需要表达不同领域步骤时也可声明 `axis-layout` 或 `table-pipeline`。相同名称不意味着不同 owner 的计数可以直接合并，比较预算必须同时考虑 owner、phase 和 unit。

理由：

1. 领域 owner 才能定义计数对象、阶段边界和复用口径，Runtime 无需随着领域能力增加而更新封闭词汇。
2. 既有声明契约已经能够限定合法记录，开放名称无需引入全局 registry、动态注册 API 或第二条内置路径。
3. 单个执行定义仍只允许报告预声明的有限组合，预算可比较性与产品失败隔离不因名称开放而改变。

## 基础数据结构与公开契约

记录字段保持不变，阶段与单位直接使用字符串；执行结果仍由 Runtime 定义。以下为最小契约，现有 reporter 的 owner 字面量类型保留能力继续成立：

```ts
type PerformanceTraceRecord = Readonly<{
  owner: string;
  phase: string;
  unit: string;
  outcome: PerformanceTraceOutcome;
  visited: number;
  reused: number;
  changed: number;
}>;

type RuntimeTracePhaseDefinition = Readonly<{
  phase: string;
  unit: string;
  outcomes: ReadonlyArray<PerformanceTraceOutcome>;
}>;

type RuntimeTraceReporter<TOwner extends string = string> = Readonly<{
  owner: TOwner;
  report: (record: Omit<PerformanceTraceRecord, 'owner'>) => void;
  diagnostics: () => ReadonlyArray<PerformanceTraceDiagnostic>;
}>;
```

`PerformanceTraceDiagnostic.phase` 同样使用开放字符串，保留触发记录的原始阶段。映射到 Runtime 事务诊断时仍归入通用 `trace` 阶段，不将领域阶段写入 Runtime 事务诊断的封闭阶段类型。

Core 对外提供 Core 阶段词汇与共享 IR / Scene 单位词汇。独立 reporter 的创建者可复用这些公开词汇；Core 自身的执行定义负责注入实际允许的阶段、单位和 outcome 组合，不能把所有 Core 词汇自动授予任意 owner。

同一阶段允许声明多个计数单位。例如 Core 的 `update` 可以分别声明 `ir-child` 和 `scene-change`，各自具有独立的允许 outcome 集合。声明中的唯一组合是 `phase + unit`，不是单独的 phase。

## 行为、失败语义与兼容性

- **声明与默认**：Computation / Participant 的 `tracePhases` 继续默认为空，空声明集合合法但不允许报告任何记录。独立 reporter 使用调用方显式提供的 `phases`。声明在 Definition / reporter 创建时形成不可变快照，修改原始数组或对象不影响已经创建的能力；执行期间不能追加阶段、单位或 outcome。
- **名称与归属**：名称按精确字符串相等比较，不进行大小写转换、trim、别名映射或隐式 namespace 拼接。owner 在 reporter 创建时固定且不能为空；`report()` 不接受 owner 字段，不允许覆盖归属。Runtime 不设置领域名称白名单，也不为某个包提供隐式内置声明。
- **声明失败**：重复 `phase + unit` 或空 outcome 集合使定义创建失败，沿用 Runtime 的 `TraceDefinitionInvalid` 错误契约。outcome 的封闭取值由 TypeScript 契约保证；不为纯 JavaScript 调用额外建立一套内部类型校验。
- **记录校验**：报告必须精确匹配已声明的 phase、unit 和允许 outcome。visited、reused、changed 均为非负 safe integer；reused 和 changed 分别不得大于 visited，二者不要求互斥或相加等于 visited。bailout 必须满足 changed = 0。Runtime 不验证领域实体数量，领域 owner 对实际计数与发射口径负责。
- **失败隔离**：未声明组合、非法计数、sink 抛错和同 reporter 重入继续产生 `invalid-record`、`sink-threw` 或 `reentrant-report` 诊断，不使产品路径抛错，不改变 Scene、事务结果或 revision。diagnostics 继续返回并清空报告器局部诊断。无 sink 的 Runtime 执行仍保留记录校验，且不产生外部报告副作用。
- **官方记录**：迁移词汇所有权不改变已有 Core / Render 的 owner、phase、unit 字符串、计数含义、发射次数和 full / incremental / fallback 语义。领域完整入口与 Computation invocation 的既有发射边界继续成立，不重复报告同一次工作。
- **兼容性**：删除 Runtime 的 `PerformanceTracePhase`、`PerformanceTraceUnit` 常量对象及其派生封闭类型，不保留旧名别名、兼容出口或自动声明。依赖这些出口的调用方改用领域 owner 的公开词汇，或直接在自己的声明中提供名称；记录消费方按完整 owner / phase / unit 判断语义，不能假设阶段和单位只有原先的取值。
- **关联决策**：本 ADR 替代 ADR-010、ADR-012 中 phase / unit 的封闭取值与 Runtime 词汇所有权约束。有限预声明、通用 outcome、计数规则、观测与产品隔离，以及 ADR-013 / ADR-014 的领域执行口径继续有效。
- **React / Vanilla 等价性**：没有新增 authoring IR 或框架专属注册入口。React 继续通过 Vanilla 复用同一 Core / Runtime / Render 链路；相同执行工作产生相同观测语义，框架接线不得重新定义领域阶段或单位。
