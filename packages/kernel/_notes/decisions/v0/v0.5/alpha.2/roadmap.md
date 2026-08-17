# v0.5.0-alpha.2 增量性能、Runtime 策略、Box Layout、Theme、Composite assembly、Spatial handles 与基础原子

- 状态：ADR-01～12、ADR-14～20、ADR-22 已完成实现、测试、双语文档与 Accepted 收口；ADR-13、ADR-21 Superseded
- 目标版本：`0.5.0-alpha.2`
- 关联：[v0.5 roadmap](../roadmap.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Foundation 基础包设计](../../../../../../../notes/architecture/foundation-design.md)

## 目标

alpha.2 交付 `sync + atomic + incremental` 的第一条完整更新链路，并补齐 Standard Box Layout 所需的通用 Core child layout contract：完整 Snapshot 仍是真源，同步 Runtime 根据 ChangeSet 或前后 Snapshot 做局部失效，Core 只重算必要 contribution，renderer 只提交必要 Scene Patch；任何阶段无法证明局部等价时扩大失效范围或完整重建。Box、Flex、Grid、Overlay solver 的领域规则与 baseline alignment policy 仍由 Standard 拥有，Kernel 提供双轴 proposal、minimum / natural probe、resolved slot、真实 allocation / visual bounds、alignment guide、隔离失败与 replay wrapper。

本 milestone 另补一条可持久化的轻量 Theme 环境：Scene / Scope 只保存共享 style、mode 与 palette preset，Core 按字段继承并生成 shared colors 后交给 Composite；领域 owner 在自身 resolver 中生成 token vocabulary、preset 与 mapping，Core primitive 与 renderer 不按主题分支。

在 Standard presentation composite 暴露完整 Scope-backed lower contract 前，Core 还需要冻结 layout-aware Composite 的 authored Scope output：普通 Scope 的完整 props 必须沿 Core 主链作用于 probe / replay 结果，compile-local replay wrapper 只能保留布局提交所需的数值变换和 allocation clip。该能力由 ADR-11 提供，作为 Standard Axes、Grid、Frame、Legend 以及未来其它 Tier 2 lower reuse 的通用前置能力。

本 milestone 同时重新打开 Inspector 的包边界。Core 只提供最终 occurrence 观测、所属者产物、probe / replay provenance 与隔离 IR 片段编译；独立的可选 `@retikz/inspect` 包拥有 Inspector registry、选择策略、辅助平面、色板、诊断和内置 stroke Path Inspector。Standard 通过 `/inspect` 子入口提供 Layout Inspector，Core、Render、基础 adapter 与 Standard 根入口不再内置 Inspector 语义。该能力由 ADR-12 提供。

本 milestone 另登记 ADR-14 Foundation 基础契约包。它以当前 Kernel release group 的 `0.5.0-alpha.2` 版本为归属，冻结跨包原子类型、typed string 不变量、结构化错误骨架和 direct dependency 规则；Foundation 不新增 IR、Scene、renderer 或领域能力，也不改变前述增量执行语义。

本 milestone 另登记 ADR-15 轻量 Theme IR 与可扩展 Style 解析。它取代 ADR-13 将 namespaced token bag 持久化到 Theme IR 的决策，保留 Scene / Scope selector 继承并将完整默认值收回 Core、Plot 与 Chart 各自的 owner-local style resolver。

本 milestone 进一步登记 ADR-16 二维仿射矩阵原子。Math 只提供 SVG / Canvas 同序的六元组、运行时不可变单位矩阵、固定顺序复合与点映射；Render hydration 与 TeX SVG lowering 直接复用该真源，仍分别拥有 Scene 编排、SVG parser、可逆性、similarity、stroke policy 与领域诊断。

本 milestone 另登记 ADR-17 Foundation 基础 schema 原子。它修改 ADR-14 的零生产依赖与 schema 排除边界，允许 Foundation 以 Zod 作为唯一生产依赖，统一无领域、非变换的 string / number 叶子校验；完整对象、IR、默认值、领域 refinement 与诊断继续由各 owner 负责。

本 milestone 另登记 ADR-18 跨 namespace Composite dependency provider graph。Core 以完整 `namespace + type` key、显式 roots、传递依赖、dataset 同源合并与稳定拓扑解析定义闭包；React 与 Vanilla 只收集 contribution 并调用同一个纯 resolver，不再各自按单 namespace 拼接 definitions。

本 milestone 另登记 ADR-19 qualified spatial handle sidecar。Composite 在自身局部坐标声明语义矩形，Core 在最终 Scope / replay transform 收敛后发布带 owner path、origin / final occurrence 与 closed selector 的 world-space index；Scene 与 renderer 保持纯执行边界。

本 milestone 另登记 ADR-20 Vanilla 统一 Authoring 与框架无关处理。Vanilla 作为所有框架的唯一 typed Input-to-IR、Composite contribution 消费与 framework-neutral processing owner；React 直接依赖 Vanilla，只保留 JSX、生命周期与宿主桥接；Core 只保留 Source IR、Canonical normalize 与 compile / Scene。

本 milestone 另登记 ADR-21 可扩展 ClipShape。Core 将 Clip operation 与 ClipShape 拆成两级 Definition / registry，并统一降低为 renderer-neutral Scene clip path；Core 只保留矩形最小内置，其余官方 ClipShape 由 Standard 显式装配。

本 milestone 另登记 ADR-22 单一 Clip Definition。它取代 ADR-21 的两级公开 registry，把 spec schema、JSON-safe shape schema、resolve 与 Scene path lowering 收敛到同一个 definition；Core、React、Vanilla 与 provider graph 只暴露 `clips`，canonical Scene path 与矩形最小内置保持不变。

本 milestone 不以极限大数据吞吐为目标，而以中等规模图形持续更新时减少无效工作、缩短更新延迟和 renderer commit 为验收重点。首次完整渲染不得明显退化。

## ADR 索引

| ADR                                                   | 状态       | 主题                                   | 交付                                                                                                              |
| ----------------------------------------------------- | ---------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [ADR-01](./01-performance-observability-baseline.md)  | Accepted   | 性能观测与 baseline                    | 冻结场景、指标、tracing 与回归预算                                                                                |
| [ADR-02](./02-runtime-identity-owner-registry.md)     | Accepted   | Runtime identity / owner               | 冻结 identity、Snapshot、owned value、Owner Definition 与 registry                                                |
| [ADR-03](./03-program-transaction-lifecycle.md)       | Accepted   | Program / transaction lifecycle        | 冻结依赖图、revision、candidate、fallback、observer 与同步原子提交                                                |
| [ADR-04](./04-incremental-core-compile.md)            | Accepted   | Core 增量编译                          | 冻结完整 Program、stable Diff、fallback 与首个安全局部更新闭环                                                    |
| [ADR-05](./05-scene-patch-retained-renderer.md)       | Accepted   | Scene Patch 与 retained renderer       | 冻结 identity topology、commit participant 与 SVG/Canvas retained lifecycle                                       |
| [ADR-06](./06-box-layout-composite-contract.md)       | Accepted   | Box Layout Composite contract          | 冻结双轴 constraint、allocation / slot-size feedback、nested propagation 与 replay wrapper                        |
| [ADR-07](./07-runtime-execution-policy.md)            | Accepted   | Runtime 执行模式与更新策略             | 显式选择 static / retained，并在 retained Session 中选择 auto / full 更新                                         |
| [ADR-08](./08-layout-proposal-probe-contract.md)      | Accepted   | Layout proposal / probe contract       | 冻结双轴 proposal、minimum / natural、resolved slot、guide、failure isolation 与 replay                           |
| [ADR-09](./09-inherited-theme-context.md)             | Accepted   | 可继承 Theme IR 与 Composite context   | 冻结 Scene / Scope Theme、字段级继承、Composite 消费与领域边界                                                    |
| [ADR-10](./10-core-atomic-contracts.md)               | Accepted   | Core 原子契约与 Tier 2 / Tier 3 组合   | 冻结 Core fragment、上层组合、领域收窄与单一真源原则                                                              |
| [ADR-11](./11-layout-aware-scope-output.md)           | Accepted   | Layout-aware Composite 完整 Scope 输出 | 冻结 Scope props fragment、authored Scope、replay wrapper、placement / clip / style / identity 编排               |
| [ADR-12](./12-extensible-inspector-content.md)        | Accepted   | 可选 Inspector 扩展包                  | 冻结 Core 观测底座、独立 Inspect 包、Standard `/inspect` 与 Path 控制点闭环                                       |
| [ADR-13](./13-theme-token-namespace-context.md)       | Superseded | Theme token namespace 与共享颜色       | 历史 namespaced bag、registry 与 shared colors 设计                                                               |
| [ADR-14](./14-foundation-package.md)                  | Accepted   | Foundation 基础契约包与依赖归属        | 冻结跨包原子契约、direct dependency、非空字符串语义与结构化错误兼容边界                                           |
| [ADR-15](./15-lightweight-theme-resolution.md)        | Accepted   | 轻量 Theme IR 与领域 Token 解析        | 冻结 selector-only Theme、Core shared colors 与 owner-local token resolution                                      |
| [ADR-16](./16-affine-matrix-primitives.md)            | Accepted   | 二维仿射矩阵原子                       | 冻结六元组 ABI、运行时不可变单位矩阵、复合顺序、点映射与 Math / Render / TeX 边界                                 |
| [ADR-17](./17-foundation-schema-primitives.md)        | Accepted   | Foundation 基础 Schema 原子            | 冻结唯一 Zod 依赖、基础 string / number schema、旧 owner 迁移与领域组合边界                                       |
| [ADR-18](./18-composite-dependency-provider-graph.md) | Accepted   | Composite dependency provider graph    | 冻结完整 key、roots、传递依赖、dataset 合并、稳定拓扑与跨 adapter 同构                                            |
| [ADR-19](./19-qualified-spatial-handles.md)           | Accepted   | Qualified spatial handle sidecar       | 冻结结构化 Composite 输出、owner path、world rect index、selector 与 Scene 边界                                   |
| [ADR-20](./20-vanilla-authoring-normalization.md)     | Accepted   | Vanilla authoring 与处理链             | 收敛 Core Input 与 framework-neutral processing 至 Vanilla，React 依赖 Vanilla 并只保留 JSX / 生命周期 / 宿主桥接 |
| [ADR-21](./21-extensible-clip-shapes.md)              | Superseded | 可扩展 ClipShape 与统一裁剪路径        | 历史两级 Definition、开放 shape、canonical Scene path 与 provider graph 设计                                      |
| [ADR-22](./22-single-clip-definition.md)              | Accepted   | 单一 Clip Definition 扩展契约          | 冻结单一 definition、同 kind shape、唯一 clips registry/provider 与既有 canonical Scene path                      |

## 当前进度

- ADR-01～03 已完成实现、自动化验证、Runtime 中英文文档与 changelog，并于 2026-07-27 获人工接受。
- ADR-04 已完成 canonical Scene topology、Core Program full oracle、ChangeSet/Snapshot 校验、stable/nested Diff、full fallback 与单 root Node fill 局部增量闭环，并于 2026-07-28 按当前安全子集获人工接受；通用 contribution 与其它图元局部失效不属于本次 Accepted 事实。
- ADR-05 已完成 Runtime commit participant、Render retained runtime、SVG/Canvas事务后端、React/Vanilla session接线、5000规模确定性/计时门禁与双语文档，并于2026-07-29获人工接受。
- ADR-06 已完成双轴 constraint、`slotSize`、显式 composite allocation、完整 replay wrapper、Table consumer 迁移、对抗测试与双语文档，并于 2026-07-28 获人工接受。
- ADR-07 已完成 Architecture Gate、Runtime/Core/Render/React/Vanilla 实现、SVG/Canvas 三策略 Bench A/B、对抗测试与双语文档，并于 2026-07-29 获人工接受。
- ADR-08 已完成双轴 proposal、resolved slot、真实 allocation / visual bounds、alignment guide、隔离 failure、one-use replay、Table consumer 迁移、对抗测试与双语文档，并于 2026-07-30 获人工接受。
- ADR-09 已完成严格 JSON Theme IR、Scene / Scope 字段级继承、Composite context、runtime Scope、probe / replay、lowering、retained fallback、adapter / renderer parity、对抗复验与双语文档，并于 2026-08-03 获人工接受。
- ADR-10 已完成 Core 原子 schema/type、Tier 2 / Tier 3 直接消费迁移、测试与双语文档，并于 2026-08-04 获人工接受。
- ADR-11 已完成 Core 实现、Standard consumers、测试与双语文档，并获人工接受。
- ADR-12 已完成 Core 领域中立观测底座、独立 `@retikz/inspect`、Render 普通只读图层、React / Vanilla 通用驱动和 Standard 可选子入口迁移，并于 2026-08-07 获人工接受。
- ADR-14 已完成 Foundation 初始包、七个根契约、跨包 direct dependency 迁移、typed string 失败语义、结构化领域错误兼容、对抗复验与双语文档，并于 2026-08-09 获人工接受；其零依赖、无 schema 与七根导出边界随后由 ADR-17 演进。
- ADR-13 的 namespaced Theme token bag、Definition registry 与跨 Scope token override 决策已由 ADR-15 取代；其 shared colors 与领域 owner resolver 边界由 ADR-15 继承并收窄。
- ADR-15 已完成 Core、Plot、Chart、Table 的 selector/style resolver 实现、测试与双语契约，并获人工接受。
- ADR-16 已完成 Math 仿射矩阵公共原子、Render / TeX 单一真源迁移、顺序敏感回归、对抗验证与双语文档，并于 2026-08-09 获人工接受。
- ADR-17 已完成六个 Foundation 标量 schema、Core / Graph 旧 owner 移除、跨 Kernel / Standard / Viz 同义叶子迁移、对抗复验、发布产物验证与双语文档，并于 2026-08-09 获人工接受。
- ADR-18 已完成 Core provider graph、React / Vanilla contribution、直接 resolver、SSR 与第三方 provider 的同构实现、测试与双语契约，并获人工接受。
- ADR-19 已完成 Composite structured output、qualified world-space sidecar、closed selector、retained revision 原子性、Standard Surface owner 与测试文档闭环，并获人工接受。
- ADR-20 已完成 Vanilla Input-to-IR、framework-neutral processing、React adapter parity、DOM retained transaction 与公开入口收敛，并获人工接受。
- ADR-21 已完成两级 Clip Definition / ClipShape Definition、canonical Scene path、provider graph、递归保护、renderer / adapter 消费、测试与双语文档，并于 2026-08-16 获人工接受；Standard ADR-05 随后完成五种可选 ClipShape 所有权迁移，Core 最小内置最终收敛为 `rect`。
- ADR-22 已完成 Architecture Gate、Plan Gate、Core / React / Vanilla / Standard / 下游 consumer 实现、测试与双语文档，并由人工确认进入 Accepted。

## 执行批次

| 批次 | ADR    | 进入条件                                                                         | 退出条件                                                                                     |
| ---- | ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 0    | ADR-01 | alpha.1 发布准备完成                                                             | Runtime trace 切片、full baseline 与预算获得人工确认                                         |
| 1    | ADR-02 | ADR-01 runtime/trace 可复现                                                      | identity、Owner Definition/registry 与 owned value 稳定                                      |
| 2    | ADR-03 | ADR-02 owner contract Accepted                                                   | 同步 Program graph / transaction lifecycle 稳定                                              |
| 3    | ADR-04 | ADR-03 Accepted                                                                  | 完整 Program、stable Diff、fallback 与首个安全局部更新闭环稳定                               |
| 4    | ADR-06 | alpha.1 ADR-07 已 Accepted；Standard Core Gate 已明确                            | 完整 compile 的双轴 constraint、slot size、nested 与 wrapper contract 稳定                   |
| 5    | ADR-05 | ADR-04 可产出稳定 Scene Patch                                                    | SVG / Canvas patch 与完整 redraw 等价，并有可测收益                                          |
| 6    | ADR-07 | ADR-03～05 Accepted                                                              | static / retained 与 auto / full 可显式选择、对比并保持默认行为不变                          |
| 7    | ADR-08 | ADR-06 Accepted；Standard alpha.2 Core Gate 缺口已明确                           | proposal / probe / slot / guide / failure / replay contract 稳定                             |
| 8    | ADR-09 | 通用视觉主题 owner 与 Scene / Scope 继承方向已人工确认                           | Theme IR、Composite context、第三方消费边界与入口等价性稳定                                  |
| 9    | ADR-10 | ADR-09 Accepted；原子 schema/type 目标已获人工确认                               | Core 原子契约、兼容聚合与 Tier 2 / Tier 3 组合边界稳定                                       |
| 10   | ADR-11 | ADR-08～10 Accepted；Standard presentation reuse 的 Core capability gap 已冻结   | authored Scope 完整 surface、replay wrapper 窄职责与 bounds / clip / identity 编排稳定       |
| 11   | ADR-12 | Core 内置 Inspector 已证明普通 IR 辅助内容可行，但包边界过重                     | Core 观测底座、Inspect registry、Standard 子入口、普通 Scene 图层与 Path 控制点闭环稳定      |
| 13   | ADR-14 | 当前 Kernel release group `0.5.0-alpha.2` 的 Foundation owner 与依赖边界已确认   | Foundation 根契约、直接依赖拓扑、断言语义与结构化错误兼容边界可独立验证                      |
| 14   | ADR-15 | ADR-13 的 token bag 已确认造成持久化 IR 负担                                     | 轻量 selector、Core / owner-local style registry、token resolution 与 shared colors 语义稳定 |
| 15   | ADR-16 | Render hydration 与 TeX SVG lowering 已证明同义复用六元组仿射计算                | Math 成为唯一计算真源，两个 consumer 保持现有 parser、Scene、stroke 与诊断行为               |
| 16   | ADR-17 | 多个独立包已证明同义基础 string / number Zod 约束重复                            | Foundation 成为唯一原子 schema 真源，完整 owner schema 与既有行为保持稳定                    |
| 17   | ADR-18 | Chart、Plot、Standard 与第三方嵌套能力已证明单 namespace adapter 聚合不足        | provider graph、稳定拓扑、dataset / definition 冲突与 React / Vanilla parity 稳定            |
| 18   | ADR-19 | 外层 Composite 必须保持 Plot / Table 等 descendant 的空间 identity 与 provenance | structured output、qualified owner path、world rect sidecar 与 closed selector 稳定          |
| 19   | ADR-20 | Core / Vanilla / React 包边界已冻结                                              | 统一 Input-to-IR、处理主链与跨入口等价性可验证                                               |

批次存在硬依赖，不并行实施。每条 ADR 依次完成 Architecture Gate、人工确认、`test-contract` / Plan Gate 与人工实现授权。

## 共同不变量

1. Snapshot 是完整事实；ChangeSet、Patch、cache 和 retained state 都可丢弃并从 Snapshot 重建。
2. alpha.2 虽只同步执行，候选 revision 与当前已提交状态仍隔离，commit 一次切换 document、Scene、provenance 与索引。
3. 领域 owner 决定 identity、依赖、key 和最小失效边界；Runtime 不猜测 Plot、Table 或 Core 语义。
4. 增量与完整重建可观察等价；fallback 只影响性能。
5. React / Vanilla、SVG / Canvas 共享契约，adapter 与 renderer 不建立平行 IR 或更新协议。
6. 内置与第三方 Program 使用同一 full-run、incremental、fallback 与 diagnostics 边界。
7. Theme selector（style、mode）持久化在 Scene / Scope IR；Core 以 style registry 解析继承并生成 shared colors，领域 owner 以同名 style registry 物化默认 token 与局部 override，renderer 不读取 Theme 或 token。
8. layout-aware Composite 的 authored Scope props、普通 child 与 replay child 必须沿同一 Core Scope / style / theme / identity / bounds / clip / diagnostics 主链消费；compile-local replay wrapper 不承担普通 Scope 语义。
9. Core 只发布最终 settled owner output；`@retikz/inspect` 以显式 registry 生成辅助内容，继承 occurrence 的有效 Theme / style 并复用普通 IR / Definition / compile，但使用隔离 namespace，seal 后不保留 public id / meta / animation，且与主 Scene 的 layout、resource、identity、artifact、patch、命中和水合语义隔离。
10. Foundation 只提供无领域原子契约；实际 consumer 直接依赖其根入口，`@retikz/math` 在没有真实消费时不声明空依赖，Core / Runtime 旧基础类型出口不形成第二真源，领域错误与私有 identity / Diagnostic 边界保持不变。
11. 通用二维仿射计算由 Math 以 plain numeric tuple 单一真源提供；Render 与 TeX 只组合该原子，不把 Scene、SVG parser、stroke 或诊断语义下沉。
12. Foundation 只以 Zod 为生产依赖并拥有无领域、非变换的 string / number schema 原子；完整对象、IR、默认值、领域 refinement、错误包装与 Diagnostic 留在对应 owner。
13. Composite 传递依赖只通过 Core provider graph 解析；完整 key、显式 roots、dataset 同源冲突与 dependency-first 稳定拓扑在 React、Vanilla 与直接工具链中使用同一语义。
14. 语义空间 handle 由声明 owner 保留 local key / role / payload，Core 只增加 qualified owner path 并发布同 revision world-space sidecar；Scene、renderer 与外层 Composite 不复制或重命名 descendant handles。
15. Framework authoring Input 只经 Vanilla 归一为 Source IR；React 与未来框架包不直接重建 Core IR。

## Milestone 验收

- benchmark 覆盖5000实体首次渲染、单实体更新、稳定Group update、replace fallback与真实dispose live handles。
- 至少一个真实持续更新场景贯通 `Snapshot / ChangeSet → Core 增量 compile → Scene Patch → SVG / Canvas retained commit`。
- 任意合法 `IRChild` 可通过同一 layout-aware Composite 主链接受双轴 minimum / natural / range / exact proposal，返回 resolved slot、真实 allocation / visual bounds、可选 alignment guides 或隔离 failure，并以 transform / clip wrapper replay；target slot 位置、baseline alignment policy 与 overflow 由父 solver 决定，nested layout 与空 container 不需要 Standard 私有测量或透明 primitive。
- 每个增量场景都有与完整重建的等价性证据；错误或不安全输入明确 fallback。
- 同时记录同环境median/p95/max、访问/复用/变更实体数、Patch/trace基数、renderer commit与live handles。
- 首次完整渲染和静态 SSR / 导出路径没有超出 ADR-01 冻结的回归预算。
- React 与 Vanilla 暴露等价的同步 update 语义；不承诺 Concurrent 或 progressive presentation。
- Scene / Scope Theme 可 JSON 往返并按字段继承，两类第三方 Composite 在相同位置读取同一有效 Theme；runtime Scope 与 probe / replay 语义明确，Core-only 子树保持输出不变。领域默认物化与旧字段迁移由各领域后续 ADR 验收。
- Core 提供可独立复用的 style、stroke 与 Path 原子 schema/type；既有聚合 schema、IR、compile、Scene 与 Tier 2 / Tier 3 可观察行为保持等价。
- ADR-11 在接受前必须证明 `ScopePropsSchema` / `IRScopeProps` 与完整 Scope 等价，layout-aware authored Scope 的 placement、style/default/resetStyle、Theme、identity、metadata、animation、bounds 与 authored / allocation clip 均可观察且不由 Standard 或 adapter 旁路实现。
- ADR-12 在接受前必须证明未安装 Inspect 时 Core、Render、基础 adapter 与 Standard 根入口不含 Inspector 默认依赖；外部 observer 只读取最终 settled owner output，`@retikz/inspect` 的内置与第三方定义使用同一 registry，并在非递归的隔离片段编译中生成 occurrence-local Scene。Standard `/inspect`、quadratic / cubic Path 控制点、React / Vanilla 与 SVG / Canvas 必须闭环，且主 Scene 保持不变。
- ADR-14 在接受前必须证明 Foundation 根契约、直接依赖拓扑、Math 无真实消费时不声明依赖、typed string 失败语义和 Runtime / Render / Plot / Chart 错误兼容边界稳定，且不新增 IR、Scene、renderer 或领域 registry。
- ADR-15 已证明 selector-only Theme、Core / Plot / Chart 同名 style registry、领域 definition 缺失时的 fail-loud 语义、React / Vanilla / plain JSON 等价性与既有 token cascade 局部 override 优先级稳定。
- ADR-16 已证明六元组 ABI、运行时不可变单位矩阵、复合顺序与点映射稳定；Math 保持零依赖，TeX / Render 使用同一真源，同时 SVG parser、Scene hydration、可逆性、stroke 与诊断行为不变。
- ADR-17 已证明 Foundation 的唯一 Zod 依赖、六个根 schema、空白 / 数值边界、旧 owner 单一真源迁移和 consumer 完整 schema 行为稳定，且未下沉对象、数组、IR、领域 refinement 或 Diagnostic。
- ADR-18 已证明多个 roots 的传递闭包、共享 provider 单次物化、dataset `Object.is` 同源边界、缺失 / cycle / maker / definition 冲突，以及 React、Vanilla、SSR、直接 resolver 与第三方 provider 的同构行为。
- ADR-19 已证明 expand / layout-aware Composite 统一结构化输出，Scope / placement / replay transform 后的 world-space rect、owner path、origin / final occurrence、closed selector 与 retained revision 原子性稳定，且 Scene、SVG、Canvas 不承载该 sidecar。
- ADR-20 已证明统一 Input-to-IR、controller / static processing 边界、React / Vanilla / plain JSON 等价性、DOM retained 原子提交与公开入口依赖方向稳定。
- ADR-22 已证明内置、Standard 与第三方 Clip 使用同一个完整 Definition、registry、provider capability 与递归消费路径，definition/spec/shape kind 一致；canonical Scene clip path 继续可 JSON 往返并被 SVG、Canvas、Node Canvas、hit-test 与 visual bounds 等价消费，Core 默认仅保留矩形裁剪。

## 后续性能遗留

- reorder、全局layout fallback、快速连续revision与真实Tier 2 nested fixture尚未进入正式benchmark门禁。
- 最长阻塞与session内存尚未形成稳定、可复现的机器预算；alpha.2只冻结wall-clock统计、确定性work与live handle证据。
- 上述场景需在后续milestone补独立fixture、full oracle和同fingerprint baseline，不能从alpha.2现有结果外推。

## 不在 alpha.2 范围

- cooperative scheduler、优先级、取消、Worker 与时间片预算。
- progressive materialization 与 LLM generation session。
- pointer、keyboard、focus、selection、drag、brush、zoom 等交互语义。
- Plot / Table 的完整领域增量算法；alpha.2 只要求至少一个跨 Tier fixture 验证通用契约。
- Box / Flex / Grid / Overlay solver、LayoutItem schema、Standard baseline alignment policy 与完整 CSS intrinsic sizing；Core 只提供领域中立的 alignment guide contract。
- 为既有 `0.x` API 保留兼容桥接。
- ADR-17 之外的 Foundation / Math 通用 helper、领域错误迁移和包拓扑重设计；Foundation schema 只按 ADR-17 冻结的六个原子收口。
- rect 之外的 spatial band / point / path / polygon / union / intersection / polar / attachment 运算，以及事件、hit-test、selection 与 dashboard runtime。
- provider graph 的动态 import、包发现、版本求解、全局 mutable registry、dataset 生命周期与跨 revision 缓存。

## 授权边界

本 roadmap 的 Accepted 状态只记录已获人工确认的完成事实；本文件也不授权 commit、tag、publish 或 push。

## 历史设计记录

本目录中的 [上下文化 Composite 布局事务](./01-contextual-composite-layout.md) 曾以 alpha.2 ADR-01 立项，现已由 [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) 取代并完成实现、测试、文档与 Accepted 收尾。该文件仅保留为 Superseded 设计记录，不属于本 milestone 的现行 ADR 序列。
