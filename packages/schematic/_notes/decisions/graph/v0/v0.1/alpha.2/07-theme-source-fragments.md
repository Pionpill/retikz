# ADR-07：Graph Defaults、Rules 与 Theme 来源

- 状态：Proposed
- 决策日期：2026-09-05
- 主责：Graph，目标版本 0.1.0-alpha.2
- 关联：[alpha.2 roadmap](./roadmap.md) · [容器主题](./04-container-theme-inheritance.md) · [语义状态](./06-graph-status.md) · [Core Theme 协议](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.4/05-theme-source-fragments.md)

## 背景与目标

Entity / Relation Source 已将直接视觉字段放入 style；Graph Theme 仍以 tokens 和 rule.appearance 保存同义字段，Group / Block 则在 tokens 下包装已经存在的 Surface 字段。两套路径增加作者选择成本，也使 Flow 必须引用 token schema 才能描述正式输入。

本决策将作者显式默认命名为 graphDefaults，条件覆盖独立命名为 graphRules。Theme 是经 style definition 生成默认值与规则的来源；其生成片段与作者 defaults 复用正式 Source 契约。Graph 继续拥有 Entity / Relation / Group / Block 默认与语义规则，Diagram 通过其公开能力消费。

## 决策

### 作者默认、规则与主题生成

Graph、Group、Block 的作者输入采用两个独立字段；默认目标片段与规则均可省略：

```json
{
  "graphDefaults": {
    "entity": {
      "style": { "color": "#2563eb", "font": { "size": 14 } },
      "layout": { "align": "middle", "minimumSize": { "width": 100 } }
    },
    "relation": { "style": { "strokeWidth": 2 }, "labelFont": { "size": 12 } },
    "group": { "border": { "stroke": "#64748b" } },
    "block": { "cornerRadius": 6 }
  },
  "graphRules": [{ "type": "entity", "selector": { "status": "error" }, "style": { "color": "#dc2626" } }]
}
```

旧 graphTheme 删除，不作为别名。`GraphThemeStyleDefinition` 保留 name 与 resolve；resolve 返回 `{ defaults?, rules? }`，其中 defaults 与 graphDefaults 使用同一稀疏片段，rules 与 graphRules 使用同一有序规则契约。preset 使用相同生成结果结构，不再返回 entity.tokens / entity.rules。definition 输出的 defaults/rules 只表示生成结果，不新增 Source 根入口或 Core defaults 通道。

`graphRules` 是与 graphDefaults 分开的有序数组，允许单独使用。定义返回的 rules 追加于 Neutral 规则之后，作者规则按作用域从外到内消费；不按 selector 合并、不推断 CSS specificity，也不以空数组清除上游规则。内部有效结果只补全实际消费必需字段，不增加另一份持久化 schema。

### 默认化字段集合

| 目标           | 允许字段                                                                                                                                           | 保持的限制                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| entity.style   | color、textColor、fill、stroke、fillOpacity、strokeWidth、strokeOpacity、opacity、shadow、blendMode、dashed、dotted、dashPattern、dashOffset、font | 逐字段复用 Entity Source；不开放角色 shape、boundary、cornerRadius                                                         |
| entity.layout  | align、lineHeight、maxTextWidth、minimumSize、margin                                                                                               | 复用 Entity layout；不允许 padding，minimumSize 不能缩小 role 的尺寸下限                                                   |
| relation.style | color、stroke、strokeWidth、strokeOpacity、opacity、shadow、blendMode、lineCap、lineJoin、dashOffset                                               | 不开放 fill/fillOpacity/fillRule；dashPattern 仍由结构 recipe 与显式 Relation Source 决定                                  |
| relation       | sourceMarker、targetMarker、labelTextForeground、labelFont、labelOpacity                                                                           | 保持 Relation 同名根字段；marker 仅允许现有 color/fill/opacity/lineWidth，不创建 marker 或改变其 shape/size；不生成 labels |
| group / block  | background、border、cornerRadius                                                                                                                   | 保持正式 Source 的 Surface 根字段；不主题化 width/minWidth、padding、gap、overflow、caption、children                      |

字段必须从本表指定的 owner Source 片段派生；Core 后续新增字段不自动扩大白名单。Graph defaults 不包含实例 id、position、text、role、kind、status、predicate、direction、route、children 或关系端点。

Entity rules 只允许上述 entity.style 中除 font 外的字段；不允许 layout。Relation rules 允许上述 relation.style 与五个根字段。selector 仍按已确定的 role、kind、predicate、status，以及 Relation direction 匹配；匹配条件不成为赋值。

Neutral 状态规则保留 error/success/warning/disabled 的 Core semantic color 消费。Relation 的状态色继续同步已有两端 marker 的 color；不改变 fill、opacity、尺寸、方向或 marker 存在性。其它匹配规则仍可在其允许字段内覆盖状态默认。

### 局部作用域与容器

`graphDefaults` 与 `graphRules` 作用于承载容器的可见后代 Graph 元素，不反过来作用于承载它的 Group / Block 根 shell。group/block 默认片段可以影响后代 shell，但不新增容器 selector rules。

作者 defaults/rules 与 Theme 环境独立继承。Graph、Group、Block 或已支持透传的 Core Scope 出现自身 theme 时，只改变其内容的主题生成来源，不清除祖先作者 graphDefaults/graphRules；本地 defaults/rules 在祖先层之后应用。这取代旧 graphTheme 遇到 theme 即清空的混合环境语义。源容器 shell 仍使用进入 composite 位置时的 Core Theme 与祖先作者层，不预解析容器自身 Core theme 来改变自己的 shell。

透传范围沿用 Graph 当前对普通 Scope、Group、Block、Section、Row 及 Header child slots 的公开内容组合边界。不进入未知 composite 的私有 IR；不新建全仓 traversal 或把 Graph layer 塞入 Core Theme。裸 Core Node/Path 不消费 graphDefaults/graphRules。

## 覆盖与可观察行为

Graph 局部级联从低到高为：Neutral defaults → 当前同名 Graph definition.defaults → Neutral 与 definition 的匹配 rules → 各祖先作者层（逐层先 graphDefaults、后匹配 graphRules）→ 显式目标 Source。近层作者 defaults 可以覆盖远层 rules，当前层匹配 rules 再覆盖当前层 defaults；主题生成规则不能覆盖作者默认。各层合法 0、false 和字段允许的 null 有效；省略、optional undefined、空片段与空组不产生覆盖。

本决策保持 Graph 对 Core 默认通道的既有消费关系：Graph 已确定并物化的字段作为 Core 元素字段进入编译，优先于外层 Scope style/defaults；Graph 未给定的字段仍由 Core 原默认通道决定。新增可选 font/layout 在 definition 或作者 defaults 均未给值时保持稀疏，不为填满有效结果而抢占 Core defaults。Scope defaults.reset 仍只切断指定 Core 通道，不清除 Theme 环境或作者 graphDefaults/graphRules；不能把 reset 当作回到 Neutral。

显式 Entity/Relation 作者字段始终胜过 Graph 默认与 rules。role 的结构约束独立裁决：Entity minimumSize 是有效作者/主题需求与 role 下限的逐轴最大值，padding、shape 等仍由 role 决定；Relation 的 dash/marker 结构仍按其 role/kind/predicate/direction 与显式 Source 契约确定。

style/layout 按独立字段覆盖。Node font 整体替换，不混合两层 font 的子字段；Relation labelFont 按 Core label font 的字段补全，其后单个 label.font 再按字段覆盖。marker appearance 按其现有字段覆盖；不存在的 marker 不因 appearance 出现而被创建。background、border、paint、shadow、margin 与其它复合值保持正式 Source 的整体替换粒度，不通用递归合并。

主题变化允许改变表现布局，但保持成员集合、内容、identity、关系拓扑与标签存在性。Group / Block 的 Neutral shell 外观保持既有数值；新增片段被省略时不产生布局变化。

## 失败语义与兼容性

Graph 持久化 schema 在实际嵌套路径拒绝未知字段、旧 graphTheme/tokens/appearance 输入、非法 selector 和越界字段。开放 selector key 仍由对应 role/kind/predicate registry 诊断；当前 style 缺少 Graph definition 继续报告 DefinitionNotRegistered，callback 失败由 Graph owner 错误包装并保留 cause。

Direct IR、Vanilla、React 使用同一个 graphDefaults/graphRules 输入与 Theme definition 注入契约；不通过 adapter 接受旧包装或补视觉默认。图元通过现有 Standard / Core lowering 进入 Scene，SVG / Canvas 不解析 Graph Theme。

这是 alpha.2 的 breaking 迁移，取代此前 Theme token/appearance 作者路径及容器只具有 definition 默认的限制。旧 graphTheme、token 类型、别名、双入口与反向 projection 直接移除；此前 ADR 的 Graph 角色、容器结构与语义状态决策继续成立。
