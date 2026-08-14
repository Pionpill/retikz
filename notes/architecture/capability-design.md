# 能力完备性与模块边界

> **状态：全仓能力性迭代的长期架构总纲。** 本文定义能力域、包角色、完备标准和检查方法，不维护具体功能清单；各能力域自己的边界与检查项写在对应 completeness 文档中，当前包职责以根与就近 `AGENTS.md` 为准。

---

## 1. 定位与效力

能力完备性不是功能清单，也不是阶段性打分。它是一套长期判断框架，用来决定：

1. 一项能力解决什么问题，应由哪个能力域负责。
2. 主责包与协作包分别承担什么，不承担什么。
3. 能力是否形成内部通用表达、外部扩展入口和端到端消费闭环。
4. 缺口应在当前能力域补齐、下沉到依赖域、上移到宿主层，还是明确不支持。

所有影响公开能力、IR / schema、definition / registry、pipeline / lowering、Scene / manifest、跨包职责或 adapter 独有能力的迭代，都必须执行适用能力域的完备性检查。纯 bugfix、文案和行为等价重构仍受本文边界约束，但只需确认没有改变能力归属或闭环，不强制填写完整检查表。

原子 schema、type、contract、theme token 与上层组合的长期规则见[`原子契约与组合设计`](./atomic-contract-design.md)。

## 2. 核心术语

### 2.1 能力域

能力域是一类问题的稳定语义边界，例如 Drawing、Data、Visualization。它定义输入、输出、扩展机制和不支持范围，不与 npm 包一一对应。

### 2.2 主责包

主责包拥有该能力域的契约真源，包括适用的 schema、contract、provider / registry 和 pipeline / compile。能力域边界变化必须先更新设计或 ADR，不能由单次实现反向决定。

### 2.3 协作包

协作包负责提供依赖能力、执行产物或暴露 authoring / runtime 入口。参与闭环不等于拥有上游语义；renderer 和 adapter 不得因为实现方便而私造平行 IR、扩展机制或领域规则。

### 2.4 有界完备

“完备”不是一次内置所有能力，也不是宣称可以表达世上一切图形或数据处理。它指：

> 在能力域明确边界内，新增同类语义时，可以通过统一机制扩展，无需绕开主责包、私造平行模型或依赖单一 adapter / renderer 特判。

### 2.5 原子化与组合

底层能力层对外导出的 schema、类型、contract、definition 与纯函数，应优先按稳定语义拆成可独立复用的原子契约，再由上层能力按需组合。这里的“原子”按可观察语义、不变量和扩展边界划分，不要求把每个字段都单独公开，也不允许按单一消费方复制出一套底层契约。

- 多个上层包以相同语义复用同一字段子集时，应优先把该语义下沉到拥有它的底层能力域
- 上层只在拥有自己的默认值、禁用字段、输入限制或领域组合语义时扩展、收窄或组合底层契约
- 上层反复从大型底层 schema `pick` / `omit` 出相同公开结构，是底层缺少命名原子契约的架构信号，应先评估下沉，而不是继续复制投影
- 原子化必须保持 JSON / IR / contract 的单一真源；不得因组合便利建立平行词汇、重复 registry 或仅服务一个消费方的底层 bundle

## 3. 要解决的问题

完备性检查重点防止：

- 能力放错层，导致上层复制底层 IR、几何、数据或 renderer 语义。
- 只有内置实现，没有第三方可用的 definition / registry / options 入口。
- 只有 schema 或类型，没有 pipeline / compile 消费和可诊断失败路径。
- 只能在 React、Vanilla、demo 或单个 renderer 中成立，无法持久化或跨入口复用。
- 能产出视觉结果，但 provenance、locator、tests、docs 或 AI 可生成契约缺失。
- 为单次需求扩张能力域，留下无法维护的隐式职责。

## 4. 当前能力域与包角色

| 能力域                         | 主责包             | 解决的问题                                                      | 主要输入                             | 主要输出                                    | 关键协作包                                              |
| ------------------------------ | ------------------ | --------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------------------------------- |
| Drawing Complete               | `@retikz/core`     | 后端中立的二维图形表达、扩展与编译                              | Core IR、definition、compile options | Scene、headless manifest                    | `math`、`runtime`、`render`、Standard、adapters、Tier 2 |
| Data Complete                  | `@retikz/data`     | 宿主无关的数据、字段、transform、statistics、输入解析与 lineage | Data IR、external data、definition   | data view、lineage / provenance             | plot、table、未来 chart / geo                           |
| Visualization Complete         | `@retikz/plot`     | 把数据语义映射成 core 图形语义                                  | Plot IR、Data 能力、definitions      | Core IR、visualization provenance / locator | `data`、`standard`、`core`、plot adapters               |
| Tabular Visualization Complete | `@retikz/table`    | 把数据或显式内容组织成具有二维语义结构的表格                    | Table IR、Data 能力、definitions     | Core IR、table manifest / lineage           | `data`、`standard`、`core`、table adapters              |
| Diagram Notation Complete      | `@retikz/notation` | 提供可独立绘制并可被关系模型复用的图式语义元素                  | Notation schema、Core children       | Core IR、局部 artifact / identity           | `standard`、`core`、notation adapters、未来 graph       |

对应设计：

- [`Core 绘图完备设计`](../../packages/kernel/_notes/architecture/core-drawing-complete.md)
- [`Data 能力完备设计`](../../packages/viz/_notes/architecture/data-capability-complete.md)
- [`Plot 可视化完备设计`](../../packages/viz/_notes/architecture/plot-visualization-complete.md)
- [`Table 表格可视化完备设计`](../../packages/viz/_notes/architecture/table-visualization-complete.md)
- [`Diagram 制图能力域设计`](./diagram-design.md)
- `packages/diagram/_notes/architecture/diagram-notation-complete.md`（随首个 Notation ADR 建立）

`@retikz/math`、`@retikz/runtime`、`@retikz/render`、React / Vanilla adapters 当前不定义独立完备目标。它们的职责由就近 `AGENTS.md` 约束，并在所属能力域中分别承担纯计算、领域中立增量执行、Scene 执行、等价暴露或宿主接入义务。未来 geo 等成为独立核心能力域时，必须先定义自己的问题边界和 completeness 文档。

`@retikz/standard` 是 Drawing Complete 在 Core 之上的官方通用 Tier 2 能力层。它相对 Core 保持可选安装，但 Plot、Table、Notation 等官方领域包可以把已经去除领域词汇的绘图能力作为声明依赖消费；依赖只能从领域包指向 Standard，Standard 不得读取领域 IR、scale、数据模型、pipeline 或 runtime。领域包仍拥有从自身语义解析到 Standard 输入的过程，以及 provenance、locator、交互意图和领域诊断。

`@retikz/notation` 是 Diagram 领域的基础语义元素层。它拥有图式中的节点、容器、局部连接与说明语义，但不拥有 GraphModel、全局拓扑、算法布局或编辑状态。Core Sugar 直接输出 Core IR；需要局部布局、target 或 artifact 的元素通过公开 Standard / Core capability lowering。未来 Graph 可以单向依赖 Notation，Notation 不反向依赖 Graph、Flow 或 Editor。

## 5. 完备性的三个维度

每个能力面都同时检查三条线：

1. **内部表达**：主责包是否能用通用抽象表达和实现，不依赖 chart type、demo、adapter 或 renderer 特判。
2. **外部扩展**：自定义能力是否与内置能力走同一 contract、registry 和消费路径，API 是否可诊断。
3. **端到端闭环**：上游输入、主责包处理、下游产物、tests、docs 和必要的跨入口行为是否一致。

内置功能可用但无法扩展，只能算内置覆盖；adapter 能展示但主责包不能表达，只能算局部实现；两者都不能称为能力完备。

## 6. 迭代检查方法

能力性迭代按以下顺序判断：

### 6.1 归属

- 这项能力解决的根问题是什么？
- 哪个能力域拥有这类语义？
- 主责包、依赖域和宿主层分别负责哪一段？

### 6.2 表达与扩展

- 现有能力能否组合表达？
- 是否需要新 schema / contract / definition？
- 底层是否已经提供可组合的原子契约？若多个上层反复对同一大型 schema 做相同 `pick` / `omit`，应优先评估把该语义下沉到拥有它的能力域
- 内置与自定义是否经过同一 registry、pipeline / compile 和诊断路径？

### 6.3 闭环

- 主责包的输入、处理和输出是否完整？
- 依赖包是否已经提供必要底座？
- 下游 renderer / adapter 是否能实现、等价暴露或明确诊断降级？
- tests、docs、provenance / locator 是否覆盖适用边界？

### 6.4 结论

检查必须落到以下一种结论，不能停在“先局部实现”：

- 用当前能力组合表达，不新增底座。
- 扩展当前能力域并补齐完整链路。
- 先下沉补依赖能力域，再由当前域消费。
- 上移到宿主、preset、adapter 或 renderer 私有能力，并明确不进入主责包契约。
- 明确不支持或延期，记录原因、影响和后续入口。

## 7. ADR 设计配套检查

新增或改变能力边界的 ADR 必须在草拟时同步创建镜像简略 `PLAN.md`，并在 plan 中加入：

```md
## 能力完备性检查

- 所属能力域与能力面：
- 解决的问题：
- 主责包与协作包：
- 是否可由现有能力组合：
- 是否需要下沉到依赖能力域：
- 内部表达链路：
- 外部扩展链路：
- 下游执行 / adapter 等价性：
- 不支持边界与诊断：
- 本轮结论：组合 / 扩展当前域 / 下沉 / 上移 / 不支持或延期
```

不影响能力边界的 ADR 或 docs-only 收口可以在 plan 中写简版结论，但必须说明为什么不适用完整检查。ADR 本身只保留由这些检查冻结的核心决策、必要公开契约、行为、失败语义与兼容性，不重复保存检查过程。

## 8. 治理关系

- 本文定义全仓能力域和决策方法。
- completeness 文档定义各能力域解决的问题、边界和闭环标准。
- 根与就近 `AGENTS.md`、`standard-*` skills 负责执行包职责和代码落层。
- ADR 冻结单次迭代的长期公开决策，镜像 plan 证明它符合适用完备目标；roadmap 只安排已确认缺口的实施顺序。
- Alpha ADR 与同步简略 plan 在人工确认和实现前，必须共同通过 `develop-completeness` 的 `adr-gate`。主 agent 先自审；只有已确认执行计划授权时才增加一个只读 reviewer，并在修订后复用同一 reviewer 检查新快照。循环上限以计划为准，达到上限仍未 PASS 时交人工决策。
- Beta milestone 在实施前和全部 TODO 集成后，分别对 Drawing、Data、Visualization 执行 `code-audit`。入口 findings 只生成候选 TODO，scope 经人工确认后才能实施；出口只允许修复已批准 scope 内的 beta 问题。需要净新增公开能力、组件、IR、schema 或用户可见行为契约的缺口必须退回 Alpha 或延期。
- subagent、reviewer 与评审轮次必须来自已确认的任务计划，不存在自动派遣授权；ADR 修订与 Beta 修复仍受对应 flow 和当前任务授权约束，不替代人工 scope、commit 或发布授权。

修改能力域定义、主责包或关键输入输出属于架构变更，必须同步受影响 completeness 文档和包级 AGENTS，并通过 ADR 说明迁移范围。不能为解释既有局部实现而悄悄放宽边界。
