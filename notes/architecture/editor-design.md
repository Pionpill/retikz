# Editor 编辑运行时架构设计

> **状态：架构草案，`@retikz/editor` 名称与领域 sibling adapter 方向已确认，当前尚未实现。** 本文定义 `@retikz/editor`、Kernel Interaction、领域主包、领域 editor adapter 与宿主 UI 的长期边界。具体公开 API、包发布组、版本路线和首个实现范围仍需由 roadmap / ADR 确认。
>
> 关联：[`能力完备性与模块边界`](./capability-design.md) · [`交互与增量运行时设计`](./interaction-design.md) · [`性能与增量运行时设计`](./performance-design.md) · [`跨域空间贴附与复用设计`](./attached-space-composition.md) · [`逻辑制图能力域设计`](./logical-diagram-design.md) · [`包拓扑`](./package-topology.md)

---

## 1. 定位

retikz 已经拥有 renderer-agnostic 的 IR、Scene、identity、ownership、transaction 和 lowering 主链，但这些能力只回答“文档是什么、如何编译和呈现”，没有统一回答用户如何直接编辑图形。

Editor 解决的是：

> 把 pointer、keyboard 等输入组织成选择、工具、拖拽、变换、吸附、预览和提交等图形编辑语义，再通过领域 adapter 形成可验证、可取消、可撤销的领域 transaction。

`@retikz/editor` 是无 UI 的图形编辑运行时。它不是浏览器手势库、renderer、万能文档模型或完整产品 Shell。它拥有“如何编辑”的横向语义，但不拥有 Graph、Plot、Table 等领域文档的具体修改规则。

```text
宿主输入
  → Kernel Interaction：事件、命中、target、ownership、presentation
  → Editor：selection、tool、gesture、command、candidate lifecycle
  → Domain Editor Adapter：把 edit intent 解释为领域 change
  → Domain Owner + Runtime：校验并原子提交领域 snapshot
  → Core compile / Scene / Renderer
```

这里的“领域无关”是指不识别 Graph、Plot、Table 等具体业务模型，不表示 Editor 没有语义。selection、drag、resize、snapping、history 本身就是图形编辑领域的稳定词汇。

## 2. 设计目标

Editor 长期需要满足：

1. React、Vanilla、SVG、Canvas 和未来桌面宿主共享同一套编辑语义。
2. Core IR、Graph、Plot、Table 和第三方 Tier 2 可以通过统一 adapter 协议接入。
3. 高频拖拽预览不要求逐帧修改领域文档，最终结果仍通过 owner transaction 原子提交。
4. selection、tool、command、history 和 AI action 可以共享 selection context、capability 与 candidate transaction 主链。
5. 内置领域 adapter 与第三方 adapter 使用同一注册、解析、诊断和执行机制。
6. 静态绘图包不因可选编辑能力而依赖 Editor，领域修改语义仍由领域 owner 决定。

本文不冻结：

- 具体 TypeScript 类型、字段名、事件枚举或状态机实现。
- pointer 阈值、snapping 距离、快捷键、默认工具和平台键位。
- React 组件、工具栏、属性面板、右键菜单或产品视觉设计。
- 每个领域首批支持的 edit action。
- package release group、版本号和实现顺序。

## 3. 总体分层

### 3.1 五层职责

| 层级                  | 主责                                         | 典型职责                                                                                 | 不拥有                                   |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| 宿主接线              | editor-react / editor-vanilla                | DOM / framework 生命周期、焦点、输入接线、订阅                                           | 编辑状态机、领域修改语义                 |
| Kernel Interaction    | runtime / core / render                      | 事件归一化、命中、target、ownership、presentation、revision                              | selection store、tool、history、领域策略 |
| Editor Runtime        | `@retikz/editor`                             | selection、gesture、tool、command、snapping、viewport、candidate lifecycle、history 协调 | 领域 snapshot、renderer、产品 UI         |
| Domain Editor Adapter | graph-editor / plot-editor / table-editor 等 | 把通用 edit intent 映射为领域 change，提供领域 handles、约束、诊断和 preview 解释        | 通用编辑状态机、领域 lowering            |
| Domain Owner          | core / graph / plot / table 等               | 文档 schema、合法修改、领域校验、lowering、locator / provenance                          | 通用 Editor runtime、宿主输入            |

Kernel Interaction 是 Editor 的底座，也可以脱离 Editor 服务 hover、tooltip、brush、dashboard selection 等运行时交互。Editor 只承接作者直接编辑图形或领域文档的场景，不接管所有交互行为。

### 3.2 依赖方向

```text
@retikz/editor ───────────────→ Kernel 公开 runtime / interaction 契约

@retikz/plot-editor ──────────→ @retikz/editor + @retikz/plot
@retikz/table-editor ─────────→ @retikz/editor + @retikz/table
@retikz/graph-editor ─────────→ @retikz/editor + @retikz/graph

@retikz/editor-react ─────────→ @retikz/editor + @retikz/react
@retikz/editor-vanilla ───────→ @retikz/editor + @retikz/vanilla
```

明确禁止反向依赖：

- `@retikz/editor` 不依赖 Graph、Plot、Table 或其它具体领域包。
- `@retikz/plot`、`@retikz/table` 等静态领域主包不依赖 `@retikz/editor`。
- Core、Runtime 和 Render 不依赖 Editor。
- renderer 和 React / Vanilla adapter 不拥有领域 edit policy。

## 4. 状态与所有权

编辑链路存在多种状态，不能合并为万能 store：

| 状态                           | 所有者                                   | 生命周期                   | 是否持久化                    |
| ------------------------------ | ---------------------------------------- | -------------------------- | ----------------------------- |
| Domain Snapshot                | Core / Graph / Plot / Table 等领域 owner | 跨会话稳定                 | 是                            |
| Runtime Revision / Transaction | `@retikz/runtime`                        | prepare 到 commit / reject | transaction 结果进入 snapshot |
| Editor Session                 | `@retikz/editor`                         | 当前编辑会话               | 否                            |
| Presentation State             | Kernel Interaction / Render              | 帧级或手势级               | 否                            |
| Product UI State               | Playground / Studio / 宿主               | 面板、弹窗、项目生命周期   | 由产品决定                    |

Editor Session 可以包含当前 selection、active tool、gesture phase、viewport、snap candidates、preview、command context 和 history cursor，但它不是领域文档真源。丢弃 Editor Session 后，领域 snapshot 必须仍然可以独立编译和渲染。

### 4.1 Selection

Editor 拥有“当前选中了什么”以及 replace、append、toggle、range、marquee 等选择策略。领域 owner 拥有 selector、identity、locator 和语义粒度；领域 editor adapter 负责把 hit-test / locator 结果归一为 Editor 可组合的 selection context。

一个 selection item 可以对应多个 Scene primitive，但每个 item 必须唯一解析到稳定语义 owner；一个复合 selection 可以跨多个 owner，再由 Runtime 判断候选事务能否原子协调。Editor 不以 Scene primitive id、DOM node、数组下标或临时对象引用作为持久选择依据。

### 4.2 Viewport

Editor 可以拥有当前编辑会话的 camera、pan、zoom、world / viewport 坐标换算和 viewport tool 状态。通用矩阵与几何计算复用 Math / Core；实际呈现和命中必须与 Kernel presentation 使用同一状态。

领域文档只有在自身语义明确要求时才保存 camera 或 view 配置。Editor 不把瞬时 viewport 状态默认写入 Core IR、GraphDocument、PlotSpec 或 TableSpec。

## 5. 编辑核心概念

以下名称描述稳定角色，不在本文冻结公开 API。

### Input Event

由 Kernel Interaction 或宿主 adapter 提供的归一化 pointer、keyboard、focus、wheel、pinch 与 viewport 事件。Editor 不直接依赖 DOM Event、React SyntheticEvent 或特定 renderer 对象。

### Interaction Target

命中结果携带稳定 identity、ownership、role、hit area、locator / provenance 与当前 materialization state。Core 和领域 owner 提供事实，Editor 根据当前 tool、selection 和 capability 决定是否消费。

### Selection Context

把单个命中、框选或多选归一成可查询的编辑上下文。它可以描述 target 集合、owner、语义粒度、共同 capability 和当前 revision，但不复制完整 Scene 或完整领域 snapshot。

### Edit Capability

描述一种领域对象可以参与的通用编辑行为，例如 selectable、translatable、resizable、rotatable 或 connectable。Capability 是 Editor 的编辑词汇；领域 adapter 根据领域事实注册和实现 capability，不由 Editor 识别具体对象类型。

Capability 描述能力，不直接等于产品按钮。当前 tool、权限、对象状态、renderer capability 和产品 policy 可以进一步限制候选 action。

### Tool 与 Gesture Session

Tool 决定一组输入在当前模式下如何解释；Gesture Session 保存一次连续交互的阶段、起始 revision、初始 selection、坐标和临时结果。它们负责从设备输入形成 edit intent，不直接修改领域 snapshot。

### Edit Intent

Edit Intent 表达领域中立的编辑意图，例如“平移当前 selection”“使用某个 handle 调整边界”“在两个 target 间尝试连接”。它携带稳定 target、参数、base revision 和上下文，但不是 PlotSpec patch、GraphModel patch 或 Table change。

Edit Intent 是 Kernel Interaction 可路由 intent 通道上的作者编辑语义，不替代 Kernel 的通用 intent envelope，也不替代领域 owner 的 change contract。

### Candidate Transaction

领域 editor adapter 把 Edit Intent 解释为一个尚未提交的候选事务。Candidate 至少需要表达 base revision、涉及的 owner、领域 change、preview / dry-run 结果、诊断和提交条件。

Candidate Transaction 不是第二份文档格式，也不是按数组下标构造的通用 JSON Patch。领域 change 的结构和合法性由领域 owner 定义，Editor 只协调其生命周期。

### Command 与 History Entry

Command 是可以由快捷键、菜单、工具、AI 或程序调用的离散编辑动作。连续 gesture 可以在提交时归并为一次 command transaction。History Entry 记录已提交事务的稳定引用、attribution 和领域提供的 undo / redo 能力，不复制领域文档语义。

## 6. 数据流

### 6.1 读取与选择

```text
Host Event
  → normalized event
  → renderer hit-test
  → target + ownership + locator
  → domain editor adapter normalization
  → selection context
  → Editor selection policy
  → presentation feedback
```

renderer 负责命中当前实际呈现的内容，Core / Tier 2 保证 target 可以追溯到语义 owner，Editor 决定 selection 如何变化。adapter 不从 renderer primitive 反推领域对象。

### 6.2 连续编辑

```text
begin gesture
  → freeze base revision and initial selection
  → produce edit intent
  → adapter prepares candidate domain change
  → validate candidate
  → update transient presentation / semantic preview
  → repeat while input changes
  → commit once or cancel
```

拖拽过程中允许使用两类 preview：

- presentation preview：只改变瞬时 transform、overlay、guide 或 cursor，适合高频反馈。
- semantic preview：在候选 snapshot 上执行必要的领域 pipeline，适合布局、约束或跨对象变化。

两类 preview 必须关联同一 base revision 和 candidate identity。presentation preview 不能绕过最终领域校验；semantic preview 也不能在 commit 前泄漏为正式 snapshot。

### 6.3 提交与取消

提交时，Runtime 重新校验 revision、owner 和领域前置条件，准备受影响 program，并原子切换 document、contribution、Scene、provenance 与索引。失败时继续暴露旧状态，Editor 清理或保留可恢复 candidate，并报告结构化诊断。

取消只丢弃 candidate 和 transient presentation，不需要对正式领域 snapshot 执行补偿性修改。若实现已经提前修改正式文档才能取消，说明 preview 与 commit 边界错误。

## 7. Transform、Snapping 与 Handle

Editor 拥有 transform gesture、约束键、snap session、候选排序、阈值策略和 guide 生命周期。Math / Core 提供矩阵、距离、求交、bounds 和坐标变换等通用计算；领域 adapter 提供领域目标、handle、合法自由度和 snap candidates。

例如：

- Editor 知道用户正在平移 selection，并从候选点中选择当前 snap result。
- Graph editor adapter 知道节点拖动是修改 manual geometry，或在 constraint 模式下生成 Flow constraint。
- Plot editor adapter 知道某个 handle 对应 annotation、legend placement 还是 plot-area 配置。
- Table editor adapter 知道列边界拖动如何形成合法的 column width change。

Editor 不通过 `target.type === 'plot-legend'` 等领域白名单选择行为。内置和自定义 adapter 必须使用相同 capability、handle、command 和 diagnostics 链路。

## 8. Tool、Action 与 Command Registry

Editor 需要统一的可扩展注册机制，使工具栏、右键菜单、命令面板、快捷键和 AI 可以消费同一动作真源。

候选 action 应由 selection context、capability、当前 tool / mode、领域 policy、权限和 renderer capability 共同解析，而不是写死在 Scene meta 中。Scene / manifest 只描述 target、handle、role、ownership 和其它事实。

Registry 至少需要支持：

- 内置与自定义 tool / command 走同一注册和解析路径。
- 根据 selection context 查询可用 action，而不是遍历 UI 组件。
- 在执行前进行参数校验、capability 检查和 base revision 校验。
- 返回不可用、冲突、降级和执行失败的结构化诊断。
- 同一 command 可以由人类输入、程序或 AI 调用，并进入相同 candidate / preview / commit 主链。

具体 registry 数量、schema 和优先级规则由后续 ADR 冻结，不能为单一 Playground 预先建立封闭白名单。

## 9. History 与 Undo / Redo

Editor 拥有 history 的交互语义和顺序协调，但不拥有领域 snapshot 或通用 inverse 算法。

一次正式 History Entry 应对应一次已提交的语义 transaction：

- 连续 pointer move 通常 squash 为一次提交。
- 多选对象变化可以组成一次原子提交。
- 跨 owner command 只有在 Runtime 能原子协调时才成为单条 history。
- undo / redo 仍以当前 revision 发起新的受控 transaction，不能静默覆盖并发后的状态。
- 领域 owner 提供 inverse change、restore contract 或等价的可撤销能力；无法安全撤销时必须显式诊断。

Editor 不保存一份与领域文档并行的长期 snapshot 栈。generation log、协作日志和普通用户 history 也不能混成同一语义。

## 10. Tier 2 Editor Adapter

### 10.1 所有权原则

领域主包与领域 editor adapter 分工如下：

| 领域主包拥有                            | 领域 editor adapter 拥有                        |
| --------------------------------------- | ----------------------------------------------- |
| 领域 snapshot / IR 与 schema            | Editor capability 注册与领域 action 暴露        |
| identity、selector、locator、provenance | hit / locator 到 selection context 的领域归一化 |
| 合法领域 change 与校验                  | Edit Intent 到领域 change 的映射                |
| lowering、manifest 和领域 diagnostics   | handle、tool、snapping 与 preview 的领域策略    |
| 全量与增量执行语义                      | command 参数与领域编辑体验                      |

领域主包不依赖 Editor。它提供独立于 UI 的稳定语义事实和修改入口；领域 editor adapter 同时消费领域主包与 `@retikz/editor`，完成编辑闭环。

### 10.2 独立 sibling package

领域 editor adapter 使用独立 npm 包，不从领域主包的 subpath 导出：

```text
@retikz/plot-editor  → @retikz/plot + @retikz/editor
@retikz/table-editor → @retikz/table + @retikz/editor
@retikz/graph-editor → @retikz/graph + @retikz/editor
```

这样静态领域包保持可独立安装和使用，Editor 也不会反向吸收领域依赖。领域 adapter 可以与主包处于同一 release group 并 lockstep 发布，但发布关系和兼容策略仍由首个实现 ADR 决定。

不使用 `@retikz/plot/editor` 等 subpath 作为长期边界。subpath 仍属于同一 npm 包，无法隔离依赖、安装、版本和职责。

### 10.3 消费态交互与作者编辑

Tier 2 的所有交互不自动进入 Editor：

- Plot hover、tooltip、brush、linked selection / filter 可以是消费态 interaction，由 Plot 领域 intent、Kernel Interaction 和宿主 runtime 协作，不要求安装 Editor。
- 拖动 Plot annotation、改变 legend placement、调整 authored layout 或修改 PlotSpec 属于作者编辑，由 `plot-editor` 接入 Editor。
- Table viewport、virtual scrolling 和只读选择可以属于展示 runtime；持久列宽、规则或 TableSpec 结构修改由 `table-editor` 接入。面向 spreadsheet / data-grid 的任意单元格编辑、公式和依赖计算仍不属于 Table 或 Editor 基础包。
- Graph 节点移动、连边、重连、waypoint 和 manual geometry 修改由 `graph-editor` 接入。

判断标准是操作是否进入作者文档或 Editor history，而不是它是否由 pointer 触发。

## 11. React、Vanilla 与产品宿主

`@retikz/editor-react` 与 `@retikz/editor-vanilla` 只负责框架和宿主接线：

- 创建、持有、订阅和销毁 Editor Session。
- 接入 DOM / renderer event source、焦点、pointer capture 和平台生命周期。
- 暴露等价的 editor state、command dispatch 和 overlay 挂载入口。
- 把宿主提供的领域 adapter 装配到 Editor。

它们不拥有 tool policy、领域 change、Plot / Table 特判或 renderer 私有编辑语义。

Playground、Studio 或其它产品 Shell 负责：

- 工具栏、面板、快捷键配置 UI 和菜单。
- 项目、文件、tab、autosave、资源与插件宿主。
- 权限、协作、云端服务和产品级持久化。
- AI 对话、预算、确认 UI 和自动化策略。

产品可以调用 Editor 的 selection、action、candidate、preview 和 history 契约，但这些产品能力不进入 `@retikz/editor` 基础包。

Inspector 可以作为一种 Editor tool 或独立产品面板消费当前 selection context、artifact、locator、provenance 和 diagnostics。Editor 负责把当前选择与 inspect action 接入统一上下文，领域 owner 负责可解释的语义事实，React / Vanilla 或产品 Shell 负责面板和 overlay；Editor 不从 Scene primitive 猜测完整领域结构。

## 12. Diagnostics 与失败语义

Editor 主链至少需要区分：

- 输入无法归一化或 renderer capability 不支持。
- target 已消失、ownership 不唯一或 locator 无法解析。
- selection 中的 capability 不兼容。
- adapter 未注册、action 不可用或参数非法。
- base revision 过期、candidate 冲突或 transaction 被拒绝。
- 领域 change 校验失败或 lowering / compile 失败。
- preview 可以降级但最终 commit 不可接受。

诊断必须携带稳定 action、target / owner、阶段和可恢复性信息。失败时不得留下部分提交、过期 overlay、pointer capture 或不可解释的 history entry。

## 13. 候选包结构

以下结构表达已经确认的所有权方向，不冻结 release group：

```text
packages/
├─ editor/
│  ├─ editor
│  ├─ editor-react
│  └─ editor-vanilla
├─ viz/
│  ├─ plot
│  ├─ plot-editor
│  ├─ table
│  └─ table-editor
└─ diagram/
   ├─ graph
   ├─ graph-editor
   └─ flow
```

普通 Core IR / Standard composite 的可编辑接入也必须遵循“领域修改语义与 Editor runtime 分离”的原则。其 adapter 包名、归属目录和首批能力需要真实用例后由 ADR 决定，不能为了 Playground 方便直接塞进 `@retikz/editor`。

## 14. 明确反对

- **反对把 Editor 做成 pointer / gesture 工具箱。** selection、candidate、command、history 和领域 adapter 共同构成完整编辑运行时。
- **反对让 Editor 直接修改任意 JSON。** 领域 owner 定义合法 change、校验与 snapshot，Editor 只协调。
- **反对让领域主包依赖 Editor。** 静态 authoring、SSR 和导出必须可以不安装编辑能力。
- **反对把所有 interaction 都归入 Editor。** 消费态交互可以只使用 Kernel Interaction 和领域 runtime。
- **反对由 renderer primitive 反推领域对象。** target、ownership、locator 和 provenance 必须沿正式主链保留。
- **反对把 preview 当作正式文档更新。** 高频反馈与 semantic commit 必须分离。
- **反对由 Editor 保存万能 snapshot history。** 领域 owner 保持文档真源和可撤销语义。
- **反对集中维护 Graph、Plot、Table 白名单。** 领域 sibling adapter 通过统一 registry 接入。
- **反对把项目、文件、面板、插件宿主或协作塞进 Editor。** 这些属于产品 Shell 或独立能力域。

## 15. 分阶段演进

### 阶段 0：边界沉淀

本文先确定 Editor、Kernel Interaction、领域 owner、领域 editor adapter 和宿主 UI 的长期边界，不创建包或冻结 API。

### 阶段 1：Kernel Interaction 前置

完成 renderer-agnostic event、target、ownership routing、presentation 与 domain intent 的最小闭环。若 Kernel 不能稳定定位、路由和预览，Editor 不应通过 DOM / SVG 私有路径补洞。

### 阶段 2：Editor 最小闭环

选择一个真实编辑场景，完成 selection、单一 transform gesture、candidate preview、commit / cancel 和一条领域 adapter 主链。首个场景只验证最小通用协议，不同时实现全部工具和领域。

### 阶段 3：Command、Snapping 与 History

在 candidate transaction 稳定后补 command registry、snapping、guide、undo / redo 和 React / Vanilla 等价接入。连续 gesture 和离散 command 必须共享提交主链。

### 阶段 4：Tier 2 扩展

通过至少两个不同领域 adapter 验证 capability、selection context、handle、diagnostics 和 package boundary，防止首个场景的领域词汇泄漏进 Editor。

### 阶段 5：跨领域与 AI 接入

在多 owner transaction、preview 和 history 稳定后，命令面板、AI action 与跨领域操作复用同一 action / candidate / diagnostics 主链。AI 不获得绕过领域 adapter 或 atomic commit 的写入通道。

## 16. 首个 ADR 的进入条件

Editor 首个实现 ADR 至少需要：

1. Kernel Interaction 的 target、ownership、event、presentation 和 revision 前置契约已经稳定，或由独立 Kernel ADR 先补齐。
2. 选定一个真实领域 editor adapter，并证明领域主包无需依赖 Editor。
3. 明确 selection、gesture、candidate、commit / cancel 的最小用户可观察行为。
4. 明确领域 snapshot、Editor Session、presentation 和 product UI state 的所有权。
5. React 与 Vanilla 能表达同一编辑契约，SVG 与 Canvas 差异通过 renderer capability 诊断。
6. 内置与自定义 adapter 使用同一扩展链路，不建立领域白名单。
7. 建立行为、不变量、反例和最低证据层的测试契约矩阵，并通过独立 Architecture Gate。

## 17. 判断标准

后续设计和实现至少满足：

1. 不安装 Editor 时，Core、Graph、Plot、Table 仍可独立 authoring、compile 和 render。
2. 同一 Edit Intent 可以通过不同领域 adapter 形成各自合法 change，Editor 不读取领域 schema。
3. pointer 高频更新只影响 candidate / presentation，正式文档只在 commit 时原子变化。
4. selection、preview、hit-test 与当前 materialization / revision 一致，过期结果不能提交。
5. 领域 adapter 可以新增 capability、tool 和 command，而无需修改 Editor 内置白名单。
6. React / Vanilla 和 SVG / Canvas 共享编辑语义，差异有明确 capability 与诊断。
7. history 记录语义 transaction，不成为领域 snapshot 的第二份真源。
8. Plot、Table 等消费态 interaction 可以脱离 Editor 独立运行，作者编辑才进入领域 editor adapter。
9. Playground、Studio、AI 和第三方宿主可以复用同一 selection、action、candidate 和 commit 主链。
