# ADR-05：Style preset、公开 tokens 与最终样式解析

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 rules](./03-cell-selector-and-rule-cascade.md) · [ADR-04 visual encoding](./04-conditional-visual-encoding-and-scale.md)

## 背景与目标

Table 的 Cell 表面、表头层级、基础表线与条件色阶 palette 需要统一默认。若 adapter、demo 或每张表分别硬编码，React/Vanilla 与 manual/detail/custom 会产生不同视觉基线。

Theme 不应成为第二套 Table grammar。内置样式只是有限 preset，用户自定义的是同一组稳定视觉 token 的取值，而不是新行为 provider。本 ADR采用接近 VS Code 的扁平、命名空间化 token key，使每个 key 成为可校验、可补全、可文档化的独立契约。

## 决策

### Style 与 mode

```ts
const TableStyle = {
  Neutral: 'neutral',
  Academic: 'academic',
  Vibrant: 'vibrant',
  Clean: 'clean',
} as const;

const TableThemeMode = {
  Light: 'light',
  Dark: 'dark',
} as const;

type IRTableSpec = {
  style?: TableStyleValue;
  themeMode?: TableThemeModeValue;
  styleTokens?: IRTableStyleTokens;
};
```

- `style` 省略等价 `neutral`
- `themeMode` 省略等价 `light`
- schema 不在 authoring IR 中物化默认；pipeline 解析完整 token map
- 不自动读取系统 dark mode、React Context、CSS variables 或 renderer state
- `styleTokens` 是当前 mode 下的 partial overlay，不是命名 theme ref

### 公开 token vocabulary

初始公开 token 只覆盖已有真实消费者：Cell appearance、Border Graph 与 visual scale palette。

```ts
type IRTableStyleTokens = {
  'cell.background.fill'?: IRPaintValue | null;
  'cell.background.fillOpacity'?: number | null;
  'cell.content.color'?: string | null;
  'cell.content.font.family'?: string | null;
  'cell.content.font.weight'?: IRFont['weight'] | null;

  'columnHeader.background.fill'?: IRPaintValue | null;
  'columnHeader.background.fillOpacity'?: number | null;
  'columnHeader.content.color'?: string | null;
  'columnHeader.content.font.family'?: string | null;
  'columnHeader.content.font.weight'?: IRFont['weight'] | null;

  'table.border.top'?: IRTableStyleBorderToken | null;
  'table.border.right'?: IRTableStyleBorderToken | null;
  'table.border.bottom'?: IRTableStyleBorderToken | null;
  'table.border.left'?: IRTableStyleBorderToken | null;
  'table.border.horizontal'?: IRTableStyleBorderToken | null;
  'table.border.vertical'?: IRTableStyleBorderToken | null;
  'columnHeader.border.bottom'?: IRTableStyleBorderToken | null;

  'data.categorical'?: Array<string>;
  'data.sequential'?: [string, string];
};
```

required full map 与 partial overlay 共享同一显式 19-key strict schema。未知 key fail-loud，并把 issue path 指向具体 key。每个 key 独立覆盖；scalar 直接替换，border、array 与 tuple 作为原子 token 整体替换，不 deep merge 或 concat。

Border token 精确复用 Table line border 但不允许 author 声明 conflict priority；非 null token 的运行时 priority 固定低于 explicit Table/Cell border。`null` 表示该 token 不产生 appearance leaf 或 border candidate。Categorical palette 非空且颜色唯一，sequential 固定两个端点。

新增 token 必须同时具备 schema、所有内置 light/dark 值、真实 resolver consumer、lineage、测试与文档；不得只预留空 key。

### 内置 presets

`BUILTIN_TABLE_STYLE_TOKENS[style][themeMode]` 的八份值都是完整、detached、递归冻结并通过 required schema 的 token maps。精确色值属于 preset 数据，可随审阅后的 preset 调整演进；以下视觉特征是长期语义：

#### `neutral`：默认、shadcn-inspired

- 中性灰阶表面，不使用品牌化彩色底
- body 使用高对比 primary text，header 使用 muted text 与 medium weight
- 保留细、低对比度的横向分隔，移除竖线和厚重外框
- categorical 颜色克制但可区分，sequential 使用单一色系浅深端点

它比 `clean` 保留更多层级与分隔，比 `vibrant` 更克制，比 `academic` 更接近现代产品界面而非出版物。

#### `academic`：LaTeX/booktabs-inspired

- 衬线内容、纸面式高对比文字
- 顶部/底部主规则线与 header 底部次规则线
- 不绘制左右外框、内部竖线或逐行横线
- palette 适合论文图表，避免霓虹式高亮

#### `vibrant`：Plotly-inspired

- light mode 通常具有浅蓝灰数据画布，dark mode 使用深蓝灰表面
- header 使用同色系层级与较强字重
- 横向和竖向分隔均可见，强调数据画布感
- categorical 高区分，sequential 使用鲜明色阶；dark 不依赖 renderer 自动反色

#### `clean`：最大程度移除非必要元素

- Cell/header appearance 与 border token 都不产生视觉贡献
- 未使用 encoding 时保持无装饰 Scene/bounds 语义
- light/dark 的结构视觉相同，palette 仍按 mode 为 encoding 提供颜色

不提供 striped preset；当前 selector 没有 parity/nth 语义，不能用预枚举 row indices 假装适用于动态数据。

### 外部主题包与自定义样式

外部主题包可导出自己的完整 light/dark `TableStyleTokenMap`，宿主按当前 mode 选择一份作为 `styleTokens` 输入：

```ts
export const companyTableTokens = {
  light: completeLightMap,
  dark: completeDarkMap,
} satisfies Record<TableThemeModeValue, TableStyleTokenMap>;
```

用户不能注册未知 token、preset 名或 token consumer。闭合 token map 没有算法 dispatch、options schema 或开放 discriminator，因此不采用 Definition/registry；内置 preset 与用户 overlay 经过同一 strict schema、leaf replacement、detached copy、freeze 和消费链路。

### Resolution 与优先级

```text
built-in preset[style][themeMode]
  < user styleTokens
  < Table layout borders / semantic Cell appearance
  < ordered visual encodings
  < ordered root rules
```

- body 消费 `cell.*`；column header 先取得对应 base slot，再由 `columnHeader.*` 替换，`null` 可明确清除 base contribution
- background fill 是结构 gate：最终 fill 为 null 时不创建 background；opacity 省略使用 ADR-02 默认值
- outer/horizontal/vertical/header-bottom border token 进入既有 Border Graph 的对应语义 slot，priority 低于 explicit border
- categorical/sequential token 只进入 ADR-04 scale context，不直接进入 renderer
- resolved map 为每个 key 记录 `preset` 或 `user` winner，appearance/border/manifest lineage 复用该来源
- formatter/presentation 不受 style token 或 encoding 影响
- encoding explicit range 覆盖 palette token fallback
- 所有 appearance 与 border 候选在 Presentation 和 Core measurement 前完成

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  style: 'academic',
  themeMode: 'dark',
  styleTokens: {
    'cell.content.color': '#f0f6fc',
    'columnHeader.content.font.weight': 700,
    'data.sequential': ['#fff7ed', '#c2410c'],
  },
  structure: detailStructure,
};
```

## 原子实施约束

ADR-05 与 ADR-04 是同一原子产品单元：palette token 和 visual scale context 必须同时形成真实消费链路。两篇 ADR 保持独立长期所有权，但实现、验证与交付不能只完成其中一侧。

## 兼容性与影响

- BREAKING：省略 style/mode 从 alpha.2 无装饰基线变为 `neutral/light`，Scene、visual bounds、border manifest 与截图可能变化
- 迁移：需要保留无装饰输出时显式写 `style: 'clean'`
- `TableSpec` additive 增加 style/mode/tokens；不增加 runtime theme registry
- manifest 必须保存完整 resolved token map、每个 token source 及 downstream winner lineage

## 功能与包边界

- Table 拥有 token vocabulary、preset、Cell/header/border/palette 映射与 precedence
- Core 提供 paint/color/font/style 基础契约
- Standard Legend 的内部 style tokens 不由 Table 定义
- adapters 只 author plain token data，不拥有 theme context 或 CSS mapping

## 测试策略摘要

- schema 证明 full/partial map、未知 key 精确诊断、原子替换和 JSON round-trip
- presets 证明四种风格、light/dark、完整 map、freeze 与稳定可见特征
- pipeline 证明 header clearing、border slots、palette fallback 与全局 precedence
- parity/migration 证明 manual/detail/custom、direct/React/Vanilla/SSR 与 neutral→clean 迁移

详细 case、精确 preset values、19-token consumer mapping、路径、命令与正式证据位于对应 ignored mirror plan 的 `PLAN.md` 和 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Presentation、Rules、Layout visual defaults
- **问题归属**：token key 与消费含 Table Cell/header/border 语义，属于 Table
- **内部闭环**：style/mode/overlay → resolved map → appearance/Border Graph/scale context → lineage
- **外部扩展**：外部包只能提供已知 token maps，经同一 schema/resolver 消费
- **define-registry 结论**：不适用，token 是闭合 plain-data values
- **结论**：扩展 Table Style Token 域，不建立 adapter theme、任意 token registry 或 renderer defaults

## 被否决方案

- 嵌套 token object：局部覆盖、对象替换与新增层级语义不稳定
- 任意字符串 token registry：失去严格校验、自动补全和具体 key 诊断
- Theme Definition：把闭合数据误建模成行为 provider，并与 rule/preset 重复
- adapter/CSS theme：破坏 JSON IR 与跨入口、SSR 等价性

## 不在本 ADR 范围

- 自动 dark mode、CSS variables、React Context 或宿主 theme sync
- hover/selected/active 等 runtime state token
- striped/nth、track size、gap、span、fit、overflow、padding token
- formatter/presentation defaults 或任意 selector rule
- 用户注册新 token、preset 名或 token consumer
- Standard Legend 内部 style tokens
