---
description: Diagram 外壳、区域间距、Legend 停靠及与 Core Theme 协作的显式默认契约
keywords: 'Diagram、Frame、Spacing、Appearance、diagramDefaults、padding、background'
---

# ADR-002：Diagram Frame、Spacing 与 Appearance

- 状态：Accepted
- 决策日期：2026-08-29
- 修订日期：2026-09-14
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Presentation](./001-diagram-assembly-presentation.md) · [Defaults 与 Theme](./008-theme-source-fragments.md)

## 背景与目标

固定 Presentation 槽位需要统一的物理排列、外壳和间距，才能让三个作者入口与各 renderer 得到相同图示。单一 gap 无法表达标题层级、主内容和 Legend 停靠的不同关系。

Diagram 拥有区域装配契约，并复用 Layout、Standard Surface 与 Core Text / Scope。具体 drawing core 保持自己的布局与关系语义。

## Frame 与物理区域

frame 是实例结构事实和显式外观配置；[ADR-008](./008-theme-source-fragments.md) 将旧 diagramTheme 替换为 diagramDefaults，并将文本切分为正式 style/layout 路径。

heading 由实际存在的 title、description 顺序组成，始终位于 main 上方。main 包含 drawing core 和可选 Legend；legendPosition 支持 top/right/bottom/left，默认为 right。对应停靠边决定两者排列顺序，没有 Legend 时不产生空轨道。

legendAlign 沿停靠边切线方向支持 start/center/end，默认 start。title、description、main 在交叉轴 stretch；文字对齐由区域 layout 决定，Legend 内容方向与内部对齐仍由 Standard 决定。

| Frame 字段                                          | 语义                              |
| --------------------------------------------------- | --------------------------------- |
| titleDescriptionGap                                 | 两个文本区域均存在时的非负间距    |
| headingMainGap                                      | 存在 heading 时与 main 的非负间距 |
| drawingLegendGap                                    | drawing core 与 Legend 的非负间距 |
| padding、background、border、cornerRadius、overflow | 同名 Standard Surface 输入        |
| legendPosition、legendAlign                         | 显式 Legend 的停靠边及沿边对齐    |

三种 gap 互不替代，缺失相邻区域时不消费。frame 不提供自由区域数组、overlay 或顶层快捷属性。

## Surface 与 Scope

完整 Diagram 始终使用一个 Surface 包装内容，尺寸由内容 allocation、padding 与父 proposal 决定，不新增 Diagram width/height。overflow 缺省 visible；clip 裁剪 Surface content，background 与 border 保留，圆角上限沿 Surface 规则。

外层 Core Scope clip 控制整个输出，包括 Surface 的背景与边框；与内部 overflow clip 同时存在时沿 Core 交集语义。内容、边框和溢出的 bounds 仍由 Core / Layout 计算；无法容纳 padding 的 proposal 沿 Surface fail-loud。

具体 Diagram 的有效 Core Scope 先于 Theme 解析、测量和完整装配生效。显式 id 标识最外层完整 Scope；localNamespace、transforms、placement、clip、zIndex、meta、animations 和 boundingShape 保持 Core 契约，派生外壳与文字不增加公共 identity。

## Theme 与显式 Defaults

Core theme.style 是唯一命名风格选择轴。省略时使用 Diagram Neutral；显式 style 必须存在同名 Diagram Theme Definition。运行时 Definition 通过具体 Flow 的 definition options 注入，不进入持久化 Source，也不建立全局 registry。

Definition 直接返回与 diagramDefaults 相同的稀疏对象。其 frame 只允许 padding、三种 gap、background、border、cornerRadius；presentation.title/description 只含 style/layout 默认，不含 text。空默认片段合法且不创建区域。legendPosition、legendAlign、overflow、内容和 drawing-core 布局不能来自这些默认。

优先级为 Neutral → 同名 Diagram Definition → diagramDefaults → 显式 frame / 文本区域。TextBlock 内部行 / run 格式继续沿 Core 契约。文本 font 整体替换，Surface 复合字段按原粒度替换，不做任意深合并；合法 0、false 与透明 paint 保留。

| Neutral 路径                           | 默认值                                          |
| -------------------------------------- | ----------------------------------------------- |
| frame.padding                          | 16                                              |
| frame.titleDescriptionGap              | 6                                               |
| frame.headingMainGap、drawingLegendGap | 16                                              |
| frame.cornerRadius                     | 0                                               |
| frame.background、border               | 省略                                            |
| title.style.textColor、opacity         | Light 黑 / Dark 白，1                           |
| title.style.font、layout               | size 18、weight 600；align start、lineHeight 22 |
| description.style.textColor、opacity   | Core semantic guide，1                          |
| description.style.font、layout         | size 14、weight 400；align start、lineHeight 20 |

Neutral 不设置 font family 或 maxTextWidth，字体环境与换行沿 Core 消费。发布包只维护 Neutral，命名 reference style 由宿主通过相同 Definition 契约提供。

## 文本继承

title 与 description 各下沉为无可见 shape、零 padding/margin、无公共 id 的 Core 文本 Node。标题区域隔离 Core node defaults，防止宿主给它添加背景或边框；Theme 仍生效，drawing core 仍消费完整 Scope 默认通道。

区域的 textColor/font/opacity 属于 style，align/lineHeight/maxTextWidth 属于 layout。行 / run 样式和 opacity 组合、字符串换行、数学内容、字体测量与 TeX lowering 全部沿 Core 路径，不另建 Diagram 文本机制。

## 三入口、失败语义与结果

Flow 的 Direct IR、Vanilla 和 React 共享 frame、diagramDefaults 与 presentation 区域对象。包根不提供任意 body 的通用 root；共享装配由具体 `/flow` 消费，adapter 不开放独有的 Frame 或 Theme 语义。

Frame 对象必须非空，Defaults 允许空片段；未知字段、负 gap/padding 与非法 Surface / 文本字段按 schema 拒绝。没有 Legend 却显式声明 legendPosition、legendAlign 或 drawingLegendGap 时 fail-loud；默认中的间距可在区域缺失时不消费。

命名 Definition 缺失、重名、非法输出与 callback 失败明确诊断，异常保留 cause，不回退 Neutral。Surface、Text、Legend、Layout 与 Core Scope 错误保持原 owner 语义。

完整装配通过 Layout 与唯一 Standard Surface 进入 Core Scene，旧 diagramTheme、平铺文本格式及临时 root 不保留兼容入口。
