# ADR-03：Terminal、Stage、Decision 与 Junction 语义单元

- 状态：Proposed
- 决策日期：2026-08-01
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-logic-diagram-profile.md) · [ADR-02](./02-headless-logic-block-base.md) · [Standard Drawing Library](../../../../../architecture/standard-library-design.md)

## 背景与目标

传统流程图与架构说明需要少量稳定逻辑角色：流程的开始 / 结束、明确步骤、条件判断以及分叉 / 汇合。当前只能用 capsule、rounded rectangle、diamond、dot 或 bar 模拟这些角色；shape 替换、主题调整或 lowering 后，作者语义会丢失。

本 ADR 建立四个轻量 Tier 2 composite。它们不是完整工作流模型，也不保存连接集合；只让一个可独立绘制的局部逻辑单元保留稳定语义、内容、appearance、target 与 artifact。

## 决策：每个逻辑角色使用独立 discriminator，内容统一为 IRChild

```ts
type TerminalInput = {
  id: string;
  role: 'start' | 'end';
  content?: IRChild;
  appearance?: LogicUnitAppearanceInput;
};

type StageInput = {
  id: string;
  category?: string;
  content: IRChild;
  appearance?: LogicUnitAppearanceInput;
};

type DecisionInput = {
  id: string;
  content: IRChild;
  appearance?: LogicUnitAppearanceInput;
};

type JunctionInput = {
  id: string;
  role?: string;
  content?: IRChild;
  appearance?: LogicUnitAppearanceInput;
};
```

canonical discriminator 分别为 `standard.terminal`、`standard.stage`、`standard.decision` 与 `standard.junction`。四者都使用 `content`，不为 Decision 建立 `condition` 字段，也不为 Terminal / Junction 发明专有文本结构。

`LogicUnitAppearanceInput` 的完整公开形态为：

```ts
type LogicUnitAppearanceInput = {
  size?: LayoutSizeInput;
  padding?: number | IRBoxSpacing;
  overflow?: 'visible' | 'clip';
  shape?: string | IRShapeRef;
  boundary?: IRBoundary;
  style?: IRDrawableStyle;
  dashPattern?: IRPathBase['dashPattern'];
  dashOffset?: IRPathBase['dashOffset'];
  zIndex?: number;
};
```

`style` 完整复用 Core `IRDrawableStyle`，shape / boundary 复用 Core provider 引用；dashPattern / dashOffset 覆盖 outer outline 对应字段。shape-specific 参数只通过 `IRShapeRef.params` 表达，不提供会在部分 shape 上静默失效的顶层 `cornerRadius`。内容 style 属于 content child，不由外层单元复制，不提供 background / border alias。

四种 artifact 的完整公开形态为：

```ts
type TerminalArtifact = {
  kind: 'terminal';
  id: string;
  role: 'start' | 'end';
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  content: LogicLayoutItemArtifact | null;
};

type StageArtifact = {
  kind: 'stage';
  id: string;
  category?: string;
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  content: LogicLayoutItemArtifact;
};

type DecisionArtifact = {
  kind: 'decision';
  id: string;
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  content: LogicLayoutItemArtifact;
};

type JunctionArtifact = {
  kind: 'junction';
  id: string;
  role?: string;
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  content: LogicLayoutItemArtifact | null;
};
```

artifact 使用 strict JSON schema；所有 geometry 都位于当前单元 allocation coordinate。`container` 只描述可选的单一 content layout，不包含外层 shape；`outer.shellVisualBounds` 包含 shape fill、outline 与 shadow，`outer.visualBounds/visibleBounds` 按共同 profile 合并 shell 与 content。无 content 时 container 仍保留 resolved allocation / content rect，visual 为 canonical zero、visible 为 null。connection anchor 不复制进 artifact，而是始终由 Core 根据最终 outer boundary 与 authored target 解析，避免第二份几何真源。

## 默认呈现

- Terminal：role 必填；start / end 默认都使用 capsule + shape boundary、content size with 48 × 24 minimum、x=12 / y=6 padding，语义差异不依赖颜色或图标
- Stage：默认使用带 `{ cornerRadius: 8 }` provider params 的 rectangle shape ref + shape boundary、content size 与 8-unit padding，用于一个明确、轻量的流程步骤；category 是开放作者元数据
- Decision：默认 diamond + shape boundary、content size、12-unit padding，用于条件判断或分支点；分支名称和目标只存在于 Connector
- Junction：默认 circle + shape boundary、两轴 content 且 minimum 为 8 × 8、无 padding；无 content 时使用 currentColor fill 且无 outline，形成 dot。作者选择 bar 等 appearance 时仍保持 `type: 'junction'`。role 可表达 fork、merge、join、continuation 或任意自定义语义

除 Junction dot 的 fill / outline 特例外，共享中性 style 为 transparent fill、1-unit solid currentColor stroke、opacity 1；默认 overflow 为 visible、zIndex 为 0、dashPattern / dashOffset 缺省。显式 appearance 从共享默认和组件 preset 上逐字段覆盖；shape / boundary 分别覆盖，不根据 role / category 二次改写。显式 `shape` 替换完整 preset shape ref，不继承被替换 shape 的 params；例如 `shape: 'rectangle'` 使用 Core rectangle 默认参数，需要圆角时显式传入对应 `IRShapeRef.params`。

默认 shape 只是 appearance preset。作者替换 Decision 为圆形、Terminal 为矩形或 Junction 为 bar 后，canonical IR、artifact kind 与 target identity 不变。

## 布局与用户可观察行为

- Stage / Decision 必须提供 content；Terminal / Junction 可以省略 content
- 有 content 时，外层以 layout-aware probe 获取 minimum / natural contribution，应用 padding 与 size 后把最终 slot 传回 child
- 无 content 时仍按默认 size 产生可连接 allocation；不生成隐式空文本 Node
- 默认 size、padding、outline 与 fill 使用上方完整 preset；shape 特有几何由既有 Core shape / boundary contract 解析
- standard anchors、angle anchor 与 side fraction 都在最终 outer boundary 上解析；appearance 替换后 anchor 跟随新 boundary
- visual overflow 不改变 authored fixed / fill allocation；clip 只使用最终 container allocation

## 行为、失败语义与兼容性

- 默认行为：相同 content 与 appearance 产生确定 geometry；role / category 不触发隐藏 style mapping
- 失败与诊断：空 id、非法 Terminal role、缺失必填 content、非法 appearance、shape provider params 或 child probe failure fail-loud；未知 Junction role / Stage category 合法
- 兼容性：新增 Standard composite，不改变 Core Node、Path 或既有 Standard Frame / Layout 行为
- React / Vanilla 等价性：React children、Vanilla input 与直接 factory 只归一为同一 `content: IRChild` canonical IR

Decision 不拥有 outcomes、yes / no、branch anchors 或 connector id 列表。多个 `role: 'branch'` Connector 从 Decision 的标准 boundary anchors 出发，关系语义只保存一次。Junction 同样不检查真实入边 / 出边数量；拓扑不一致不属于局部绘图组件可诊断范围。

## 功能与包边界

- 所属能力域与解决的问题：Standard Drawing Complete 的轻量逻辑语义单元
- 主责包与协作包：Standard 拥有 discriminator、默认 appearance、layout 与 artifact；Core 拥有 child、shape / boundary、target、Scope 与 Scene
- 拥有：start / end、stage、decision、junction 的局部语义与默认呈现
- 不拥有：执行条件、业务状态、outcome 集合、入出边统计、端口、拓扑与自动布局
- 外部扩展与下游闭环：任意 IRChild 与 appearance 覆盖提供内容 / 视觉扩展；不需要新的 role registry
- 不支持边界：需要领域 workflow 状态或 graph validation 时由上层 model / adapter 拥有

## 架构验证

- 是否可由现有能力组合：Node + shape 可以画出外观，但不能保存逻辑 discriminator，因此需要 Standard semantic composite
- 责任切分：Standard 保存语义并组合 content / outer appearance；Core 解析 shape、boundary、layout 与 Scene；renderer 无专有分支
- 是否需要新 IR / contract / registry：新增四种闭合 composite IR；shape 扩展复用 Core registry，category / role 是不参与 dispatch 的开放字符串
- pipeline / lowering / renderer / diagnostics 如何闭环：schema → layout-aware definition → outer Core geometry + content replay + artifact → Scene
- provenance / locator 是否适用：组件 id、kind、role / category 与 occurrence 提供 locator；业务 execution lineage 不适用
- 结论：扩展 Standard，不建立 Graph 或 workflow 能力

## 被否决方案

- 用一个 `LogicUnit` + `kind` union：会把差异显著的公共组件压进万能 schema，并弱化 authoring 与 artifact 类型
- 用 shape name 表达语义：主题或自定义 shape 会破坏持久化语义
- Decision 保存 outcomes：与 Connector 重复关系真源，并隐式引入 port / topology model
- Stage 使用 LogicBlockBase compact mode：简单流程步骤会被迫承担 header / section 外壳，富内容 Block 也会失去清晰边界
- Junction 根据连接数量推断 fork / merge：需要全局 edge collection，超出 Standard 局部能力

## 测试策略摘要

需要 schema 证据覆盖 discriminator、共享 content、closed Terminal role、开放 category / Junction role、shape-specific params 与 invalid appearance；layout 证据覆盖有 / 无 content、约束、完整 shape ref override、anchors、overflow 与 child failure；semantic 证据证明 shape 替换不改变 artifact kind；Connector 集成证据证明 Decision branch 只存于关系组件；adapter 与 renderer 证据证明 canonical parity 和 Scene parity。

## 不在本 ADR 范围

- Connector / Callout 的字段、routing 与 label
- 完整 UML activity、BPMN、state machine 或 workflow execution
- 端口、outcomes、自动分支布局与连接数量验证
- Process / Class / Data recipe 与 LogicBlockBase section 模型
