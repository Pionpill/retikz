# ADR-15：Chart Source 默认片段与 Plot 转发

- 状态：Proposed
- 决策日期：2026-09-05
- 主责：Chart，目标版本 0.1.0-alpha.1
- 关联：[alpha.1 roadmap](./roadmap.md) · [精确 Chart Source](./09-family-recipe-chart-schema.md) · [Core 默认协议](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.4/05-theme-source-fragments.md) · [Plot 默认片段](../../../../plot/v0/v0.2/alpha.1/14-theme-source-fragments.md)

## 背景与目标

Chart 的 Source theme 同时接受命名选择与内联 token，presentation 只保存文字，格式却使用另一套平铺字段。recipe Theme 的 Axis、grid、Legend 开关还决定语义对象是否生成。该结构混合了主题来源、显式默认和图表结构，且要求 Chart 维护 Plot token 转发。

本决策让 Chart 的正式区域同时保存内容与格式，以 chartDefaults 提供同形的稀疏默认；主题选择统一使用外层 Core 环境，Plot 默认保持 Plot-owned，recipe 的部件存在性成为正式 Source 意图。

## 决策与公开契约

### Chart 实例与默认片段

presentation 的 title、subtitle、note、source 统一使用 `{ text, style?, layout? }`。text 必需并复用 Core TextBlock；style 仅含 textColor、font、opacity；layout 仅含 align、lineHeight、maxTextWidth。区域依旧按 title → subtitle → plot → note → source 排列，省略的区域不生成、不占位。富文本内部格式保留 Core TextBlock 语义。

Chart 根 background 复用 Standard Surface background。根 layout 保留 width/height，并增加 padding 与 gap，分别表示 Chart 容器内边距和相邻 presentation 区域间距；它们不配置 Plot 内部布局。background 整体替换，padding/gap 保持 Layout 正式值契约。

`chartDefaults` 只含 background、layout.padding/gap 与四个 presentation 区域的 style/layout；不含 text、width/height、id、data、coordinate、recipe、marks 或 plotExtension。字段从对应正式 Source 显式选择，不因底层 schema 新增字段扩大默认集合。

```json
{
  "presentation": {
    "title": { "text": "分类比较", "style": { "font": { "size": 20 } } }
  },
  "layout": { "width": 800, "padding": 20 },
  "chartDefaults": {
    "presentation": { "title": { "layout": { "align": "start" } } }
  },
  "plotExtension": { "plotDefaults": { "palette": { "categorical": ["#2563eb", "#f97316"] } } }
}
```

### Theme 来源与跨 owner 默认

Chart Source 删除原 theme 名称、base 和 tokens 输入。Core Scene/Scope 的 theme.style/mode 是唯一环境选择入口；React/Vanilla 的宿主 theme 只表达同一 Core 契约，不再根据对象内容在 Chart 与 Core 之间猜测含义。局部主题使用已有 Core Scope 或 Chart panel 宿主，完整 Direct IR 不需要 Chart 专用选择器。

既有 ChartThemeDefinition、defineChartTheme 与 themeDefinitions 注入保留真实 Theme 身份。Definition 保存 name、可选 base、可选 defaults 与可选 plotDefaults：defaults 复用 IRChartDefaults；plotDefaults 复用 Plot 的公开 IRPlotDefaults。空 Definition 片段表示无覆盖。base 只在已有 Chart Definition registry 中组织生成来源，继续诊断未知名称和继承环，不进入作者 defaults。

Chart shell 的级联为：mode-aware Neutral → 有效 Core style 对应的 Chart Definition base 链 → chartDefaults → 实例 background/layout/presentation。省略有效 Core style 时只使用 Neutral；具名 style 缺少同名 Chart Definition 时明确失败。

Definition 的 plotDefaults 原样交给 Plot 的默认片段消费能力；其后 `plotExtension.plotDefaults` 覆盖，`plotExtension.plotRules` 使用 Plot 的独立规则契约，最终显式 Plot scale/guide/mark 配置优先。合并和校验由 Plot 公开能力负责，Chart 不复制 Plot vocabulary、palette、完整 resolution 或 resolver。Chart shell 默认不能成为 Plot 的字体默认，Plot 默认不能影响 Chart 标题。

### Recipe 部件存在性

当前 Point family 各 recipe 的 `recipe.guides` 是可省略的严格对象，只含 axis、grid、legend 三个可选 boolean。axis/legend 决定 recipe 是否生成相应默认 guides；grid 控制 recipe 生成的 Axis 的 grid。省略时保留既有 recipe 默认行为，包括 Strip 只为连续角色默认绘制 grid；显式 false 必须保留。该配置不删除 `plotExtension.guides` 显式替换的 guides。

这些开关不属于 chartDefaults 或 Theme Definition。当前 recipe Theme 只有这些开关，迁出后删除无消费者的 recipe Theme slice、默认映射和校验契约，不预建新的 recipe 默认层。recipe 的 encodings、properties、semantic mark 继承与 override 顺序保持既有契约；Theme 不增删 Axis、Legend、Mark 或 presentation 区域。

## 覆盖、失败语义与兼容性

style/layout 按独立字段覆盖，Node font 非空时整体替换，不继承前层 font 的其它子字段；区域文本内部的行级字体仍按 Core 原语义消费。background、paint、padding、gap、数组与判别联合保持其正式 Source 的覆盖粒度，不通用深合并。缺省、optional undefined 和空组无覆盖作用，合法 0、false、null 保留。

改变 Core theme 只重新生成 Theme 来源，不清除 chartDefaults 或显式 Plot defaults；Core defaults/reset 继续遵守已有绘图链路，Chart 不新增 Core Theme 预解析或领域状态注入能力。

错误字段、旧 token 输入、旧裸字符串 presentation Source 和非法结构由精确 Chart schema 在真实路径拒绝。Definition 的 owner 片段由对应 owner 校验，Chart registry 诊断继续保留来源路径和 cause；不得通过 renderer 默认或静默 Neutral fallback 掩盖缺失 Definition。

Direct IR、Vanilla 与 React 形成相同 Source。Vanilla 可继续用标题字符串或 TextBlock 作为 authoring 简写，归一为正式 `{text}` 区域；对象形式提供 style/layout。React presentation marker 保留字符串、Fragment 与 Core Text children，并支持同一 style/layout；根 presentation 使用正式区域对象，不接受平行持久化简写。

这是 alpha.1 breaking 迁移：删除 Chart Source theme、平铺 ChartThemeToken、recipe Theme slices 与旧 Plot token 转发；真实 Theme Definition 注入、active provider 边界、数据/identity/provenance/locator 和 renderer-neutral 输出保持不变。
