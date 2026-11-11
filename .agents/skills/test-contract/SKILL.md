---
name: test-contract
description: Use when adding or changing retikz unit, integration, or regression tests, or when an ADR or beta TODO needs a traceable behavior-to-test contract before implementation or acceptance.
---

# Test Contract：设计行为到测试证据

把已确认的设计行为转成可观察契约。实现可以自由重构；只要每项契约仍有足够的测试证据，内部细节不构成验收对象。

## 边界

| 场景                             | 用哪个 skill                                            |
| -------------------------------- | ------------------------------------------------------- |
| 从 ADR / TODO 定义行为和测试证据 | test-contract                                           |
| 审计历史测试是否重复或过期       | test-review                                             |
| 主动构造异常输入寻找缺陷         | cross-test / [alpha](../cross-test/references/alpha.md) |
| 实施已接受的测试整理             | develop-refactor                                        |
| 单元性能基准、采样与报告         | [test-performance](../test-performance/SKILL.md)        |

本 skill 不决定产品设计、不写实现或临时探索测试，也不以覆盖率百分比代替契约。

## 单测写入规范

- 新增、修改、迁移或收敛单测时必读 [单元测试编写与 Review 规范](references/unit-tests.md)，统一一级 owner 分类与文件命名、正式测试准入、低价值 case 判定、schema 例外及临时测试生命周期。
- 测试可访问范围遵循 [导入导出的测试例外](../standard-structure/references/imports.md#测试访问例外)：私有实现经消费方验证，已有内部导出可深层导入，不因功能或性能测试扩大导出范围。

## 输入与产物

Alpha 在 ADR 人工确认且获准进入实现准备后，读取长期 ADR 与已同步创建的镜像 `PLAN.md`；Beta 读取 TODO / plan。再读取公开类型或 schema、相关实现边界、已有测试与 docs 页面。把详细矩阵写入与 ADR / TODO 同构的 ignored plan：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/001-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/001-example/TEST_CONTRACT.md
```

测试策略摘要和关键证据层保留在 `PLAN.md`；长期 ADR 不保留测试策略、逐项 case、文件索引、路径、命令或执行清单。`TEST_CONTRACT.md` 与其它 plan 文件默认不 stage、不 commit。

每行必须使用行为名称，而不是 ADR 编号、内部函数名或历史阶段名：

| 行为                          | 可观察输入/输出   | 不变量     | 反例             | 最低层         | 上层证据  | 正式测试证据      | 验证命令 / 页面路径              | 状态   |
| ----------------------------- | ----------------- | ---------- | ---------------- | -------------- | --------- | ----------------- | -------------------------------- | ------ |
| React 与 Vanilla 表达同一节点 | 两入口产出等价 IR | 默认值一致 | 无效 prop 可诊断 | adapter parity | docs demo | `tests/...: case` | `pnpm --filter ... test:changed` | 已覆盖 |

## 选择最低测试层

| 行为边界                     | 最低层                | 必要时追加     |
| ---------------------------- | --------------------- | -------------- |
| 自定义校验、解析与持久化语义 | schema / parser       | compile        |
| 继承优先级与默认应用时机     | resolve               | compile        |
| IR 到 Scene、引用、几何      | compile contract      | renderer       |
| React / Vanilla 同能力       | adapter parity        | compile        |
| Scene 到 SVG / Canvas        | renderer contract     | 小型 golden    |
| docs 示例、控件、错误展示    | component integration | page / browser |

优先在最低能证明行为的层测试；只有用户路径、跨层组合或真实 DOM / 路由才提升到 docs 或页面测试。Snapshot 只在它能表达用户可见语义时作为证据。

## 工作流

1. 从 ADR / TODO 抽取用户可观察行为、默认值与失败语义；从 `PLAN.md` 读取跨包边界、非目标和测试策略，并核对 plan 没有重定义 ADR 契约。
2. 为每条行为写一个不变量和至少一个能推翻它的反例；无法写反例时，回到设计澄清。
3. 指定最低测试层、需要的 adapter / renderer / docs 上层证据、既有测试复用与新增 case 的正式 / 临时去向；不因矩阵存在就为声明或每行机械追加永久测试。
4. 实现前将矩阵交给 `develop-implement`；实现后为每行填写正式测试证据、验证命令或页面路径，以及已覆盖 / 接受风险状态。
5. 收尾时核对每行仍有证据；缺失、被弱化或只能靠私有实现断言的行不得关闭。

发现问题时写入正确真源：

- 公开行为、默认 / 失败语义、能力归属或功能边界不清：halt，修订 ADR / TODO；Alpha 重新执行 Architecture Gate。
- 文件、测试位置、fixture、命令或证据映射不清：更新 `PLAN.md` / `TEST_CONTRACT.md`；物质性改变计划后重新执行 Plan Gate。
- 不得为了让测试可写而把具体 case、内部 helper 或测试路径反向塞进 ADR。

## 验证缓存

- 修改 workspace 依赖包源码后，在消费包运行 Vitest 验证时显式加 `--fsModuleCache=false`，确保结果来自当前依赖源码，例如 `pnpm --filter @retikz/render exec vitest run --fsModuleCache=false <test-file>`；不以可能复用旧模块的缓存结果作为跨包验收证据，不为单次验证修改全仓缓存配置。
- 源码目录重排、文件移动或删除后，受影响的 Vitest 功能测试与性能基准显式加 `--fsModuleCache=false`，避免模块缓存继续解析旧路径；不为单次验证修改全仓缓存配置。

## 常见错误

- 只列 happy path：必须列默认值、边界或错误反例。
- 每项都做页面测试：先用最低层获得快速、可定位的反馈。
- 用私有调用次数证明行为：改为输入、输出、错误、Scene 或 DOM 可见结果。
- 用行覆盖率证明设计完成：覆盖率只能报警，不能证明不变量或跨适配器等价。

## 完成标志

- 每个设计行为都有可观察结果、不变量、反例与最低测试层。
- React / Vanilla、renderer、docs 等需要对等或上层证据的行已显式标记。
- 实现后的矩阵每行都能指向具名测试或经人工接受的未覆盖风险。
- Alpha 矩阵位于 ADR 的 ignored 镜像 plan，未把执行细节回写 ADR。
