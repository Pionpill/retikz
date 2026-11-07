# Standard Pipeline Compile

`pipeline/` 和 `compile/` 是编排与消费层。公开编译入口接收已类型化的 Source IR 后，创建并维护 registry、引用、host、data、theme、measurement 等 context，在依赖就绪点调度纵向领域 `resolveXxx`，再执行 lowering / layout / emit，输出 Kernel IR 或 Scene primitive。默认、优先级、lookup、领域值转换和 Canonical 数据结构属于 `resolve/`；不要散落到 pipeline / compile。

`SceneReconciler` 是完整与增量 Scene 编译的唯一底层执行入口，通过 `mount` / `replace` 接收完整 `IRScene`；Vanilla 的一次性便捷入口管理临时非增量实例。单元素计算及产物组装契约按实际职责保留，不另建独立完整编译驱动。`InputXxx -> IRXxx` 的 authoring normalize 属于 Vanilla，`unknown -> IRXxx` 的 parse 属于 parse / schema 边界。

## 分工

- `pipeline/`：Tier 2 到 Kernel IR 的 lowering 编排，例如 plot 的 data / scale / coordinate / transform / mark / guide 阶段。
- `compile/`：Kernel IR 到 Scene primitive 的确定性编译，Core 提供坐标、路径、节点等原子阶段；Reconciler 管理完整 context 生命周期、遍历、命名空间、Composite 调度与输出组装。

具体规则回到拥有概念的层：schema 形态回 `schemas`，能力协议回 `contract`，内置实现回 `providers`，通用纯函数回 `shared`，unknown、字符串或 DSL 到 IR 的 eager 解析回 `parse/`。

## 原子阶段与驱动

以下规则适用于 Core、Plot 及其它领域的 compile / pipeline，不限定全量或增量入口：

- 按明确输入、产物、不变量和依赖就绪点划分可复用阶段；各驱动调用同一套领域计算与输出语义，自行组合顺序、管理遍历、等待重试、缓存和提交。沿现有阶段抽取，不强制统一完整元素包装，不将所有 helper 公开
- 阶段声明自身所需的最小上下文，复用已有注册表、测量、位置解析、资源登记等权威能力契约；完整 shared context 与 workspace 由驱动持有，不作为所有阶段的必需输入或共同基类
- 调用方可直接提供结构上满足契约的更大对象，无需为窄类型复制投影；阶段不得访问未声明能力。需要绑定查询、来源或收集器时在驱动适配处组合，不让领域阶段认识调用方运行时
- 同一领域的主上下文按 [分层规范](../SKILL.md#必须保持) 统一维护，内部阶段通过 `Pick` / `Omit` 声明依赖子集；不为每个阶段另建上下文再交叉组合。可变局部量留在函数内，确需共享的工作状态才显式建模；命名遵循 [上下文、状态与运行时](../../standard-name/references/layers.md#上下文状态与运行时)
- 几何、布局和输出优先作为返回值；查询、测量、资源登记及诊断通过窄能力注入。资源登记算法与重映射规则由能力 owner 提供，调用方决定工作区生命周期；资源引用与所引用资源必须配套保存
- 回调不自动保证隔离：可丢弃计算的资源与诊断写入本次工作区，失败或未就绪不得污染已提交结果。等待与重试归驱动，不能把未就绪当作缺失或真实错误；原子阶段不发布结果、不维护驱动依赖图
- 解析、布局、输出的共享边界必须覆盖默认值、坐标、范围和资源等领域语义，不能只共享底层算法而让驱动各自解释规则。阶段拆分不自动代表可独立缓存或增量复用，复用条件由能力 owner 明确

Core 不持有完整编译入口或反向依赖 Reconciler。全量与增量首轮共用 Reconciler 执行器，是否增量只决定 Weave 缓存的保留；缓存直接保存 Core 实际阶段产物，不另建简化模型。

## 确定性

编译结果必须保持确定性：相同 IR + 相同 options 得到相同 Scene。不要用 `Math.random()`、`Date.now()` 或 module-level mutable state 影响输出。

## Public options

- 完整 compile options 由 Reconciler 持有，绘图能力字段以 [CompileOptions](../../../../packages/kernel/reconciler/src/compile/types.ts) 及其组合契约为准，不在规范维护第二份字段清单。
- plot 新增 registry option 优先用 `xxxDefinitions`；既有 `coordinates` 是历史例外，除非保持同一能力兼容，否则不要复制。
- options 只传 definition 或编排策略，不传函数进 IR schema。

## Registry 消费

- pipeline / compile 在 context 初始化时调用 provider registry resolver，并把有效 registry 注入窄 `XxxResolveContext`。
- 领域 `resolveXxx` 执行具体 provider lookup、fallback 与未注册名诊断；不复制内置白名单，不分叉“内置 vs 自定义”。
- schema 层只保证 provider name 的 JSON 形态；未注册名、lookup 失败和用户 definition 参与的优先级模型属于 resolve。
- lower / layout / emit 只消费 resolver 已确定的 definition、Canonical 或 Resolution，不重新查表或选择 fallback。

## 命名

compile / pipeline 阶段的类型，**前缀表示数据处理阶段，主体及后缀表示数据是什么、用于什么**；阶段含义和组合规则统一遵循 [分层命名](../../standard-name/references/layers.md#按语义阶段命名符号)。

目录、文件和符号名以 `standard-name` 为唯一真源。`CanonicalXxx`、`XxxResolveContext` 与必要的 `XxxResolution` 定义在纵向领域 `resolve/<domain>/types.ts`，由 `resolveXxx` 产出。pipeline / compile 只创建 context、维护动态状态并决定调用时机。若 context 产生独立概念，按数据阶段与用途命名，继承合并态使用 `MergedXxx`，编译计算结果使用 `CompiledXxx`，其他概念使用准确领域名，不使用泛化 `ResolvedXxx`。warning code 使用 const object enum 与同名 `ValueOf` 派生类型，message 写当前契约。

函数动词按 [阶段命名](../../standard-name/references/functions.md)；compileXxx 只用于跨阶段编排，不作为所有 helper 的前缀。

- `layoutXxx` 可在依赖就绪时调度领域 resolve，但不自行复制其默认、lookup 或 fallback 逻辑。
- `emitXxx` 输出 Scene primitive / resource；`collectXxx` 只向显式传入的 collector 追加所声明的对象，不隐藏编译阶段推进。
- 纯计算不查 registry、不产生 warning、不修改 context；函数动词以 `standard-name` 为准。

## Pipeline / Compile 文件结构

- SceneReconciler 持有完整编译入口及会话执行配置，compile owner 提供内部计算与组装；Core 领域 `compile.ts` 组合本领域原子阶段与产物，不持有完整 Scene 执行生命周期。文件位置遵循各自 owner 规则，不把完整驱动模板套到领域阶段。
- 目录级 `index.ts` 只做稳定入口导出，不承载业务逻辑；按 [导入导出](imports.md) 的可见性规则选择全部或精选导出。
- 大型 compile domain 按 `types.ts` / `lower.ts` / `layout.ts` / `emit.ts` / `decorations.ts` / `output.ts` 拆分；领域 `resolve.ts` 位于顶层 `resolve/<domain>/`。缺哪个阶段就省略对应文件，不为了模板机械建空文件。
- `compile/<domain>/types.ts` 只放 compile / pipeline 私有消费态类型；`CanonicalXxx`、`XxxResolveContext` 与必要的 `XxxResolution` 定义在 `resolve/<domain>/types.ts`。orchestration 创建并维护 broad context，在调用点投影为窄 resolve context；`lower.ts` 输出低层 IR / command / geometry input；`layout.ts` 度量或计算中间模型；`emit.ts` 输出 primitive / resource；`decorations.ts` 输出附属 primitive；`output.ts` 做 group wrapping、bounds result、transform 等输出包装。
- `orchestration/` 放跨 domain 编排：context、composite lowering、traversal、primitive sink、diagnostics、bounds、运行时 types；不要放 node/path/text 的具体 emit 细节。
- Core `compile/` 的具体文件职责以 [compile/AGENTS.md](../../../../packages/kernel/core/src/compile/AGENTS.md) 为准；按实际能力设置阶段文件，不在本规范复制目录清单。
- `pipeline/` 是 Tier 2 到 Kernel IR 的阶段编排；阶段文件优先用业务阶段名（如 `expand.ts`、`layout.ts`、`decoration-layout.ts`、`provenance.ts`），复杂阶段再拆为子目录（如 `guide/`、`locator/`）。阶段内部按实际职责使用 `types` / `lower` / `layout` / `emit`；Source IR 与 context 的结构确定化始终导入顶层 `resolve/<domain>/`，不在 pipeline 内建立平行 `resolve.ts`。

## 迁移判断

- 跨能力复用纯函数 → `shared`。
- 内置项如何工作 → `providers`。
- 用户如何定义能力 → `contract`。
- provider registry 合并 → `providers`；具体 lookup、fallback 与上下文诊断 → `resolve`。
- IR 字段是否合法 → `schemas`；补全后不变量、lookup 失败和运行时上下文优先级 → `resolve`。
- `unknown`、字符串或序列化 DSL 解析成 Source IR → `parse`；框架 authoring Input 由 Vanilla API `normalizeXxx` 构建。纵向领域 resolver 负责 Source IR + context → Canonical / Resolution；pipeline / compile 不重复 parse 或复制 resolver，只保留 context 生命周期、阶段顺序与 Scene 编译核心逻辑。
