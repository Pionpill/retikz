---
description: 将 Inspector 抽离为可选扩展包；背景：这使一个默认关闭的开发期能力进入基础编译、渲染和宿主入口
keywords: 'Inspector、sourcePath、InspectorDefinition、inspect、IRChild'
---

# ADR-021：将 Inspector 抽离为可选扩展包

- 状态：Accepted
- 决策日期：2026-08-06
- 接受日期：2026-08-07
- 关联：[Standard Layout Inspector ADR-012](../../../../../library/_notes/decisions/standard/v0/v0.1/012-layout-inspector.md) · [Standard Inspector 视觉语义 ADR-013](../../../../../library/_notes/decisions/standard/v0/v0.1/013-layout-inspector-visual-semantics.md)

## 背景与目标

Inspector 观察一次确定编译的结果，再用普通绘图能力生成不影响主图的辅助内容。将定义、选择、选项和呈现放进 Core 或基础宿主，会使默认关闭的开发工具增加基础依赖，并让 Core 持续吸收领域语义

本决策把 Inspector 抽离到可选 `@retikz/inspect`，Core 只提供领域中立的编译观测和隔离片段编译。Layout Inspector 后续由 Layout package family 接管；新增内置对象、批量选择、片段坐标与诊断遵循 [ADR-039](./039-builtin-inspection.md)

## 决策

### Core 观测底座

Core 的 `observeCompileToScene` 在普通编译结果之外返回 observer outputs。每个 observer Definition 为每次编译创建独立 session，以 select 请求所需 owner，以 observe 消费最终事件，最后调用一次 complete。重复 observer key 在编译前拒绝，结果按输入 definitions 顺序返回

Owner output 由对应 Definition 的 schema 验证。Composite 复用 artifactSchema；Path kind 可以声明 ownerOutput，仅在被请求时生成。ADR-039 扩展 Node、Scope、Coordinate 和 Clip 的同源观测。未选择 owner 时不为观察额外生成、读取或校验产物

只提交最终 occurrence：未选择的 probe、失败候选与未 replay 的结果不可观察。事件保留 owner、occurrence、value、最终 transform 与 origin/final provenance；ADR-039 增加最终祖先链。来源用结构化 locator 表达，不从错误文本推断

`compileFragment` 在当前 occurrence 的 Theme、providers、文字度量与局部环境中编译普通 IRChild，返回独立 Scene、artifacts 与 diagnostics。片段不触发递归观察，不共享主图 namespace、身份或资源，不把辅助结果写回 primary

Observer 创建、选择、产物校验、回调、片段编译或 complete 失败时 observed compile 原子失败。普通 compileToScene 不创建 session，也不受 observer 失败影响

### 可选 Inspector 扩展

`@retikz/inspect` 拥有 Inspector Definition、registry、选择、选项、appearance、diagnostics、辅助编译编排与 InspectionPlane。Core、Render、基础 React / Vanilla 和 Layout 根入口不得反向导入 Inspect

Inspector key 为 namespace + type；owner 是被观察对象，二者相互独立。同一 owner 可注册多个不同 key，重复 key 拒绝。内置与第三方共用 defineInspector、补全、注册、解析、回调和隔离编译路径

Definition 必填身份、owner、subjectSchema 与 inspect。作者省略 optionsSchema 表示只允许严格空选项；省略 resolveOptions 表示直接消费 schema 的解析结果；省略 mergeOptionsInput 表示更具体的输入整体替换

所有启用规则都先做选项准入，未匹配或被覆盖的非法规则也不能漏检。继承保留原始配置，合并后只应用一次 schema 默认与变换，再交给 resolveOptions；不把已变换输出重复解析。需要逐字段继承的 Inspector 提供 mergeOptionsInput，undefined 不覆盖父级，false 等显式值保留

Callback 消费只读 subject 和已解析 context，输出普通 IRChild 或 ADR-039 的 local/scene fragment。输出由 child owner 的 schema 校验，变异隔离与校验分开；不为同一精确 schema 输出再增加通用 JSON 解析。空输出合法且不生成 plane entry；没有任何 entry 时 plane 为 null

### 选择与宿主

InspectionSelection 是 runtime-only 输入，不进入持久化 IR。scene、subtree、self 按从整图、外层子树到当前对象的顺序求值；同 target 的同 Inspector 重复 request 拒绝。self 可按 authored sourcePath 与可选 occurrenceIndex，或精确 final occurrence 选择

true 表示空配置；对象遵循 Definition 的合并规则；false 关闭当前继承，但更深层可显式重开。barrier 关闭整图或子树中的全部 Inspector，后代不能重开。scene/subtree 只选择匹配 owner，显式 self 无目标、owner 不匹配或无 owner output 时失败

Path 的 scene/subtree 选择按 ADR-039 与其它 Inspector 一致，不保留早期 self-only 限制。贡献内部没有独立 authored site 的 Scope 不通过猜测构造 subtree locator；可用 final occurrence 精确选择

`@retikz/inspect/react` 与 `/vanilla` 提供可选编译驱动和 locator 收集接线，两者产生等价 selection。基础 adapter 不解释 Inspector key、选项、色板或关闭策略

`@retikz/layout/inspect`、`@retikz/layout-react/inspect`、`@retikz/layout-vanilla/inspect` 提供布局领域 Inspector，消费自身 artifact，根入口不静态加载它们。显式导入可选入口而缺少 peer 时由模块解析失败，不自动安装或返回空实现

### 普通只读图层

Render 只认识普通 Scene 图层：每项包含 key、scene 与 transform。主图单独决定 camera、fit、viewBox、布局、交互身份和增量 patch；辅助层不参与 viewport、hit-test、pointer、hydration、animation 或主图身份

SVG、Canvas、SSR 和 retained renderer 先处理 primary，再按顺序处理 layers。每层资源隔离，key 在帧内唯一。retained 后端以同一个 prepared token 提交或回滚整帧；任一辅助层失败不能提交新的 primary

Inspect 将 plane entry 映射为普通只读层。local 片段使用 observation transform，scene 片段使用单位矩阵，具体坐标契约见 ADR-039。辅助 Scene 在交付前移除公共 id、meta 和 animation，保留内部资源引用

### 诊断与确定性

InspectionDiagnostic 记录 selection、subject、inspect、output 或 fragment 的 origin。selection 保留 rule index 和合法 target；其余阶段保留 Inspector key、owner、occurrence，输出阶段再记录 outputIndex。Core warning 的 code、message、path 作为 cause 保留，不伪装成 primary warning

非致命辅助警告进入独立 diagnostics；ADR-039 的部分几何缺失可以警告并继续绘制其它支持项。非法选择、契约、回调和片段编译仍原子失败，retained 宿主保留上一 committed frame

相同 Source、definitions、选择和宿主参数产生同序结果。色彩与内置几何选项遵循 ADR-039 和当前 Core categorical / semantic 色板，不维护独立色值副本。开关 Inspect 不改变 primary Scene、artifacts、spatial handles、资源或命中结果

## 行为与兼容性

这是 0.x breaking 拆分。Core 删除 inspection 专用 contract 与 CompileResult.inspection；Render 删除 inspection 专用 frame/capability；基础 adapter 删除 inspect authoring。调用方显式使用 Inspect 可选入口，不保留旧导出或双轨接线

Inspector 不提供主图修改、跨平面引用、DOM/renderer 句柄、持久化 UI 状态、跨 compile 缓存、交互控制点或增量辅助 patch

## 最终结果

Core、Inspect、Layout 和 Render 分别拥有观测底座、辅助工具、领域检查和普通图层执行。React 与 Vanilla 共用同一 Inspect 编译驱动，基础入口不加载可选能力；内置检查扩展与第三方注册使用同一契约
