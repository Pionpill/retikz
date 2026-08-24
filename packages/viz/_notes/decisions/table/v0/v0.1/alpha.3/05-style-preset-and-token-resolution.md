# ADR-05：Table style preset 与 inherited token resolution

- 状态：Accepted
- 决策日期：2026-08-07
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 presentation](./02-presentation-context-and-cell-appearance.md) · [ADR-03 rules](./03-cell-selector-and-rule-cascade.md) · [ADR-04 visual encoding](./04-conditional-visual-encoding-and-scale.md) · [Core ADR-13：Theme Token Namespace Context 与共享颜色](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/13-theme-token-namespace-context.md) · [Table 表格可视化完备设计](../../../../../architecture/table-visualization-complete.md)
- Superseded in part by：[Core ADR-15：轻量 Theme IR 与可扩展 Style 解析](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/15-lightweight-theme-resolution.md) 已移除持久化 namespace bag、Theme token Definition / Contribution 与 Core token registry。本文保留 Table token owner、shared categorical projection、本地覆盖、级联和最终消费决策

## 背景与目标

Table 的 Cell、header、border 与 conditional encoding 需要稳定的视觉默认，但 Table 不应再维护一套独立的 style / mode environment。Core Theme 负责 Scene / Scope selector 继承、Core style registry、shared colors 与来源原子；Table 只负责自己的 token vocabulary、style definition、resolver、mapping 和消费。

早期提议把 `style`、`themeMode` 和 `styleTokens` 作为 IRTable 同级环境字段，导致 Table 与 Core Scope 之间出现两套 Theme 选择，也无法让同一 shared categorical array 同时服务 Table encoding、Plot palette 与 Core Inspector。本 ADR 冻结 Table 的迁移和 owner boundary。

## 决策：Table 投影 Core shared colors，保留领域解析

IRTable 删除重复的 `style` 与 `themeMode`，局部 sparse token 改名为 `tableThemeTokens`：

```ts
type IRTable = Readonly<{
  tableThemeTokens?: IRTableThemeTokenOverrides;
  // structure / presentation / rules / encoding
}>;
```

`tableThemeTokens` 是 Table strict、flat、dot-namespaced、JSON-safe vocabulary。它只覆盖 Table 已拥有的 Cell appearance、header、border 与 data encoding 语义，不注册未知 token、行为 provider 或 Table 外部 token。Table 不复制 Core shared colors schema，也不创建第二套 `ThemeMode`。

以下早期 Theme token Definition / Contribution 形态已被 Core ADR-15 supersede：

```ts
type TableThemeTokenDefinition = ThemeTokenDefinition<'table', IRTableThemeTokenOverrides>;

declare const defineTableThemeTokens: (
  tokens: IRTableThemeTokenOverrides,
) => ThemeTokenContribution<'table', IRTableThemeTokenOverrides>;
```

当前 Table 公开 owner-local style definition，并通过 Table registry 按 effective `style` 查找。Definition 只返回相对当前 mode 默认 preset 的稀疏 token 覆盖，不包含由 Core 投影的 `data.categorical`；runtime definition 显式返回 `undefined` 的 token 按省略处理，plain JSON 的 `tableThemeTokens` 仍严格拒绝该值。Table standalone / embedded adapter 与 direct headless 入口注入同义的 Table style definitions；plain JSON 只持久化 selector 与 `tableThemeTokens`，Core 不静态导入 Table 语义。

## 基础 token 与颜色主链

第一版 Table-owned token family 包括：

- Cell / column header 的 background、content color 与 font presentation
- Table border slots
- `data.categorical` 与 `data.sequential` 等 conditional encoding 输入

具体 canonical key 与 value contract 由 Table owner 维护，并必须有正式 appearance、Border Graph、encoding、Legend descriptor 或 manifest consumer。Table 不拥有 Plot `plot.palette.*`、Chart presentation token 或 Core semantic role。

`data.categorical` 的 baseline 从 Core shared `palette.categorical` detached 投影。它是 Table conditional encoding 的默认数组，不是 Table 复制出来的第二个全局 active palette；Core 全仓只有一套当前生效的非空 active categorical array。Table-owned token 与 encoding 的显式 `range` 具有更高优先级，rule / Cell configuration 按 Table 正式 precedence 覆盖该 baseline。`data.sequential` 与连续映射仍属于 Table visual encoding contract，不读取 Plot named scheme 或 interpolator。

## 行为、默认值、失败语义与兼容性

未声明 Theme 时使用 Core 匿名 light effective environment，Table 使用对应的 mode 默认 preset。IRTable 不保存 style / mode identity，省略 `tableThemeTokens` 表示不添加局部 Table override，不产生第二份环境默认。

Table 在当前 Core effective Theme 上按以下顺序解析：

```text
Table mode-aware 默认 preset
  < Table style 稀疏覆盖
  < shared categorical projection
  < local tableThemeTokens
  < ordered rules / visual encodings
  < explicit Cell / border configuration
```

Theme token、IRTable 与 encoding input 必须是 plain JSON-safe data。unknown key、缺失同名 style definition、非法 value、空 categorical / palette、无法 mapping 的 token 或未消费 token 都 fail-loud，并指向输入层与 token path。不得静默退回 renderer 默认、Plot palette 或旧字段。

这是 `0.x` 的破坏性迁移：`style` 与 `themeMode` 从 IRTable 删除，`styleTokens` 改为 `tableThemeTokens`，不保留 alias、双读或静默 bridge。React 局部 `theme` 等价于在 Table 外建立一层 Core Scope Theme；plain JSON 使用外层 `IRScope.theme` 表达同一局部作用域；Vanilla、React、SSR、standalone 与 embedded 使用同一 selector IR、Table style registry、cascade 和诊断语义。

Table inspection 与 manifest 复用 Core `ThemeTokenSource`：默认 preset、style 稀疏覆盖与 `tableThemeTokens` 为 `local`；Table resolver 将 Core `ResolvedTheme.colors.categorical` 投影为 Table-owned `data.categorical`，来源为 `inherit`，path 为 `$theme/colors/categorical`。`kind` 不编码 preset 或具体输入优先级；未被 style 覆盖的 token 使用 `$default/...`，显式 style token 使用 `$style/...`，再与 `$theme/colors/categorical`、`$spec/tableThemeTokens/...` 等稳定 path 共同保留可诊断的 winning entry。

## 功能与包边界

- 所属能力域与解决的问题：Tabular Visualization Complete 的 Presentation、Rules、Visual Encoding 与 shared color projection
- `@retikz/table` 拥有 Table token vocabulary、内置 Neutral × 两种 mode 的 preset、开放 style definition / registry、resolver、Cell / header / border / encoding mapping、Legend descriptor 与 inspection
- `@retikz/core` 拥有 selector 继承、Core style registry、shared colors、`ThemeTokenSource` 与 `InspectionAppearanceContext`
- `@retikz/data` 拥有数据、字段与通用 transform；Table 不把数据算法提升为 Theme token
- `@retikz/standard` 拥有通用 Legend / 外围布局与 `InspectionAppearanceContext` consumer；不读取 Table token
- `@retikz/plot` 拥有 Plot palette、scale、guide 与 named schemes；Table 不读取 Plot 或 Chart token / resolver
- table-react、table-vanilla 与 plain JSON 只提供等价 authoring、runtime definition 注入与宿主接入；Render 只执行物化 Scene

Table 不拥有 Core Theme 传播协议、Plot / Chart vocabulary、Plot categorical / sequential scheme、宿主 CSS theme 或 renderer-specific style。Table 的 `data.categorical` 只能是 shared active categorical 的一次性 projection，并由 Table resolver 再按 Table contract 消费。

## 最终结果

最终实现已闭合 Table owner style definition、resolver 与 shared categorical projection，并把有效 token 正式消费到 Cell / header appearance、Border Graph、visual encoding、Legend descriptor、manifest 与 inspection。IRTable 只保留 `tableThemeTokens` 局部覆盖，Core Theme 继续作为 style / mode selector 与 shared colors 的唯一环境真源。

## 长期边界

- Table 完整 canonical key 目录、具体 preset 色值、结构 / rule / encoding 算法与布局 solver
- Core shared color preset 的具体色值、Plot / Chart token vocabulary 与 named scheme
- Standard Legend 内部 token、宿主 CSS theme、自动 dark mode 与远程主题加载
- Table interaction state、编辑、虚拟滚动 runtime、公式、异步数据与 dashboard coordination
