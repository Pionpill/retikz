# ADR-01：通用 Legend 归属 Standard 并由领域包单向消费

- 状态：Proposed
- 决策日期：2026-07-28
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.3 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../../notes/architecture/capability-design.md) · [Plot completeness](../../../../../../../viz/_notes/architecture/plot-visualization-complete.md) · [Table completeness](../../../../../../../viz/_notes/architecture/table-visualization-complete.md)

## 背景

Plot v0.1 已经同时承担两类职责：根据 channel / scale / guide 配置解析 Legend 语义，以及把 title、entries、swatch、ramp、symbol 与 label 排版并 lower 为 Core IR。Table alpha.3 也需要让条件视觉编码与可选 Legend 同源；如果 Table 再实现一份视觉结构与布局，会形成第二套通用 Legend。

Legend 的领域来源不同，但解析后的呈现问题相同：组织标题、离散条目、连续色带或符号样本，在有限空间内确定方向、换行、间距、对齐与溢出，并产出可测量、可追踪的 Core 图形。该部分移除 Plot、Table、field、channel、scale 等词汇后仍然成立，且已有直接作者、Plot、Table 三类消费方，满足 Standard 准入条件。

现有 Standard 长期设计把它定位为最终作者按需安装的可选库，并禁止 feature-to-feature 依赖。这个限制会迫使 Plot/Table 复制已确认通用的 Tier 2 composite，因此需要把 Standard 明确为相对 Core 可选、但可被官方领域 Tier 2 包单向依赖的 Drawing Complete 服务层。

## 决策

`@retikz/standard` 拥有领域无关的 Legend 呈现能力。它接收已经解析好的 JSON-safe 输入，负责通用视觉结构、Box Layout 组合、Core composite definition / lowering、领域无关 identity、item bounds / anchors artifact、capability module 与直接 React / Vanilla authoring。

Plot、Table 等领域包可以使用兼容版本依赖 `@retikz/standard`，依赖方向固定为：

```text
plot / table ──▶ standard ──▶ core / math
```

Standard 不依赖 Data、Plot、Table 或其它领域 feature，不读取领域 IR，不提供领域 adapter，也不通过 barrel 转手导出领域 API。

### 领域解析与通用呈现

Plot 继续拥有 Plot legend guide 的完整领域语义，包括 channel / scale 绑定、domain 与 ticks、formatter、guide resolve、theme token 映射、provenance / locator 和 legend interaction 意图。Plot pipeline 把解析结果转换为 Standard Legend 输入；Standard 不反向读取 `IRPlotLegendGuide` 或 Plot registry。

Table 继续拥有 formatter、presentation、selector / rule、条件视觉 scale、theme precedence、Cell / data lineage 与交互意图。Table presentation pipeline 从视觉编码结果生成领域无关 Legend 输入；Standard 不读取 Table field、Cell address、selector 或 visual encoding definition。

直接作者可以不经过 Plot/Table，显式创建同一个 Standard Legend 输入。三类消费必须进入同一 Standard schema、definition、布局与 lowering 主链。

### Legend 内容边界

Standard Legend 可以拥有 title、离散 entries、swatch、ramp、symbol / size samples、方向、换行、gap、alignment、overflow、稳定 item key 及通用 style。确切 discriminator、字段、默认值、任意 `IRChild` 嵌入范围、ramp / tick 表达和诊断由 alpha.3 后续 ADR 冻结；本 ADR 不把当前 Plot 内部类型直接提升为 Standard API。

Standard 输入不得包含 field、channel、scale definition、datum、Cell selector、Table rule、领域 formatter 函数、ReactNode、renderer 资源或运行时 callback。需要保留领域来源时，由调用方通过 composite occurrence、artifact key、外层 meta 或自身 lineage / locator 映射维护，不向 Standard schema 注入领域 payload。

### 布局与 Core 协作

Legend 的呈现布局必须复用 Standard alpha.2 Box Layout 与 Core layout-aware composite。Standard 负责 Legend 内部 title、entries、ramp / symbol samples 的 constrained measurement、wrap、alignment、overflow 与 replay，不建立 DOM `measureText`、固定带宽估算、Scene 回读、double compile 或 renderer 分支。

Plot 的整图 decoration 语义仍由 Plot 拥有：哪个 Legend 绑定哪个 coordinate view、位于哪一侧、是否参与 collision / priority、如何与 axis / plot area 协调都不是 Standard Legend 的职责。Plot 可以把完成领域解析的 Legend 作为不透明 `IRChild` 交给通用容器测量和放置。

### Capability loading

Standard 相对 Core 保持显式加载。Plot/Table 作为声明依赖方，必须在自己的 compile / bundle 入口显式组合所需 Standard capability，不能依赖 import 副作用、module-level 全局 registry 或 Core 反向发现。

现有 Standard bundle 对重复 module name fail-loud、对重复 composite key 保留 Core 唯一诊断。领域包传递引入与调用方显式加载同一 capability 时是否按相同 module identity 幂等组合，以及不同 definition 实例如何诊断，由 alpha.3 capability loading ADR 在不削弱真实冲突诊断的前提下冻结；本 ADR 不预设静默去重。

## 被否决的方案

- Plot 与 Table 各自维护 Legend：重复 schema、布局、lowering 与跨入口测试，且第三个领域仍会继续复制
- 把 Legend 放进 Core：Legend 是可选 Tier 2 呈现语义，不是 Drawing Complete 不可缺少的基础图元
- Standard 接收 Plot scale 或 Table visual encoding：会让通用包反向理解领域模型，并引入循环职责
- 只共享内部 helper、不建立 Standard Legend 语义：直接作者无法持久化、diff 或由工具链生成 Legend，多个领域入口也缺少统一 artifact
- 通过全局注册让 Plot/Table 自动找到 Standard：破坏 compile 隔离、tree-shaking 与显式能力诊断
- 为迁移保留 Plot 通用 Legend renderer 的长期并行主链：会让 Standard owner 变成名义归属，重复实现继续漂移

## 迁移与兼容性

- Plot 当前 Legend 行为保持已发布基线，直到 Standard Legend schema、layout、capability loading 与可消费版本全部闭环
- Plot 迁移时保留 `IRPlotLegendGuide` 作为领域 authoring 真源，只替换解析后的通用呈现主链；是否产生公开行为变化由独立 Plot ADR 与测试契约判断
- Table alpha.3 先定义 visual encoding 到 Legend descriptor 的领域链路，通用呈现直接等待并消费 Standard，不建立临时公共 Legend API
- `@retikz/plot`、`@retikz/table` 的 package dependency 与 release group 仍独立版本；它们声明可消费的 Standard 兼容版本，不与 Standard lockstep
- Standard 不为 Plot 当前内部类型、helper 或 import path 提供 alias

## 能力完备性检查

- **所属能力域与能力面**：Drawing Complete 的可选通用 Tier 2 呈现；协作 Visualization Complete 与 Tabular Visualization Complete
- **解决的问题**：多个领域把已经解析好的视觉解释结构复用为同一 Legend schema、布局、lowering 与 artifact
- **主责包与协作包**：Standard 主责通用呈现；Plot/Table 主责领域解析、provenance / locator 与交互；Core/Math 提供测量、replay、IR 与纯计算底座；adapters 等价暴露
- **是否可由现有能力组合**：Core layout-aware composite 与 Standard Box Layout 提供机制，但当前缺少持久化 Legend 语义、definition、artifact 与 capability module，需要扩展 Standard
- **是否需要下沉到依赖能力域**：不把 Legend 下沉 Core；若 Box Layout Gate 暴露通用测量缺口，只补 Core/Math 机制
- **内部表达链路**：Standard Legend schema -> composite definition -> Box Layout / layout-aware compile -> Core IR + typed artifact
- **外部扩展链路**：直接 authoring、Plot resolution、Table resolution 都构造同一 Standard 输入并消费同一 capability module
- **下游执行 / adapter 等价性**：Core renderer 不识别 Legend 私有类型；Standard React/Vanilla 与领域 adapters 复用同一 lowering
- **不支持边界与诊断**：不接收领域 scale / field / selector / callback，不拥有 interaction；缺失 capability、重复注册、非法内容与约束失败必须 fail-loud
- **本轮结论**：扩展 Standard，并让 Plot/Table 单向依赖；不在领域包或 Core 建立平行 Legend

## 测试设计摘要

- schema / contract 层证明离散、连续与 symbol / size 等后续确认 form 均为 JSON-safe，并拒绝领域 scale、函数、ReactNode 与非法 identity
- compile contract 证明直接 Standard、Plot 解析与 Table 解析生成同一 Legend 输入时得到等价 Core 语义、item artifact 与确定诊断
- layout contract 证明 constrained width / height、wrap、title、空 / 单项、多项、overflow 与 nested container 只经 Core layout-aware composite 测量和 replay
- capability loading 证明直接 module、领域包传递依赖、all preset 与重复输入具有确定结果，真实 key 冲突保持 fail-loud
- adapter parity 与 docs 证明 Standard React/Vanilla 及 Plot/Table authoring 不复制通用 Legend 结构

详细行为矩阵见本任务 ignored 文件 `notes/plans/standard-legend/TEST_CONTRACT.md`。

## 实现契约

- **Level**：yellow。本 ADR 改变长期能力 owner 与依赖方向，但不冻结公开 schema 或授权产品实现；后续 Legend contract / layout / migration ADR 需按实际公开面重新判级
- **Schema 改动**：无。本 ADR 只冻结所有权、依赖与迁移边界；公开 discriminator、字段、类型、默认值和 `.describe(...)` 由 alpha.3 ADR-02 冻结
- **文件 scope**：本轮只允许修改根与 library / viz 的 AGENTS、capability / completeness、Standard 架构与 Standard / Plot / Table roadmaps，以及新增本 ADR、alpha.3 roadmap 和 ignored 测试契约
- **测试契约矩阵**：`notes/plans/standard-legend/TEST_CONTRACT.md`；未来实现至少覆盖 schema、compile、layout、capability loading、adapter parity、领域 provenance / locator 与 docs 证据
- **依赖现有元素**：Standard capability module / bundle、Core `CompositeDefinition` 与 layout-aware compile、Standard alpha.2 Box Layout、Plot legend guide resolution、Table presentation / visual encoding contract

## 不在范围

- 冻结 Standard Legend 的最终 schema、factory、React props、Vanilla builder、style token 或默认值
- 实现或迁移 Standard、Plot、Table 产品代码
- 设计 axis、grid、label、annotation、tooltip 或完整 decoration solver
- 改变 Plot/Table 已发布行为、locator 路径或交互语义
- commit、release-group 版本调整、package publish 或 docs 站页面
