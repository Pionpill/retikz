# ADR-05：Theme Definition 与最终样式解析

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 rules](./03-cell-selector-and-rule-cascade.md) · [ADR-04 visual encoding](./04-conditional-visual-encoding-and-scale.md)

## 背景

Table 的 header/body 外观、基础表线与条件色阶 palette 需要一个可复用默认入口。若 adapter、demo 或每张表分别硬编码，会让 React / Vanilla、manual / detail 与 custom structure 产生不同视觉基线。

Theme 不能成为第二套 Table grammar。它只提供 JSON-safe appearance、低优先级 style rules、表线 defaults 与 visual scale palettes；不能改变数据、structure、span、track sizing、formatter、presentation name 或 runtime state。

Table 总设计已将 Theme 列为 Definition / registry 能力。内置与 custom theme 必须通过同一 resolver，TableSpec 只保存 theme name 与 JSON-safe overrides，不依赖全局 context、CSS variables 或 import side effects。

## 决策：命名 Theme Definition + JSON-safe overrides，采用显式级联

### Theme schema

```ts
type IRTableStyleRule = {
  selector: IRTableCellSelector;
  appearance: IRTableCellAppearance;
};

type IRTableTheme = {
  appearance?: IRTableCellAppearance;
  rules?: Array<IRTableStyleRule>;
  borders?: IRTableBorders;
  colors?: {
    categorical?: Array<string>;
    sequential?: [string, string];
  };
};

type IRTableThemeRef = {
  name: string;
  overrides?: IRTableTheme;
};
```

`IRTableStyleRule` 只允许 appearance，不允许 formatter、presentation 或 encoding；rule 至少包含一个非空 appearance 字段。Theme colors 使用 Core CSS color schema，categorical 非空且颜色唯一，sequential 固定两个端点。

Table root 增加 `theme?: IRTableThemeRef`。省略时等价 `{ name: 'plain' }`；schema 不物化该默认，pipeline resolve 后输出完整 `ResolvedTableTheme`。

### Theme Definition / registry

```ts
type TableThemeDefinition = Readonly<{
  name: string;
  theme: IRTableTheme;
}>;

const defineTableTheme = (definition: TableThemeDefinition): TableThemeDefinition => definition;
```

`resolveTableThemeRegistry(custom?)` 先注册 built-ins，再注册 custom；空名称、重复 custom 或覆盖 built-in 均 fail-loud。Definition theme 与 ref overrides 都经过同一个 `TableThemeSchema` guard、detached copy 与 recursive freeze。

Runtime contribution 与 `LowerTablesOptions` 增加 `themeDefinitions`，按 name / object identity 采用与 structure / formatter / presentation / visual scale 相同的多 Table 合并与冲突诊断。

### 内置 themes

#### `plain`

`plain` 保持 alpha.2 的可见默认：

- empty appearance 与 style rules
- 不增加 outer / horizontal / vertical borders
- categorical colors：
  `#2563eb`、`#dc2626`、`#059669`、`#d97706`、`#7c3aed`、`#0891b2`、`#db2777`、`#4b5563`
- sequential colors：`#eff6ff` → `#1d4ed8`

因此未使用 alpha.3 theme / rules / encodings 的既有 Table 不发生 Scene 变化。

#### `grid`

`grid` 提供常见静态明细表外观：

- outer / horizontal / vertical 使用 `#d1d5db`、width `1`、priority `-100`
- columnHeader appearance：background `#f3f4f6`，Node text weight `600`
- body 不设背景
- palette 与 `plain` 相同

负 border priority 保证 Cell explicit border 或 root rule 默认 priority `0` 可以覆盖 theme default；最终冲突仍由 alpha.2 Border Graph 处理。

不提供 striped theme。当前 selector 没有 parity / nth 语义，不能用预枚举 rowIndices 假装适用于动态数据。

### Theme merge

Definition theme 与 ref overrides 的合并规则：

- appearance 使用 ADR-03 的 field-level merge
- rules 按 `definition.rules` 后接 `overrides.rules`，保留声明顺序
- borders 按 mode / outer / horizontal / vertical 字段 last-specified-wins
- categorical / sequential palette 各自以完整数组 / tuple last-specified-wins，不拼接
- merge 后再次通过 `TableThemeSchema` 并 recursive freeze

### 全 pipeline precedence

最终 precedence 固定为：

```text
plain fallback tokens
  < selected Theme Definition
  < TableSpec.theme.overrides
  < theme appearance + theme style rules (ordered)
  < TableSpec.layout.borders / semantic Cell layout.borders
  < visual encodings (ordered, owned channel only)
  < root rules (ordered)
```

更精确地：

- formatter / presentation：structure / explicit Cell base < root rules；theme 与 encoding 不参与
- Table-wide borders：theme borders < `TableSpec.layout.borders`
- per-Cell borders：theme appearance/rules < semantic Cell `layout.borders` < root rule appearance
- background / content style：theme appearance/rules < visual encoding channel < root rule appearance
- scale range：explicit encoding options < resolved theme palette；这里“explicit 优先”是 fallback 关系，不受上述 style cascade 反转

所有 merge 在 presentation / Core probe 前完成。adapter、renderer 与 docs demo 不得再补隐式 theme defaults。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  theme: {
    name: 'grid',
    overrides: {
      colors: {
        sequential: ['#fff7ed', '#c2410c'],
      },
      rules: [
        {
          selector: { fields: ['revenue'] },
          appearance: {
            content: { nodeDefault: { font: { weight: 600 } } },
          },
        },
      ],
    },
  },
  structure: detailStructure,
};
```

## 测试设计

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-05.md`。长期摘要：

- theme ref / schema / registry / contribution 合并与 JSON round-trip
- plain Scene 向后兼容，grid 的 header / borders / palette 可观察
- definition / overrides / explicit layout / encoding / root rules precedence
- theme 不修改 formatter / presentation / data / topology / track
- manual/detail/custom 与 React/Vanilla 共用同一 resolved theme

## 影响

- `TableSpecSchema` 增加 theme ref
- 新增 theme schema、Definition / registry、resolver 与 `LowerTablesOptions.themeDefinitions`
- Border Graph 输入增加 theme table-wide / per-Cell candidates，但算法不变
- visual scale resolve context 从 resolved theme 取得 palettes
- docs 可展示 plain / grid 与 custom theme

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Presentation、Rules、Layout visual defaults
- **解决的问题**：统一 Table 家族的 appearance、border defaults 与 visual scale palette
- **主责包与协作包**：Table 拥有 theme tokens / mapping；Core 提供 style/color；adapters 不拥有 defaults
- **是否可由现有能力组合**：appearance/rules/borders 可组合，但缺少可持久化命名 theme 与统一 precedence，需要扩展当前域
- **是否需要下沉**：不下沉 Core/Standard；theme 含 Table location/selector/border 语义
- **内部表达链路**：theme ref → registry → definition + overrides → resolved theme → appearance/rules/borders/palette
- **外部扩展链路**：builtin/custom theme 同一 define/registry/resolve；custom 只提供 JSON-safe theme
- **下游执行 / adapter 等价性**：resolved theme 进入同一 Table pipeline；renderer 只看到 Core IR
- **不支持边界与诊断**：不接收函数、CSS/DOM、runtime state、formatter 或 topology；unknown/duplicate theme fail-loud
- **本轮结论**：扩展 Table Theme 域，复用既有 rule/appearance/border/scale，不建立 adapter theme

## 不在本 ADR 范围

- dark mode 自动选择、CSS variables、React Context 或宿主 theme sync
- striped / nth selector、hover / selected / disabled state
- track size、gap、span、fit、overflow、formatter / presentation defaults
- Standard Legend 内部 theme；Table 只在 ADR-06 映射 descriptor style

---

## 实现契约

### Level

`red`：新增 TableSpec schema、Theme Definition / registry，并改变 style / border / scale resolution。

### Schema 改动

| 文件                      | 操作 | 字段名                     | 类型                    | 默认值         | describe 中文摘要              |
| ------------------------- | ---- | -------------------------- | ----------------------- | -------------- | ------------------------------ |
| `schemas/theme/schema.ts` | 新增 | `appearance`               | Cell appearance?        | empty          | theme base appearance          |
| 同上                      | 新增 | `rules`                    | style-rule array?       | `[]` runtime   | ordered theme appearance rules |
| 同上                      | 新增 | `borders`                  | Table borders?          | none           | table-wide border defaults     |
| 同上                      | 新增 | `colors`                   | categorical/sequential? | plain palettes | encoding palette               |
| 同上                      | 新增 | theme ref `name/overrides` | name + theme?           | plain          | registered theme selection     |
| `schemas/table/schema.ts` | 新增 | `theme`                    | theme ref?              | plain runtime  | Table theme                    |

### 文件 scope

- `packages/viz/table/src/schemas/{theme,table}/**`
- `packages/viz/table/src/contract/theme/**`
- `packages/viz/table/src/providers/theme/**`
- `packages/viz/table/src/pipeline/{theme,rule,encoding,layout,presentation,contribution}/**`
- `packages/viz/table/src/{schemas,contract,providers,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,theme,rule,encoding,layout,presentation,pipeline,public-api}/**`
- adapters 的 theme definitions / authoring / parity tests
- alpha.3 对应 docs 文件（ADR-07）

### 测试象限

**Happy path**

- plain 保持旧 Core IR / Scene；grid 产生 header background 与低优先级网格线
- custom theme 通过同一 registry 解析
- overrides 按字段合并 appearance/borders，并替换 palette

**边界**

- empty rules / empty appearance、显式 none background/border
- palette 最小长度、sequential 两端相同颜色
- theme border priority 与 explicit Cell priority tie / override 仍遵守 Border Graph

**错误路径**

- unknown/duplicate/builtin-conflict theme、empty name fail-loud
- theme 含 formatter/presentation/layout track/function/unknown field 被拒绝
- empty/duplicate/invalid palette color 与空 style rule 被 schema 拒绝

**交互**

- theme < explicit layout/cell border < encoding < root rule precedence
- explicit scale range 覆盖 theme palette fallback
- custom theme definitions 在多 Table runtime contribution 中按 identity 合并
- manual/detail/custom 与 React/Vanilla 对同一 theme 得到等价 output

### 依赖的现有元素

- ADR-02 appearance
- ADR-03 selector / style merge
- ADR-04 visual scale resolve context
- alpha.2 Table borders / Border Graph
- Table runtime contribution merge
