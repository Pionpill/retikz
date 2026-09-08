# ADR-07：Table Source 默认片段

- 状态：Proposed
- 决策日期：2026-09-06
- 主责：Table，目标版本 0.1.0-alpha.3
- 关联：[alpha.3 roadmap](./roadmap.md) · [Table style preset 与 token resolution](./05-style-preset-and-token-resolution.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Core 默认协议](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.4/05-theme-source-fragments.md)

## 背景与目标

Table 以 `tableThemeTokens` 持久化扁平键值，并由 style definition 生成同一种 token map。它与 Table 已有的 Cell appearance、layout border 和 visual encoding Source 片段脱节；token 既重复字段层级，也让默认值成为独立的、不可直接写入实例的词汇。

本决策将 Table 的可主题化默认值收敛为正式 Source 中可显式写入的稀疏片段。Core 继续只选择 style/mode 并提供 shared categorical colors；Table 继续拥有 Cell appearance、border 和 visual scale 的领域解析。

## 决策与公开契约

### Table 实例与默认片段

Table 根新增三个可选正式 Source 片段：

```json
{
  "appearanceDefaults": {
    "body": {
      "background": { "fill": "#ffffff" },
      "content": {
        "style": { "color": "#18181b" },
        "defaults": { "node": { "style": { "font": { "family": "sans-serif" } } } }
      }
    },
    "columnHeader": {
      "content": { "defaults": { "node": { "style": { "font": { "weight": 500 } } } } },
      "borders": { "bottom": { "kind": "line", "stroke": "#e4e4e7" } }
    }
  },
  "layout": { "borders": { "outer": { "top": { "kind": "line" } }, "horizontal": { "kind": "line" } } },
  "visualDefaults": { "sequential": ["#eff6ff", "#1d4ed8"] }
}
```

`appearanceDefaults` 按现有 `body` 与 `columnHeader` Cell location 复用稀疏 `TableCellAppearance` 层级：background 只允许 fill/fillOpacity，content 只允许可作为 Scope 默认的 style 字段，borders 复用物理 side 的 Table Border。它不创建 Cell、header、rule 或 content；只有相应 Cell 已由 structure 生成时才参与其 appearance cascade。

`layout.borders` 保留当前 layout 的边界语义，但 `outer` 成为 top/right/bottom/left 的稀疏物理 side 片段，使每一侧与 Cell border 使用同一结构。horizontal 与 vertical 继续是单一边界候选。layout 的 track、gap 与尺寸不属于本次默认面。

`visualDefaults` 只包含 Table 内置 visual scale 的 categorical 与 sequential palette。它不生成 encoding、Legend 或 scale；仅在已有 encoding 使用未显式指定 range 的内置 scale 时提供范围默认。显式 encoding range 继续最高优先。categorical palette 默认从 Core effective categorical colors 投影；sequential 的 mode-aware Table baseline 仍由 Table 提供。

`tableDefaults` 是以上三个正式 Source 片段的稀疏子集：`appearanceDefaults`、`layout.borders`、`visualDefaults`。它不得含 data、id、structure、rules、encodings、layout track/gap 或 Cell content。空片段不创建 Cell、border、encoding、Legend 或其它语义对象。

### Theme 来源与优先级

Table Source 不新增主题名称、base 或 token 输入。Core Scene/Scope 的 effective style/mode 是唯一环境选择。现有 `TableThemeStyleDefinition` 和注入 registry 保留为生成来源，但其输出改为 `TableDefaults`；同名 style 的缺失、重复和 resolver 失败保持明确诊断。本轮不为 Table style Definition 新增 base 继承，Core style 已选择唯一的生效定义。

Table defaults 的顺序为：mode-aware Table baseline → effective Core style 对应的 Table Definition → Source `tableDefaults` → 显式 Source `appearanceDefaults`、`layout.borders`、`visualDefaults` → Cell rule 与 encoding 的既有显式覆盖。Rule 的 selector 和 encoding 的数据映射不进入默认片段；inline Cell appearance、Cell rule、显式 border 与显式 scale range 维持当前更高优先级。

默认采用对应 Source 片段的覆盖粒度：background、border variant、palette 数组整体替换；content style 的 color 与非空 font 复用 Scope 语义；合法 `false`、`0`、`null` 保留。Style definition base chain 只组织生成来源，不进入 Table Source。

### Manifest、adapter 与兼容性

Manifest 和 Cell appearance trace 记录最终默认片段的稳定 Source path：baseline、style definition、`tableDefaults` 或实例正式片段；不再记录 dot-token key。Table 的已有 manifest、border provenance、visual scale 和 Legend descriptor 继续消费同一 resolved defaults，不保留平行 token map。

Vanilla authoring 接收与 Direct IR 同名的正式片段，并只归一为 `IRTable`。React 复用 Vanilla 输入和 Core Scope theme；两者不提供 token bag、theme context parser 或私有 palette mapper。

这是 alpha.3 breaking 迁移：删除 `tableThemeTokens`、`TableThemeToken`、flat token schema/preset/inspection 及其旧 manifest paths；不保留 alias、双读、fallback 或迁移桥。Table structure、formatter、presentation、rule、visual encoding、layout solver、Core style/mode 和 shared categorical identity 不改变。
