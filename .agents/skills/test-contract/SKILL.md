---
name: test-contract
description: Use when a retikz ADR or beta TODO changes data structures, public interfaces, compile semantics, adapter behavior, renderer output, or docs-visible behavior and needs a traceable behavior-to-test contract before implementation or final acceptance.
---

# Test Contract：设计行为到测试证据

把已确认的设计行为转成可观察契约。实现可以自由重构；只要每项契约仍有足够的测试证据，内部细节不构成验收对象。

## 边界

| 场景                             | 用哪个 skill              |
| -------------------------------- | ------------------------- |
| 从 ADR / TODO 定义行为和测试证据 | test-contract             |
| 审计历史测试是否重复或过期       | test-review               |
| 主动构造异常输入寻找缺陷         | cross-test / develop-test |
| 实施已接受的测试整理             | develop-refactor          |

本 skill 不决定产品设计、不写实现或临时探索测试，也不以覆盖率百分比代替契约。

## 输入与产物

Alpha 读取长期 ADR 与镜像 `PLAN.md`；Beta 读取 TODO / plan。再读取公开类型或 schema、相关实现边界、已有测试与 docs 页面。把详细矩阵写入与 ADR / TODO 同构的 ignored plan：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/alpha.1/01-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/alpha.1/01-example/TEST_CONTRACT.md
```

长期 ADR 只保留稳定测试策略摘要和关键不变量，不保留逐项 case、文件索引、路径、命令或执行清单。`TEST_CONTRACT.md` 与其它 plan 文件默认不 stage、不 commit。

每行必须使用行为名称，而不是 ADR 编号、内部函数名或历史阶段名：

| 行为                          | 可观察输入/输出   | 不变量     | 反例             | 最低层         | 上层证据  | 正式测试证据      | 验证命令 / 页面路径              | 状态   |
| ----------------------------- | ----------------- | ---------- | ---------------- | -------------- | --------- | ----------------- | -------------------------------- | ------ |
| React 与 Vanilla 表达同一节点 | 两入口产出等价 IR | 默认值一致 | 无效 prop 可诊断 | adapter parity | docs demo | `tests/...: case` | `pnpm --filter ... test:changed` | 已覆盖 |

## 选择最低测试层

| 行为边界                   | 最低层                | 必要时追加     |
| -------------------------- | --------------------- | -------------- |
| schema、默认值、JSON、错误 | schema / parser       | compile        |
| IR 到 Scene、引用、几何    | compile contract      | renderer       |
| React / Vanilla 同能力     | adapter parity        | compile        |
| Scene 到 SVG / Canvas      | renderer contract     | 小型 golden    |
| docs 示例、控件、错误展示  | component integration | page / browser |

优先在最低能证明行为的层测试；只有用户路径、跨层组合或真实 DOM / 路由才提升到 docs 或页面测试。Snapshot 只在它能表达用户可见语义时作为证据。

## 工作流

1. 从 ADR / TODO 逐条抽取用户可观察行为、默认值、失败语义、跨包边界和非目标，并核对 `PLAN.md` 没有重定义它们。
2. 为每条行为写一个不变量和至少一个能推翻它的反例；无法写反例时，回到设计澄清。
3. 指定最低测试层、需要的 adapter / renderer / docs 上层证据，以及现有测试能否复用。
4. 实现前将矩阵交给 `develop-implement`；实现后为每行填写正式测试证据、验证命令或页面路径，以及已覆盖 / 接受风险状态。
5. 收尾时核对每行仍有证据；缺失、被弱化或只能靠私有实现断言的行不得关闭。

发现问题时写入正确真源：

- 公开行为、默认 / 失败语义、能力归属或功能边界不清：halt，修订 ADR / TODO；Alpha 重新执行 Architecture Gate。
- 文件、测试位置、fixture、命令或证据映射不清：更新 `PLAN.md` / `TEST_CONTRACT.md`；物质性改变计划后重新执行 Plan Gate。
- 不得为了让测试可写而把具体 case、内部 helper 或测试路径反向塞进 ADR。

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
