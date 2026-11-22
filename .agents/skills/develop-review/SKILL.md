---
name: develop-review
description: Use when auditing a retikz module or subsystem read-only to find beta cleanup, refactor, correctness, schema, test, or docs consistency findings before deciding which items become roadmap TODOs.
---

# Develop Review: 模块级只读审计

对一个 workspace 包或子系统做横向通读，输出可 triage 的分级报告。本 skill 只发现问题，不改产品代码、不改 roadmap、不提交。

## 边界

| 场景                              | 用哪个 skill                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| 横向审一个模块，找 beta TODO 候选 | develop-review                                                    |
| 审计已有测试是否过期、重复或临时  | test-review                                                       |
| 用户明确要求固定快照多模型评审    | cross-review                                                      |
| 为疑似 bug 写测试坐实             | cross-test                                                        |
| 已登记 TODO 要修                  | [beta](../flow-development/references/beta.md)                    |
| 新功能 / 新 IR / 新公开字段       | [alpha](../flow-development/references/alpha.md) / develop-design |

需要用户确认时，按[全仓执行策略](../../../AGENTS.md#任务规模与执行策略)说明检查粒度、覆盖范围及建议。

## 启动前

1. 用户声明范围：整个包（如 `@retikz/core`）或子系统 / 路径集。
2. 记录基线：

```bash
git rev-parse HEAD
git status --short
```

3. 判断所属分组版本通道：kernel 组看相关 package 当前版本；plot 等 Tier 2 看对应 package。非 beta 也可做盘点，但报告注明“非 beta，仅供整理参考”。
4. 范围过大时先建议拆分，不硬做全仓审计。

## 必读规则

- 根和就近 `AGENTS.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应层级 references。
- 涉及文档一致性时读 `apps/docs/AGENTS.md` 和必要 docs skill。

## 审查维度

- 按[设计边界](../develop-design/SKILL.md#产物边界)核查疑似过度设计：区分真实生产者、仅透传的消费者与测试夹具，并核对已批准的需求；测试能跑通不等于当前业务需要。

- 补查 Oxlint 未覆盖的约束：按 `standard-name` 检查泛型命名与 export 顺序；生产源码不得创建或调用原生 Error 家族及 `globalThis` 变体，只有 `RetikzError` 可直接继承原生错误，派生类遵循根 AGENTS 命名契约
- 改动涉及 React Compiler 配置或 gating 时，核对官方配置契约、gating 函数的导入和布尔返回语义；不以 lint 通过代替此项审查
- 删除泛型前追踪输入输出关联、推断返回类型和调用方约束，不按名称或出现次数判冗余；简化 key 泛型时同步检查残留名称类型、取键分支和集合表示，不用 `Record<string, T>` 假定任意键都存在
- 审计包根或公开子路径时，按 [公开导出收敛](../standard-structure/references/imports.md#公开导出收敛) 逐项核对真实消费与公开必要性，报告明确消费证据、保留依据和收敛层级，不用零 import 或测试 / Docs 引用数直接决定去留
- 重点审查重复校验：沿真实调用链核对 schema / parse / 上游校验已提供的保证，以及后续变换是否可能使保证失效；无新增约束的下游重复检查应列为简化项。finding 同时指出上游保证与重复检查的位置，不仅凭字段类型或单处分支判定

- 审查包装类型是否同时暴露完整对象及其可推导字段；沿构造与消费链确认是否始终来自同一事实源。无独立语义的投影留给消费者，身份、生命周期或适配输入不同的字段不因同名判重

每条 finding 必须有代码位置和成因，不能只写“可以优化”。

1. **结构**：目录职责、barrel 边界、同级模块 import、文件过大 / 过碎、层级归属、Kernel / Sugar / Tier 2 边界。
2. **正确性与类型安全**：边界值、引用解析、重复调用、错误诊断、React / Vanilla 或 plot adapter 对等、`as any` / ignore / 非必要断言、测试覆盖。按 TypeScript 信任边界重点检查：内部已声明明确类型的核心逻辑中，不应堆积与业务无关的 `unknown`、`typeof`、`Array.isArray`、对象结构探测和对应 `throw`；JSON / 持久化等外部数据应在 parser / schema / adapter 入口校验一次，内部不重复防御。区分真正的入口校验、业务不变量和查找失败诊断，不要把这些必要检查误判为冗余。若审查目标是测试资产本身是否过期、重复或临时，转用 `test-review`，不要在本 skill 中混合展开。
3. **复用与简化**：重复实现、死代码、可下沉 shared / math / core 的工具、过度工程、热路径重复计算，以及纯内部对象上无意义的 `Object.freeze`；只有公开输出或外部可获取的对象才需要冻结。
4. **schema / 数据结构 / AI 友好**：JSON 可序列化、zod `.describe` 完整与质量、const object enum、非法状态不可表达、同名同义。
5. **文档一致性**：public API、props、IR 字段、默认值、demo、zh/en 是否与当前代码一致。纯内部范围可标不适用。

命名审查直接读取 standard-name 的适用 references；finding 给出位置、误导原因与建议名称，不再维护第二套命名清单。

## 按需执行检查

- 结构或阶段重构按 [standard-structure](../standard-structure/SKILL.md) 核对输入、产物、依赖就绪点及状态生命周期，不以文件搬迁或命名合规代替职责收敛。
- 涉及阶段缓存或 prepared 时，沿生产调用链核对有效性判定、实际传参与资源 / 诊断恢复；按 [原子阶段与驱动](../standard-structure/references/pipeline-compile.md#原子阶段与驱动) 区分底层支持、驱动接入和已验证收益，不以产物存在证明可复用。
- 性能结论按 [test-performance](../test-performance/SKILL.md) 核对操作边界、预算、对照与退化证据；只读 review 不自动授权性能重跑。
- 按 [实现规范](../develop-implement/SKILL.md#按需执行) 检查成功路径提前创建错误、未采用的回退计算、缓存命中前的无用工作及 React 昂贵初始化；追踪实参求值和被调函数的消费分支，不凭函数名或扫描命中判错。
- finding 说明哪些路径未消费结果、调用频率依据及可安全后移的边界；区分确定的无用工作与未测量的耗时，不把必要校验、缓存键 / 快照或已在失败分支中的诊断误报为问题。

## 可选：成员引用与公开 API 收敛

默认不执行。发版前推荐开发者使用以收敛公开 API、清理无效内部内容；先取得用户对统计范围和 LLM 审阅的明确批准。“发版”“全量验证”或普通 review 不构成授权，不接入默认检查、CI 或自动发布链路

```bash
pnpm review:members --package @retikz/core --output notes/reports/core-member-usage.json
pnpm review:members --package packages/kernel/core --output notes/reports/core-member-usage.json
pnpm review:members --all --output notes/reports/all-member-usage.json
```

- `--package` 与 `--all` 必须二选一；单包只筛选报告成员，仍扫描全部包及生产 app 的 TypeScript 源码作为消费者。无 `--output` 时输出 JSON；报告留在 ignored `notes/reports/`
- 公开面以 `package.json` 的显式 `exports` 为准，根入口与子入口同等审阅；没有根映射的合法子路径包不要求 `src/index.ts`。先核对 `publicEntries`、`missingEntries` 与 `unclassifiedExports`，通配符、条件分支差异和非源码目标须补查，不按目录存在推断公开 API
- 查看 `scannedFiles`、`unresolvedModules`、语法诊断和局限后再读统计。排除 tests、evals、benchmarks、docs 及对应测试文件；类型引用计入有效引用，声明不计，import / 转导出与自引用单列
- 对 `publicExports` 中每个根入口或子入口导出，按 `subpath` 分组，由 LLM 阅读声明、公共签名和消费链，判断是否直接服务包使命、是否值得向用户公开；仓内零引用不是删除依据。同一符号可从多个入口公开，导出的对象、类、类型所暴露成员仍需人工补查
- 对内部成员，以有效引用位置核实真实消费者；零引用只作为候选。细读动态访问、回调注册、结构类型隐式使用、对象展开及循环互引，不能将静态引用次数等同于运行可达性
- 报告分别列出公开 API 保留 / 收敛建议、内部冗余候选、证据及未覆盖范围；未解析模块或特殊包配置影响的成员不得标为“确定无引用”。删除、改导出与后续实现另按任务规模确认，不由脚本自动修改

## 分级

- **BLOCKING**：真实 bug、非法状态、会阻碍后续设计收敛的结构问题。
- **WARNING**：维护性或一致性风险，如重复实现、命名漂移、抽象不一致、文档落后。
- **INFO**：低优先清理或值得保留的良好模式。

预估 Level 按修复方案触及范围写：`internal` / `visible` / `breaking`，与严重度独立。

## 报告

结果字段与留档按 [报告格式](references/report.md)。只报告有证据的发现，空类别注明无，不强制赞扬或凑数。

## 完成标志

- 报告声明了范围、基准、版本通道和覆盖率。
- finding 都有位置证据、成因、建议和预估 Level。
- 高风险项标明是否建议在后续大型任务最终阶段使用 `cross-review`，或用 `cross-test` 坐实；本次审计不自动调度。
- 审计后 `git status --short` 与基线相比，除 ignored 报告外没有产品文件变化。
