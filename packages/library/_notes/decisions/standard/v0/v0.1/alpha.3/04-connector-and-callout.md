# ADR-04：Connector 路由与显式 Callout

- 状态：Superseded（由 [Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 取代；2026-08-15）
- 决策日期：2026-08-01
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-logic-diagram-profile.md) · [ADR-02](./02-headless-logic-frame.md) · [ADR-03](./03-semantic-logic-nodes.md) · [Core Path contract](../../../../../../../kernel/_notes/decisions/v0/v0.5/roadmap.md)
- 后继：[Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 已把连接语义统一迁入 `GraphConnector`，并保留 Core Path / target 主链；Callout 后续已由 Graph alpha.3 撤回

## 背景与目标

独立逻辑节点和 Block 需要通过 flow、branch、dependency、feedback 等局部关系形成可读逻辑图。直接使用 Core Path 可以表达几何，但不会保存关系 role 与 Block section target。与此同时，Connector 不能演变为全局 Edge 集合、自动 routing pipeline 或 GraphModel。

逻辑图还需要对整体组件或某个 Block section 添加定位说明。Callout 应复用同一 target，并要求作者显式决定 placement，不能引入全局碰撞求解。

## 决策：Connector 是 Core Path 的局部语义封装

```ts
type ConnectorInput = {
  id: string;
  role?: string;
  from: LogicDiagramPoint;
  to: LogicDiagramPoint;
  routing?: ConnectorRoutingInput;
  label?: IRGeometryLabelInput;
  appearance?: ConnectorAppearanceInput;
};

type ConnectorRoutingInput =
  | { kind: 'straight' }
  | { kind: 'polyline'; points: Array<LogicDiagramPoint> }
  | { kind: 'orthogonal'; pattern: 'hv' | 'vh' }
  | { kind: 'orthogonal'; pattern: 'hvh' | 'vhv'; ratio?: number }
  | { kind: 'quadratic'; control: Position }
  | { kind: 'cubic'; control1: Position; control2: Position }
  | {
      kind: 'bend';
      direction?: 'left' | 'right';
      angle?: number;
      looseness?: number;
    }
  | {
      kind: 'bend';
      tangents: { outAngle: number; inAngle: number };
      looseness?: number;
    };

type ConnectorAppearanceInput = Pick<
  IRPathBase,
  | 'color'
  | 'stroke'
  | 'strokeWidth'
  | 'strokeOpacity'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
  | 'roundedCorners'
  | 'marks'
  | 'zIndex'
>;
```

canonical routing 默认 `{ kind: 'straight' }`。`hv` 对应 `-|`，`vh` 对应 `|-`，`hvh` 对应 `-|-`，`vhv` 对应 `|-|`。三段正交 route 的 ratio 默认 `0.5`，表示中间轴位于 from-to 对应轴差值的归一化位置；ratio 必须位于闭区间 `[0, 1]`。

quadratic、cubic 与 bend 字段直接复用 Core curve / cubic / bend 的公开数值语义。显式 tangents 与 direction / angle 是互斥 bend 变体，避免一组可选字段产生优先级歧义。

`polyline.points` 只保存 from / to 之间的一个或多个显式中间折点，不重复首尾。没有中间折点时必须使用 straight，避免两个 canonical 持久化真值。

## Connector 行为

- role 是开放字符串；内置 flow、branch、dependency、feedback 只提供 authoring 常量，不触发 style preset
- appearance 只开放上方列出的 Core stroke Path 字段，不接受 fill、path kind、children、label、id、meta、animation、rotate 或 scale。默认是 1-unit solid currentColor stroke 与 Core 默认 end arrow mark，roundedCorners 为 0，zIndex 为 0；显式字段逐项覆盖默认值，其中 `marks` 替换默认 end arrow mark 而不是与其合并
- label 完整复用 Core `IRGeometryLabelInput`：支持文本 / TeX、字体、颜色、side、sloped、distance 与 position，不增加 Connector 私有 label 字段，也不接受任意复合 `IRChild`
- label 直接进入 lowered Core Path 的最后一个 drawable step；position 的默认值、归一化范围、该 step 的采样与失败语义完全沿用 Core step label，不由 Standard 重新测量或计算。straight、orthogonal、quadratic、cubic 与 bend 的最后一个 step 表示完整 route；polyline 的 label 明确定位于连接终点的最后一段
- from / to 与中间整体 target 在所在 namespace 注册阶段闭合后随 Core pending Path 解析，可以引用同一可见 namespace 中位于 GraphConnector 前后的目标；带 `section` 的 GraphFrame target 在当前 Core 下明确 fail-loud，不编码为扁平 id
- appearance 复用 Core stroke、dash、mark 与 z-index，不创建 Connector paint registry
- 同一个 from / to 可以出现多个 Connector；Standard 不去重或合并局部关系

self target 合法，因为 feedback 可以回到同一组件；但 Standard expand 不解析 authored target 的最终几何，也不建立独立退化判定。作者需要可见 self loop 时必须提供至少一个非重合的 polyline 中间点，或提供能形成非退化几何的 quadratic / cubic control；仅依赖重合端点的 straight、orthogonal 或 bend 不保证可见。最终零长度 / 退化 route 的产物与诊断完全沿用 Core Path 当前合同，Standard 不额外 fail-loud、采样或补 fallback。

Connector 不输出 typed artifact 或 compile occurrence locator。lowering 保留 authored id，Core 按 Scene contract 把它 stamp 到代表整条 Path 的最外层主体 primitive；存在整体 transform 时该主体是 transform group，否则是主 Path primitive。step label、mark 与其它附属 primitive 不带 Connector id，也不形成独立 locator。

## Callout 公开契约

```ts
type CalloutInput = {
  id: string;
  target: LogicDiagramTarget;
  content: IRChild;
  placement: {
    side: 'top' | 'right' | 'bottom' | 'left';
    gap?: number;
    offset?: number;
  };
  leader?: false | ConnectorAppearanceInput;
  appearance?: LogicNodeAppearanceInput;
};
```

Callout 根据 target 最终 boundary 与显式 side 放置 content container；gap 默认 8，offset 默认 0。content container 默认复用 Stage 的 rounded rectangle、8-unit padding、中性 style 与 visible overflow，显式 appearance 逐字段覆盖。leader 默认开启并连接 target anchor 与 Callout boundary，使用 1-unit solid currentColor stroke 且不带 mark；显式 leader object 逐字段覆盖该无箭头默认，`marks` 不注入 Connector 的默认 end arrow。`false` 只关闭 leader，不改变 placement。Callout 不尝试比较其它元素、翻转 side、缩短内容或寻找最佳位置。

Callout 使用当前 Core authored Scope placement，只能引用 authored order 中此前已经发布的普通单元或整体 Block。它不等待后续 sibling，也不对 forward placement 做拓扑排序或第二次 traversal；带 `section` 的 target 在进入 placement 前明确 fail-loud。

Callout placement 使用最终 target boundary 与最终 Callout outer boundary 的标准 side anchor，坐标系沿用 x 向右、y 向下的 Core user space。四个 side 的公开几何固定为：

| side     | 省略 `target.anchor` | Callout boundary anchor | outward normal `n` | positive offset tangent `t` |
| -------- | -------------------- | ----------------------- | ------------------ | --------------------------- |
| `top`    | `top`                | `bottom`                | `[0, -1]`          | `[1, 0]`                    |
| `right`  | `right`              | `left`                  | `[1, 0]`           | `[0, 1]`                    |
| `bottom` | `bottom`             | `top`                   | `[0, 1]`           | `[1, 0]`                    |
| `left`   | `left`               | `right`                 | `[-1, 0]`          | `[0, 1]`                    |

先解析 target anchor 并应用 `LogicDiagramTarget.offset`，得到世界坐标 `T`。显式 `target.anchor` 只替换表中的默认 target anchor；`side` 仍决定 outward normal 与 Callout boundary anchor，不自动翻转或改写显式 anchor。完成 content probe、size、padding 与 appearance 后，在未放置的最终 Callout outer boundary 上解析表中的本地 anchor `C0`；目标世界端点固定为 `C = T + n * gap + t * placement.offset`，整个 Callout shell 与 content 统一平移 `C - C0`。`gap` 是非负有限数，固定表示 `C - T` 在 outward normal 上的投影；`placement.offset` 是有限有符号数，top / bottom 下向右为正，left / right 下向下为正。它移动整个 Callout，不移动 target anchor。

leader 开启时是从 `T` 到最终 `C` 的单一 straight segment；artifact 的 `leader.from/to` 是这两个世界端点转换到当前 Callout allocation coordinate 后的值。`placement.offset` 非零时 leader 可以倾斜。`leader: false` 只移除该 segment，不改变 `T`、`C` 或 Callout placement。Callout 不按 leader 方向重新选择 anchor，也不把 gap 解释为 leader 的欧氏长度。

Callout typed artifact 的完整公开形态为：

```ts
type CalloutArtifact = {
  kind: 'callout';
  id: string;
  target: LogicDiagramTarget;
  placement: {
    side: 'top' | 'right' | 'bottom' | 'left';
    gap: number;
    offset: number;
  };
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  content: LogicLayoutItemArtifact;
  leader: null | {
    from: Position;
    to: Position;
    visualBounds: LayoutArtifactRect;
  };
};
```

artifact 使用 strict JSON schema；container、content、leader point 与 bounds 都位于当前 Callout allocation coordinate。`container` 只描述 content layout，`outer.shellVisualBounds` 只描述 Callout content shell。`outer.visualBounds` 是 shell、container.visualBounds 与 leader visualBounds 的 union；`outer.visibleBounds` 是 shell、container.visibleBounds 与 leader 的 union，content overflow 不裁剪 shell 或 leader。`leader: null` 只表示 authored `leader: false`；开启 leader 时即使某一轴长度为零也保留有限 bounds。

## 行为、失败语义与兼容性

- 默认行为：Connector 默认 straight，label position 沿用 Core step label 默认值；Callout 默认 gap 8、leader 开启；role / appearance 与 geometry 各自正交
- 失败与诊断：非法 ratio / Core label、负或非有限 Callout gap、非有限 placement offset / control / angle 与 Callout content probe failure fail-loud。Connector unresolved whole-target id 沿用 Core Path warning + skip 合同，其余 anchor / geometry 失败也不改写 Core Path；带 `section` 的 Connector / Callout target 在当前 Core 下以明确 unsupported diagnostic fail-loud；Callout 缺失或 forward whole-target id / anchor fail-loud；Connector 的解析后退化行为同样沿用 Core Path
- 兼容性：新增 Standard composite，不新增 Scene primitive 或 renderer API；前置 Core contract 由独立 Kernel ADR 负责
- React / Vanilla 等价性：adapter 只把 Callout React content、Connector label input 与 plain routing input 归一为 canonical Standard IR；路由只在 Standard / Core compile 主链执行

带 `section` 的 target 不回退到整个 Block，也不生成扁平内部 id；当前版本在 lowering / placement 前明确终止。非法 curve 不退化为 straight，Callout placement 失败不静默换边。duplicate id 与 namespace shadowing 继续使用 Core 诊断。

## 功能与包边界

- 所属能力域与解决的问题：Standard Drawing Complete 的局部关系与定位说明呈现
- 主责包与协作包：Standard 拥有 role、routing union、section target 与 Callout 布局 / artifact；Core 拥有 Path step label、路径几何 / bounds / Scene identity、target / anchor、arrow、Scene 与 renderer
- 拥有：一条显式局部关系、确定性 route lowering、label、Callout placement 与诊断
- 不拥有：Edge collection、port、topology、obstacle map、全局 routing、自动 placement 或交互 reconnect
- 外部扩展与下游闭环：复杂自定义路径继续直接使用 Core Path；Connector appearance 使用既有 Core provider / style 扩展面
- 不支持边界：需要自动避障、关系校验或全图布局时上移 Graph / Flow，不在 Connector 加 callback

## 架构验证

- 是否可由现有能力组合：Core Path 提供几何与结构化文本 label，但不保存局部关系 role、GraphFrame section target 或 Callout artifact，需要 Graph 语义封装
- 责任切分：Standard 规范化 route 并组合 Core steps；Core 执行 fold / curve / cubic / bend 数学与 target resolution；renderer 只绘 path / children
- 是否需要新 IR / contract / registry：新增 Connector / Callout composite IR；route 是闭合 union，复杂路径回到 Core Path，因此不增加 routing registry
- pipeline / lowering / renderer / diagnostics 如何闭环：Connector canonical route → 带同 id、且最后一个 drawable step 挂 label 的 Core Path；Callout canonical input → target-aware placement + typed artifact → Scene；错误沿 Core target / layout contract 提升
- provenance / locator 是否适用：Connector 只提供同 id Scene 主体挂点，不提供 compile artifact locator；Callout 通过 typed artifact 定位。role、endpoint target 与 section key 保留在 Standard canonical IR，业务 edge provenance 在 lowering 前由上层 join
- 结论：扩展 Standard，复用 Core Path，不建立 Graph / Flow

## 当前 Core capability 映射

alpha.3 不得用 Standard 私有 target resolver、派生全局 id 或路径采样绕过 Core。当前交付按以下映射闭环：

1. Connector 把 `IRGeometryLabelInput` 原样交给 built-in stroke Path 的最后一个 drawable step，并沿用 Core step label 的 position、side、sloped、文本 / TeX、样式、bounds 与诊断语义；不同时写入当前 stroke emitter 不消费的 Path-level label
2. 普通单元与整体 Block 使用 Core 当前 string id、namespace、anchor 与 pending Path lookup；Callout 使用 authored Scope placement 的 previous-only target 语义
3. `GraphFrameArtifact` 保留 authored section key 与 geometry，但 Core 提供 composite-owned structured subtarget 前，带 `section` 的 GraphConnector / Callout target 明确 fail-loud

后续 Core 增加 structured subtarget 时，Standard 只替换这一消费映射并补齐对应测试，不改变 `LogicDiagramTarget` 公开输入。当前版本不得把 target geometry、source-order index 或派生 id 复制到 Standard、adapter 或 renderer。

## 被否决方案

- Connector 接受任意 Core steps：会复制完整 Path DSL，并让 from / to 与 step endpoint 产生多个真源
- 只支持 straight：无法覆盖真实逻辑图的正交与曲线关系
- 自动 orthogonal / obstacle routing：需要全图几何与拓扑，属于 Flow
- Decision 保存 branch label：与 Connector role / label 重复关系真源
- Callout 自动选择 side：需要读取其它组件并执行碰撞求解
- 缺失 section 回退到 Block：会把引用错误静默画到错误位置

## 测试策略摘要

需要 schema 证据覆盖 route union、互斥 bend、ratio、appearance 白名单、Core label input 与 JSON round-trip；geometry 证据证明 straight、polyline、四种 orthogonal pattern、quadratic、cubic、bend 与 Core Path 对应语义一致，并锁定退化 route 委托；target 证据覆盖普通单元、整体 Block、collision-safe section、Connector 前后目标与 unresolved skip、Callout previous-only 与缺失引用；label 证据覆盖最后一个 drawable step 的文本 / TeX、position、side 与 sloped，并证明 polyline 只在终点段保留一个 label 真源；Callout 证据覆盖任意 IRChild、四个 side 的 target / shell anchor、法向 gap、切向 offset、leader 端点、overflow 与完整 artifact；adapter / renderer 证据证明 canonical、Scene 主体 id 与适用 artifact parity。

## 不在本 ADR 范围

- GraphModel、Edge / Port collection、topology validation 与 graph query
- obstacle avoidance、automatic routing、bundle / bridge、edge crossing reduction
- interactive reconnect、drag waypoint、hover / selection 与 animation runtime
- arbitrary Core Path step passthrough、closed path、ribbon 或 area connector
