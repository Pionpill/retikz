# 原子契约与组合设计

> **状态：全仓长期架构设计。** 本文定义 schema、type、contract、Source 默认片段与纯函数的原子化边界、单一真源和上层组合规则，供 Kernel、Standard、Data、Plot、Chart、Table 及未来能力域参考。本文不冻结某个版本的具体字段、文件、preset 值、实现步骤或测试路径；这些内容由所属能力域的 ADR、代码和文档维护。
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

只有 IR 的 schema 负责：

- 字段名称、形状和 JSON 可序列化边界
- 字段级约束、未知字段拒绝和默认语义
- 需要时的跨字段、跨 kind 不变量
- 面向 schema registry、文档和工具的契约描述

公开数据类型从权威 schema 派生。不得为同一 JSON / IR 形状另写平行 interface 或重复字段约束。

原子 schema、兼容聚合 schema 和最终能力 schema 的关系如下：

```text
稳定语义原子 schema
  -> owner 组合 / 收窄 schema
  -> 完整 Source IR schema
  -> provider / contract / pipeline 消费
  -> Core IR、Standard input、Scene 或 manifest
```

原子 schema 只负责自己的局部约束；跨 fragment 的关系、kind 规则和领域不变量由拥有组合语义的上层 schema 负责。

### 3.2 Type 与 Schema 同步演进

公共 type 按其语义来源区分：

- `IRXxx`：从 JSON-safe IR schema 推导的持久化数据类型；只有 IR 定义 Zod schema，schema 名用 `XxxSchema`，不加 `IR` 前缀
- `XxxValue`：从 const object enum 或权威闭合 schema 派生的取值类型
- `InputXxx`：由 Vanilla 定义的 TypeScript authoring 输入；只有它确实不同于 Source IR 时才定义，不作为持久化 schema
- `CanonicalXxx`：由 `IRXxx` 用 `Omit`、`Pick`、交叉或字段替换派生，并结合当前 context 确定的内部完整类型；定义在 Core / Plot domain `resolve/<domain>/types.ts`，由 domain `resolveXxx` 产出，pipeline / compile 只维护 context 生命周期与调度；不设 schema、不持久化
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

## 5. 默认片段与 Theme 来源

### 5.1 环境与目标 Source

Theme environment 是 Core 的 style / mode selector，负责 Scene / Scope 继承与 shared colors。领域 xxxDefaults 是作者按目标类型指定的稀疏 Source 默认。Theme definition 生成同形默认片段，但保留独立来源与优先级；不把三者合并为全仓 Theme bag。

外层 entity、relation、axis、cell 等选择默认作用目标，片段内部保持对应 Source 的同名字段与分组，例如 entity.style.font、entity.layout.align。实例数组、identity、内容、数据与拓扑不进入 Theme。可默认字段由 owner 明确选择，不对完整 IR 使用机械 DeepPartial。

### 5.2 单一字段契约

- 作者 xxxDefaults、preset、definition 生成值与独立规则覆盖复用正式 Source schema 的命名片段；上层保留自己的禁用字段与角色约束
- Source 作者覆盖使用 style、layout 等正式分组；appearance 留给已确定的消费结果
- Source 缺少正式表达时先由原 owner 补齐，不能从 resolved appearance 建立平行持久化模型
- 片段内部的值域、字段路径与覆盖粒度一致；字段可省略不意味着递归放松判别联合或完整复合值
- 内部 EffectiveXxxDefaults 从 Source 类型派生，内容相关字段由目标 resolver 确定；不建立平行 required Zod schema
- dotted path 只用于 inspection、诊断或工具导出；不维护 flat token、xxxTheme 与 xxxDefaults 多入口

通用 paint、font、spacing 等原子属于原 owner，领域组合与主题默认化资格属于领域 owner。Chart 直接转发 Plot 公开 defaults；Flow 的片段不能放宽 Graph 已屏蔽的字段。

### 5.3 解析与覆盖

Core 先解析环境，领域使用 shared colors 形成 baseline，经本地 style definition 生成主题默认，再应用作者 xxxDefaults。显式领域 palette 高于共享 baseline，实例显式配置高于 Theme 默认。规则、Scope style、defaults 与实例输入的相遇顺序由相应 owner 冻结，沿用正式 Source 级联语义。

style / layout 是字段命名空间，部分覆盖保留同组其余字段。复合叶子按原契约处理：Node font 整体覆盖，label font 逐字段补全；paint、shadow、spacing、数组与判别联合不做通用递归合并。显式 palette 数组整体替换。空分组不清空继承，optional undefined 不参与覆盖，合法显式值按字段语义生效。

defaults.reset 仍只作用于原默认通道，不重置 Theme 环境。裸 Core primitive 不自动按 preset 选样式。领域确定默认后，经正式 Standard / Core 输入物化到 Scene；adapter 和 renderer 不补主题默认。

### 5.4 来源与扩展

沿用 Core 与领域各自的 style definition / registry；内置与自定义使用同一字段契约，不新增跨 owner registry 或兼容 token loader。shared categorical 保持 Core 单一真源，领域显式覆盖经自己的公开 palette 契约表达。

ThemeTokenSource 的 inherit / local 保留既有来源含义，不充当全链路优先级。inspection 使用实际结构路径，不通过值相等猜测来源或伪造未提供的 Scope lineage。具体治理与不变量见[通用视觉主题设计](./visual-theme-design.md)。

## 6. 新能力的设计流程

未来新增 schema、type、contract、Theme 片段 或其它可组合能力时，按以下顺序检查：

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
- 把所有领域 Theme 片段 汇总为一个开放或全仓巨型 schema
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
- 默认值的 sparse、resolved、preset 生成值和作者 xxxDefaults 遵循同一字段契约与级联规则
- React、Vanilla、headless 和 renderer 消费同一公开输入 / Scene 语义
- 新增能力没有因为组合便利建立平行 vocabulary、registry 或 lowering

覆盖率、快照数量或单一 adapter 可用不能替代上述契约、反例和端到端消费证据。

## 9. 与其它长期设计的关系

本文是跨能力的原子化总纲：

- [`能力完备性与模块边界`](./capability-design.md) 定义原子化的全仓治理原则
- [`IR JSON-Schema 产物设计`](./schema-design.md) 负责把既有 schema 输出为工具和 AI 可消费的 JSON-Schema 产物
- [`通用视觉主题设计`](./visual-theme-design.md) 负责 Theme environment、稀疏 Source 片段、preset、cascade 和视觉 owner
- [`Core 原子绘图契约与 Tier 2 / Tier 3 组合边界`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/10-core-atomic-contracts.md) 冻结 Core 绘图原子的具体长期契约
- [`可继承 Theme IR 与 Composite 编译上下文`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/09-inherited-theme-context.md) 冻结 Theme environment 的 Scene / Scope 继承与 Composite 消费边界
- [`Standard Drawing Library 设计`](../../packages/library/_notes/architecture/standard-library-design.md) 定义 Standard 对 Core 原子的跨领域组合边界

当本文与某个版本 ADR 对同一公开契约出现差异时，先修订长期设计或明确 ADR 的范围，再进入实现；不得用实现位置或单个消费方需求反向决定原子 owner。
