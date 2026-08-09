# 原子契约与组合设计

> **状态：全仓长期架构设计。** 本文定义 schema、type、contract、theme token 与纯函数的原子化边界、单一真源和上层组合规则，供 Kernel、Standard、Data、Plot、Chart、Table 及未来能力域参考。本文不冻结某个版本的具体字段、文件、preset 值、实现步骤或测试路径；这些内容由所属能力域的 ADR、代码和文档维护。
>
> 相关设计：[`能力完备性与模块边界`](./capability-design.md) · [`IR JSON-Schema 产物设计`](./schema-design.md) · [`通用视觉主题设计`](./visual-theme-design.md) · [`Core 原子绘图契约与 Tier 2 / Tier 3 组合边界`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/10-core-atomic-contracts.md) · [`Standard Drawing Library 设计`](../../packages/library/_notes/architecture/standard-library-design.md)

---

## 1. 定位与问题

Retikz 的底层契约会同时被完整 IR、Standard composite、Plot / Chart / Table 等 Tier 2 / Tier 3 能力、React / Vanilla adapter 和 headless consumer 使用。如果上层只能从大型 schema 偶然 `pick` / `omit` 字段，或者分别手写同义 type、默认值、token 和 mapping，就会产生以下长期风险：

1. 上层依赖底层字段的偶然组织，而不是依赖稳定、可命名的语义
2. schema、type、lowering、merge、inspection 和 manifest 出现多份字段白名单
3. 一个输入被 schema 接受，却在后续消费阶段被静默丢弃
4. 为消除一次投影而把领域默认、禁用字段或 preset 下沉成过大的底层 bundle
5. 同一语义在不同包、adapter 或 renderer 中出现平行词汇和不同约束

原子化的目标不是把所有字段拆成最小字段，而是让稳定语义拥有可独立复用的契约，再由真正的 owner 组合为完整能力。

## 2. 核心决策

### 2.1 原子边界按语义划分

一个公共原子契约应同时具有以下特征：

- 表达稳定、可观察的语义，而不是某个文件的字段切片
- 拥有独立的不变量、失败边界或扩展边界
- 被两个或以上能力、组合或入口以同义方式复用，或已经明确属于底层能力域
- 可以独立说明 schema、type、contract、消费方和诊断责任
- 组合后仍能追溯每个字段的 owner 和最终 consumer

以下情况不构成原子化理由：

- 仅仅因为字段数量少
- 仅服务一个上层 consumer 的临时 `pick` 结果
- 只为减少一次 import 而预先固化的底层 bundle
- 需要依赖具体 preset、renderer、adapter 或领域 recipe 才能解释的对象

原子化按可观察语义、不变量和扩展边界划分，不按字段数量机械拆分。

### 2.2 Owner 先于复用

复用必须服从语义 owner，而不是服从当前代码位置或表面字段相似度：

1. 先确定语义由哪个能力域拥有
2. 再检查该 owner 是否已经有权威原子契约
3. 多个上层使用同义语义时，消费方复用 owner 的原子契约
4. 上层自己的默认值、禁用字段、输入收窄、领域组合和 mapping 仍由上层拥有
5. 如果底层没有稳定原子契约，先在正确 owner 增加命名契约，再由上层消费

相似的字段名或相同的底层值类型不自动表示相同语义。例如 Chart canvas fill 与 Table cell background 都可以使用 Core paint 原子，但它们不因此成为同一个领域 token。

### 2.3 单一真源与端到端闭环

每个原子字段的接受约束、派生类型、默认语义、失败语义和最终消费必须能追溯到同一权威契约。schema 通过但 pipeline、lowering、merge、inspection 或 manifest 不消费的字段，视为契约缺口，不得静默忽略。

完整能力可以由多个原子组合，但组合不得复制叶子约束、建立平行词汇、重复 registry 或绕开既有 JSON / IR / compile 真源。

## 3. Schema、Type 与 Contract

### 3.1 Schema 是数据契约真源

IR 和 JSON-safe authoring 数据的 schema 负责：

- 字段名称、形状和 JSON 可序列化边界
- 字段级约束、未知字段拒绝和默认语义
- 需要时的跨字段、跨 kind 不变量
- 面向 schema registry、文档和工具的契约描述

公开数据类型从权威 schema 派生。不得为同一 JSON / IR 形状另写平行 interface 或重复字段约束。

原子 schema、兼容聚合 schema 和最终能力 schema 的关系如下：

```text
稳定语义原子 schema
  -> owner 组合 / 收窄 schema
  -> 完整 IR / authoring schema
  -> provider / contract / pipeline 消费
  -> Core IR、Standard input、Scene 或 manifest
```

原子 schema 只负责自己的局部约束；跨 fragment 的关系、kind 规则和领域不变量由拥有组合语义的上层 schema 负责。

### 3.2 Type 与 Schema 同步演进

公共 type 按其语义来源区分：

- `IRXxx`：从 JSON-safe IR schema 推导的持久化或解析后数据类型
- `XxxValue`：从 const object enum 或权威闭合 schema 派生的取值类型
- `XxxInput`：只有 authoring 输入与存储形态确实不同才定义
- `XxxDefinition` / `XxxContext`：属于 contract 层的扩展协议类型，不替代 IR schema

当上层只需要底层原子的同义子集时，应复用权威 schema 的命名组合或受控 `.pick()` / `.omit()` / `.extend()` 结果，并从该组合继续派生 type。不能在上层重新写一个看起来相同的 type，再让 schema、type 和 lowering 分别演进。

### 3.3 Contract 不等于 Schema Bundle

Contract 层描述第三方作者与内置 provider 共同实现的能力协议，可以组合 shared / schema 原子，但不承载具体 provider、pipeline 状态或领域 preset。

原子化本身不新增 registry、Definition 或 capability bundle。只有当能力需要可注册定义、动态解析或第三方实现时，才由对应 owner 另行冻结 contract / registry。闭合数据契约应保持闭合，不用开放 registry 掩盖未确定的语义边界。

## 4. 原子契约的组合层级

原子契约按语义所在层级组织：

| 层级                        | 典型拥有内容                                                            | 不拥有                                               |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `@retikz/math`              | 无绘图语义的纯数值、向量和几何原子                                      | IR、样式、主题和 renderer 语义                       |
| `@retikz/core`              | JSON-safe 绘图值、paint、opacity、font、stroke、effect、path 等通用原子 | Standard 布局、Plot guide、Chart / Table preset      |
| `@retikz/standard`          | 去除领域词汇后的 presentation / layout / composite 组合                 | Plot / Table / Chart 领域模型和 recipe               |
| Data / Plot / Chart / Table | 各自的数据、可视化或表格语义原子，以及领域组合                          | 其它 owner 的同义契约、Core compile 和 renderer 默认 |
| React / Vanilla adapter     | 等价 authoring 输入、生命周期和宿主接线                                 | 平行 schema、默认值、领域 lowering                   |
| renderer                    | 对统一 Scene / manifest 的后端执行                                      | schema、preset、token merge 和领域 mapping           |

同一原子可以被多个上层组合，但只能有一个语义 owner。多个上层复用同一 Core 原子，不代表 Core 拥有这些上层的完整组合。

## 5. Theme Token 的原子化

### 5.1 三种不同对象

Theme 设计必须区分以下三类对象：

1. **Theme environment**：Core 统一表达的 `ThemeStyle` 与 `ThemeMode` 轻量 selector，负责选择视觉人格与明暗环境
2. **Value atom**：可复用的 paint、opacity、font、spacing、alignment、stroke、palette element 等值契约
3. **Domain token**：由语义 owner 定义的稳定 token key，例如 Plot 的 axis / legend、Chart 的 presentation、Table 的 Cell / border

`ThemeStyle` / `ThemeMode` 是共享环境协议，不是包含所有领域语义的全仓 token map。Core 通过 runtime style definition 解析 shared colors；领域 preset 是 owner-local style definition 产生的 domain token 组合数据，也不是 Core 的 capability bundle。

### 5.2 Token 复用规则

Theme token 必须遵循与 Core 原子绘图契约相同的规则：

- 每个共享 value atom 只有一个权威 schema / type，领域 token 复用它的约束和派生类型
- 每个 domain token key 只有一个语义 owner；其它包只能消费、映射或组合
- sparse override、完整 resolved map 和 built-in preset 使用同一 canonical field shape，不为每种形态复制一套 token schema
- 领域 resolver 负责 style baseline、领域禁用字段、token cascade、mapping 和诊断；Core 只承载 selector 继承、Core style definition registry、shared colors value contract 与跨 owner 的来源原子，不承载 Tier 2 token vocabulary 或 preset 具体值
- token schema 通过后的值必须进入正式 Standard / Core input 或领域 manifest；不能只进入 inspection 或只停留在 adapter
- renderer 和 adapter 不根据 preset 名称选择默认，也不复制 token merge
- 共享的是稳定语义契约，不是因为两个 token 恰好都是 string、color 或 number 就强行合并

例如：

```text
chart.canvas.fill       -> Chart token owner -> Core / Standard paint atom
table.cell.background   -> Table token owner -> Core / Standard paint atom
axis.tick.mark          -> Plot token owner -> Plot guide contract
```

前两个 token 可以复用同一个 paint value atom，但不能合并成一个无 owner 的全局 token。`axis.tick.mark` 不能因为 Chart 也会展示轴就由 Chart 复制；Chart 只能编排或传递 Plot 的正式语义。

### 5.3 Theme Token 的解析链路

```text
Core default theme environment
  -> Scene / Scope effective Theme
  -> Core shared colors view
  -> owner-local style definition baseline
  -> inherited effective Theme projection
  -> owner-local sparse token override
  -> owner-local shorthand / native theme
  -> explicit component config
  -> owner mapping
  -> Standard / Core formal input
  -> Scene / manifest / renderer execution
```

每个阶段只能覆盖自己拥有的表现性语义，不能撤销领域结构不变量。最终的 Core primitive 不再次读取 `ThemeStyle`；它接收由主题 consumer 已经物化的显式样式值。

### 5.4 Theme token source

Core 只提供跨 owner 成立的来源原子：`inherit` 表示 owner resolver 直接投影上层 effective Theme 的值，`local` 表示当前 owner 的 style definition 或 authored override 产生的值。来源关系不等于 cascade precedence；style baseline、owner-local token、shorthand 与 native theme 都属于 `local`，其具体胜出入口与顺序由 owner resolver 和稳定 `path` 表达。

Scene / Scope 只持久化 `style` 与 `mode`。Plot、Chart、Table 等 Tier 2 owner 分别通过同名 runtime style definition 生成完整 baseline，并在本地分别使用 `plotThemeTokens`、`chartThemeTokens`、`tableThemeTokens` 保存 sparse override。完整 token map、definition 与 resolver 不进入 Theme IR；Core 不静态知道领域 token 类型或业务语义。

Core 第一版 shared colors 只包含 `semantic.error`、`semantic.success`、`semantic.warning` 和一套非空 active `palette.categorical`。Core Inspector 为每个 occurrence 按 `colorScope % palette.categorical.length` 产生 scope color，warning 使用 warning role；Standard 只消费 `InspectionAppearance`，不读取领域 token 或重建取余。Plot 将 shared categorical 以 `inherit` 来源投影为 categorical / series / sector baseline，Table 将其投影为 `data.categorical` baseline，Chart 的默认 series color 只读取 Plot resolver 最终 palette；任何 owner 都不能复制 active categorical array。

## 6. 新能力的设计流程

未来新增 schema、type、contract、theme token 或其它可组合能力时，按以下顺序检查：

1. 明确问题、语义 owner、输入、输出和不支持边界
2. 搜索已有 shared / schema / contract 原子，确认是否存在同义契约
3. 若多个上层重复投影同一字段子集，优先在正确 owner 增加命名原子，不继续复制 `pick` / `omit`
4. 冻结原子的可观察不变量、JSON-safe 边界、失败语义和扩展边界
5. 从同一 schema 派生公开 type，并明确完整 schema 与上层组合的关系
6. 让上层拥有自己的默认值、禁用字段、领域收窄、preset 和 mapping
7. 验证输入、类型、lowering、merge、inspection、manifest 和 renderer / adapter 之间没有未消费字段或平行路径
8. 只有真实存在第三方实现、动态解析或生命周期需求时，才新增 contract / Definition / registry
9. 同步长期架构文档、所属 ADR、schema registry、tests 和用户可见文档

## 7. 必须避免的设计

- 从完整领域 schema 临时投影出一个长期公共 schema，却不命名其稳定语义
- 在多个包重复声明相同的 Zod 字段、TS interface、默认值或错误约束
- 把 Chart / Plot / Table / Standard 的组合结果反向下沉为 Core 巨型 bundle
- 把所有领域 Theme token 汇总为一个开放或全仓巨型 schema
- 把 preset、renderer、adapter 或单个 consumer 的专属限制伪装成通用原子
- schema 通过后由 merge、lowering、inspection 或 manifest 静默丢弃字段
- 仅为复用 schema 而复制一条 parallel IR、registry、compile 或 renderer 路径

## 8. 验证要求

原子契约的验证至少应证明：

- 原子 schema 的合法输入、非法输入、未知字段和局部不变量稳定
- schema-derived type 与 JSON / IR 形态一致
- 完整聚合与原子组合不改变既有合法 / 非法边界和默认语义
- 每个公开字段都有明确 owner、consumer 和失败诊断
- 同义复用经过同一 JSON / IR / contract / pipeline 真源
- Theme 的 sparse、resolved、preset 和 explicit config 遵循同一字段契约与级联规则
- React、Vanilla、headless 和 renderer 消费同一公开输入 / Scene 语义
- 新增能力没有因为组合便利建立平行 vocabulary、registry 或 lowering

覆盖率、快照数量或单一 adapter 可用不能替代上述契约、反例和端到端消费证据。

## 9. 与其它长期设计的关系

本文是跨能力的原子化总纲：

- [`能力完备性与模块边界`](./capability-design.md) 定义原子化的全仓治理原则
- [`IR JSON-Schema 产物设计`](./schema-design.md) 负责把既有 schema 输出为工具和 AI 可消费的 JSON-Schema 产物
- [`通用视觉主题设计`](./visual-theme-design.md) 负责 Theme environment、token vocabulary、preset、cascade 和视觉 owner
- [`Core 原子绘图契约与 Tier 2 / Tier 3 组合边界`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/10-core-atomic-contracts.md) 冻结 Core 绘图原子的具体长期契约
- [`可继承 Theme IR 与 Composite 编译上下文`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/09-inherited-theme-context.md) 冻结 Theme environment 的 Scene / Scope 继承与 Composite 消费边界
- [`Standard Drawing Library 设计`](../../packages/library/_notes/architecture/standard-library-design.md) 定义 Standard 对 Core 原子的跨领域组合边界

当本文与某个版本 ADR 对同一公开契约出现差异时，先修订长期设计或明确 ADR 的范围，再进入实现；不得用实现位置或单个消费方需求反向决定原子 owner。
