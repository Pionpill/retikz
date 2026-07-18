# 能力完备性与模块边界

> 本文是 retikz 能力性迭代的架构决策总纲。它定义能力域、包角色、完备标准和检查方法；各能力域自己的边界与检查项写在对应 completeness 文档中。

---

## 1. 定位与效力

能力完备性不是功能清单，也不是阶段性打分。它是一套长期判断框架，用来决定：

1. 一项能力解决什么问题，应由哪个能力域负责。
2. 主责包与协作包分别承担什么，不承担什么。
3. 能力是否形成内部通用表达、外部扩展入口和端到端消费闭环。
4. 缺口应在当前能力域补齐、下沉到依赖域、上移到宿主层，还是明确不支持。

所有影响公开能力、IR / schema、definition / registry、pipeline / lowering、Scene / manifest、跨包职责或 adapter 独有能力的迭代，都必须执行适用能力域的完备性检查。纯 bugfix、文案和行为等价重构仍受本文边界约束，但只需确认没有改变能力归属或闭环，不强制填写完整检查表。

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

## 3. 要解决的问题

完备性检查重点防止：

- 能力放错层，导致上层复制底层 IR、几何、数据或 renderer 语义。
- 只有内置实现，没有第三方可用的 definition / registry / options 入口。
- 只有 schema 或类型，没有 pipeline / compile 消费和可诊断失败路径。
- 只能在 React、Vanilla、demo 或单个 renderer 中成立，无法持久化或跨入口复用。
- 能产出视觉结果，但 provenance、locator、tests、docs 或 AI 可生成契约缺失。
- 为单次需求扩张能力域，留下无法维护的隐式职责。

## 4. 当前能力域与包角色

| 能力域                 | 主责包         | 解决的问题                                                      | 主要输入                             | 主要输出                                    | 关键协作包                                |
| ---------------------- | -------------- | --------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- | ----------------------------------------- |
| Drawing Complete       | `@retikz/core` | 后端中立的二维图形表达、扩展与编译                              | Core IR、definition、compile options | Scene、headless manifest                    | `math`、`render`、React / Vanilla、Tier 2 |
| Data Complete          | `@retikz/data` | 宿主无关的数据、字段、transform、statistics、输入解析与 lineage | Data IR、external data、definition   | data view、lineage / provenance             | plot、未来 chart / table / geo            |
| Visualization Complete | `@retikz/plot` | 把数据语义映射成 core 图形语义                                  | Plot IR、Data 能力、definitions      | Core IR、visualization provenance / locator | `data`、`core`、plot adapters             |

对应设计：

- [`Core 绘图完备设计`](../../packages/kernel/_notes/architecture/core-drawing-complete.md)
- [`Data 能力完备设计`](../../packages/viz/_notes/architecture/data-capability-complete.md)
- [`Plot 可视化完备设计`](../../packages/viz/_notes/architecture/plot-visualization-complete.md)

`@retikz/math`、`@retikz/render`、React / Vanilla adapters 当前不定义独立完备目标。它们的职责由就近 `AGENTS.md` 约束，并在所属能力域中承担纯计算、Scene 执行、等价暴露或运行时接入义务。未来 table、geo 等成为独立核心能力域时，必须先定义自己的问题边界和 completeness 文档。

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

## 7. ADR 必填检查

新增或改变能力边界的 ADR 必须加入：

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

不影响能力边界的 ADR 或 docs-only 收口可以写简版结论，但必须说明为什么不适用完整检查。

## 8. 治理关系

- 本文定义全仓能力域和决策方法。
- completeness 文档定义各能力域解决的问题、边界和闭环标准。
- 根与就近 `AGENTS.md`、`standard-*` skills 负责执行包职责和代码落层。
- ADR 证明单次迭代符合适用完备目标；roadmap 只安排已确认缺口的实施顺序。
- Alpha ADR 草案在人工确认和实现前，必须通过 `develop-completeness` 的 `adr-gate`：由新的只读 subagent 检查问题归属、包边界、define-registry 与端到端闭环，主 AI 修订后换新主体复检；最多 3 轮，仍未 PASS 时交人工决策。
- Beta milestone 在实施前和全部 TODO 集成后，分别对 Drawing、Data、Visualization 执行 `code-audit`。入口 findings 只生成候选 TODO，scope 经人工确认后才能实施；出口只允许自动修复已批准 scope 内的 beta 问题并换新主体复检，最多 3 轮。需要净新增公开能力、组件、IR、schema 或用户可见行为契约的缺口必须退回 Alpha 或延期。
- 自动派遣授权只覆盖只读审计；ADR 修订与 Beta 修复仍受对应 flow 和当前任务授权约束，不替代人工 scope、commit 或发布授权。

修改能力域定义、主责包或关键输入输出属于架构变更，必须同步受影响 completeness 文档和包级 AGENTS，并通过 ADR 说明迁移范围。不能为解释既有局部实现而悄悄放宽边界。
