# Clean Plot Theme

本文把公共 [Clean Theme](../../../../../.agents/skills/theme-clean/SKILL.md) 映射到 `@retikz/plot` 拥有的视觉语义。只描述 Plot surface、typography、label、Axis、Legend 与 palette；Chart presentation、Table appearance、Core shared colors、adapter 和 docs shell 不在本文定义。

## 实现真源

- [`catalog.ts`](../../../plot/src/providers/theme/catalog.ts)：内置 Clean Light / Dark 的完整 token preset
- [`resolve.ts`](../../../plot/src/providers/theme/resolve.ts)：preset、shared colors 与显式覆盖的级联
- [`mapping.ts`](../../../plot/src/providers/theme/mapping.ts)：canonical token 与原生 `plotTheme` 的双向映射

本文规定视觉关系，具体数字与色值以当前 preset 和 schema 为准，避免 notes 与实现形成两份真源。

## Plot 视觉映射

| Plot 语义  | Clean 指导                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------ |
| Surface    | Light 与 Dark 默认保持透明平面，不为 Plot 增加卡片背景、阴影、渐变或材质                   |
| Typography | 使用编辑式无衬线 fallback；基础文字、label、axis title 与 legend 紧凑但可读                |
| Axis       | 默认关闭 axis line 和 tick mark，读数确有需要时允许显式恢复                                |
| Grid       | 只保留必要密度的细、低对比 grid，不能以 Clean 为由删除全部尺度参照                         |
| Legend     | title、label、swatch、symbol、ramp 与间距保持紧凑，仍满足辨认和交互尺寸                    |
| Palette    | categorical / series / sector 消费有效颜色；颜色角色清楚克制，不把 Mono 预设固化为唯一答案 |

当前内置 sequential / diverging 方向分别使用 `Cividis` 与 `RdBu`；它们是 Plot preset 选择，不属于公共 Clean skill。

## 边界与覆盖

- mark 颜色优先消费 effective palette，不在 mark、guide 或 lowering 中写 Clean 专属色值。
- 显式 `plotThemeTokens`、`colors` shorthand 与结构化 `plotTheme` 继续高于内置 Clean；不得为维持“简洁”删除用户设置。
- Plot 只维护自己的 surface、typography、label、Axis、Legend 和 palette，不修改 Chart canvas 或 docs shell。
- 实现不得通过 `ThemeStyle.Clean` 特判绕开 definition、registry、resolve 与 mapping 路径。

## 验收

- marks 和关键 label 先于 surface、grid、axis 与 legend 被注意到。
- axis、tick 和 grid 的删减没有破坏读数、比例、单位和分组。
- Light 与 Dark 都保持透明平面和一致层级，没有模式 paint 泄漏。
- 与同数据下的 Neutral、Academic、Vibrant 相比，Clean 平整、克制且仍完整可读。
