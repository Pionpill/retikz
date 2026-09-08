# ADR-08：Diagram / Flow 显式 Defaults 与 Theme 来源

- 状态：Accepted
- 决策日期：2026-09-05
- 主责：Diagram，目标版本 0.1.0-alpha.1
- 关联：[v0.1 roadmap](../roadmap.md) · [Presentation](./01-diagram-assembly-presentation.md) · [Frame](./02-diagram-frame-spacing-appearance.md) · [Flow Source](./07-flow-catalog-source-layout-groups.md) · [Graph Theme 片段](../../../../graph/v0/v0.1/alpha.2/07-theme-source-fragments.md)

## 背景与目标

Diagram presentation 的 Source 同名区域当前只存文本，Theme 却存格式；Flow Theme 同时承载视觉默认、布局方向和 routing，并以 flat tokens 与结构化对象双入口表达。字体、marker 和 routing 的合并也被混在同一流程中。

本决策让可主题化字段首先具有正式 Source 路径，再复用为作者 xxxDefaults 与 Theme definition 的生成片段。Diagram 保持外围区域装配 owner；Flow 保持平级 catalog、布局意图和自动路由 owner；Graph 保持关系语义、角色限制及最终绘图默认 owner。

## 决策与公开 Source

### Diagram 文本区域

`presentation.title` 与 `presentation.description` 使用同一种正式区域对象：

```json
{
  "presentation": {
    "title": {
      "text": "服务调用",
      "style": { "textColor": "#1e293b", "font": { "size": 18 } },
      "layout": { "align": "start", "maxTextWidth": 480 }
    }
  }
}
```

区域 text 必需，完整复用 Core TextBlock；style 只选 Core Node 的 textColor/font/opacity，layout 只选 align/lineHeight/maxTextWidth。`diagramDefaults.presentation.title` 与 description 选择相同 style/layout 子树，不含 text。空默认片段不创建标题或描述，源区域省略时没有布局占位。富文本内部显式内容格式仍沿 Core TextBlock 契约处理。

`presentation.legend` 保持显式 Standard Legend。Diagram Theme 不创建 Legend、不修改其内容或排列方向。`frame` 保持当前正式 Surface 和区域间距路径；`diagramDefaults.frame` 只允许 padding、titleDescriptionGap、headingMainGap、drawingLegendGap、background、border、cornerRadius，不加入 legendPosition/legendAlign/overflow。实例 Legend placement 与缺少 Legend 时的已有错误语义不变。

### Flow 实例字段

Flow 根新增正式 `layout` 与 `routing`：layout 只含 direction/nodeGap/rankGap，routing 复用既有 straight/orthogonal 判别契约。Root 和 Group 的 routing 分别声明当前 scope 的关系路由默认；Relation 的 routing 为单条覆盖。旧 layout.routing 与 Relation.layout 删除。显式 Layout catalog 仍用 direction/gap/align 固定排列其 children，不获得 routing 或 Graph identity。

Flow Entity.style 保留现有 Graph 允许的直接视觉字段和 font；align/lineHeight/maxTextWidth 移入 Entity.layout，与 minimumSize/margin 共存。不得引入 Graph Entity 禁止的 padding 或角色几何。

Flow Relation.style 只承载当前 Graph-compatible Path style。sourceMarker、targetMarker、labelTextForeground、labelFont、labelOpacity 移至 Relation 同名根字段，沿用 Graph 公开值契约。label 仍是可选非空文本，routing 与这些表现字段分离；不改变 Relation 的有序、无 identity Source。

Flow Group 删除原来的 style 总包，采用 Graph 同名根字段 padding/background/border/cornerRadius/overflow；保留 layout 作为 Group 内容的 direction/nodeGap/rankGap。原 label 字符串及 style.label 合并成 `caption.title`：text 保持非空字符串，textColor/font/opacity/align/lineHeight/maxTextWidth 复用 Graph caption title 对应字段。本次不扩展 description、side、direction 等未有 Flow 消费需求的 caption 能力。

以上迁移保留一个正式输入；不保留原字符串 label、平铺字体入口、style.layout 混装或自动兼容转换。

### 显式 Defaults 与 Theme 生成

`diagramDefaults` 与 `flowDefaults` 分别是两个 owner 的显式默认入口；删除 diagramTheme、flowTheme、flowThemeTokens，不保留别名。它们不选择风格、不解析 token，只按正式 Source 路径提供作者默认。例如：

```json
{
  "flowDefaults": {
    "layout": { "nodeGap": 24, "rankGap": 48 },
    "entity": { "style": { "font": { "size": 14 } }, "layout": { "maxTextWidth": 180 } },
    "group": { "padding": 12, "caption": { "title": { "font": { "size": 12 } } } },
    "relation": { "style": { "strokeWidth": 1.5 }, "labelFont": { "size": 12 } }
  }
}
```

| 片段     | 允许字段                                                                                                    | 对应正式 Source                                          |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| layout   | nodeGap、rankGap                                                                                            | Root / Group 的同名 layout 字段，作为自动 scope 间距默认 |
| entity   | style、layout 的上述 Flow Entity 字段                                                                       | Flow Entity；保持 Graph 限制                             |
| group    | padding、background、border、cornerRadius；caption.title 中除 text 外的字段                                 | Flow Group 同名根字段与 caption title                    |
| relation | Graph Theme 允许的 relation.style；sourceMarker、targetMarker、labelTextForeground、labelFont、labelOpacity | Flow Relation 同名字段                                   |

Defaults 与 Theme 生成片段都不接受 direction、routing、overflow、rank、catalog、children、role、kind、status、关系端点或内容；Relation 显式 Source 的 dashPattern 不自动成为可主题化字段。Flow defaults 不为 Layout catalog 新增样式或排列策略目标。Defaults 中的间距只是表现默认；scope 的正式 layout 与显式 Layout.gap 按各自契约裁决。

DiagramThemeStyleDefinition.resolve 与 FlowThemeStyleDefinition.resolve 分别直接返回与 diagramDefaults、flowDefaults 同形的稀疏默认对象；本 owner 当前不需要条件规则，因此不引入无消费者的规则容器或额外 defaults 包装。两者继续是已有 Theme 生成 contract，不合成全仓 registry。Graph appearance reference defaults 只在 Graph definition 维护；Flow definitions 仅提供 Flow 专属或确有宿主意图的默认，不复制 Graph preset 数值表。

## 级联、路由与消费

Diagram 区域和 frame 按 Neutral → 同名 Diagram definition → diagramDefaults → 显式区域/frame 字段确定。区域 font 作为 Node font 整体覆盖；不存在区域的默认只保留为数据，不生成区域。Surface background/border/padding 等复合值按其 Source 原粒度替换，0/false 等合法显式值不丢失。既有 heading 的 Core node 默认隔离和 drawing 内容的完整 Scope 语义继续成立。

Flow 样式先解析同名 Flow definition，再应用 flowDefaults，最后应用逐项显式 Source。同一字段的 Node font 整体替换，Relation labelFont 逐字段补全，marker appearance 按 Graph 已有字段规则覆盖；不递归合并 paint、Surface border/background、spacing、数组或判别联合。空对象/空组等同无覆盖，不向 Graph 生成无意义的空 font 或 marker。

这些已确定的 Flow 字段作为 Graph 的显式输入，优先于 Graph baseline/rules；没有 Flow 覆盖的字段继续委托 Graph 同名 definition 和状态规则。Graph role padding、shape、minimumSize 下限与 Relation marker/dash 结构限制不能被 Flow 绕过。测量与最终物化必须消费同一个已确定片段和同一组 Graph definitions，避免测量时的字体与最终绘制不同。

布局配置从低到高为：所选 Layout Definition 默认 → 当前有效 Flow 默认片段的 nodeGap/rankGap（先 definition、后 flowDefaults） → 祖先有效 scope layout → 当前 Root/Group 显式 layout。只有间距可以来自 Theme 生成值或 flowDefaults；direction 只来自 provider 默认、祖先与当前 Source。显式 Layout 的 direction/gap/align 保留其固定排列优先级，缺少 gap 时沿用已有最近有效间距语义。

routing 独立继承：所选 Layout Definition 默认 → Root routing → 各祖先 Group routing → Relation 所属最近公共 layout scope 的有效 routing → Relation.routing。显式 Layout 不开启新的 routing 配置层。straight 是完整替换，不能携带 cornerRadius；orthogonal 在省略 cornerRadius 时只继承同 kind 的有效值，再使用 provider 的 orthogonalCornerRadius，最后为 0。mode/style 不改变路由策略或方向。

Core Scope style/defaults/reset 继续按现有 Flow drawing 与 Graph lowering 链路消费；Flow 已物化的字段是 Graph 显式字段，没有物化的字段保留原有 Core 默认能力。defaults.reset 不清除 Theme。Flow 不向 Core composite context 注入领域状态，也不新增专用 renderer 分支。

## 失败语义与兼容性

持久化 Source 由 Diagram owner schema 在真实路径拒绝旧 flat token、错层 layout/routing、旧字符串区域及未知字段；不能从孤立 cornerRadius 自动推断 routing.kind。缺失同名 Diagram/Flow/Graph definition 分别由对应 owner 明确诊断，callback 失败保留 cause，不静默使用 Neutral。

Direct IR、Vanilla、React 表达相同的区域、实例与显式 defaults 契约；Vanilla 承担已类型化 authoring 组装，React 调度同一输入。Theme style/mode 的改变不清除作者 defaults，defaults 不隐式成为 Core node/path 默认通道。平级 catalog、唯一 containment、endpoint、provider capability 与 artifact 的 identity/顺序语义保持不变。

本决策替代 alpha.1 旧 token、Theme 内布局策略和 presentation 文本/格式分离契约，属于 breaking Source 迁移。旧 schema、类型、token projection、diagramTheme/flowTheme 双入口和别名直接删除；不改变 Graph / Core / Layout / Standard 的能力所有权。

## 最终契约

Diagram 与 Flow 的三种作者入口共享正式 Source 及其稀疏默认片段。Flow 的字体测量、有效布局与独立路由在 Graph 物化前保持一致，缺省表现继续由 Graph / Core 决定；显式默认不创建内容，也不扩展布局或路由策略。
