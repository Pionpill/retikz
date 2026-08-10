# Vibrant Plot Theme

本文把公共 [Vibrant Theme](../../../../../.agents/skills/theme-vibrant/SKILL.md) 映射到 `@retikz/plot` 拥有的视觉语义。只描述 Plot surface、typography、label、Axis、Legend 与 palette；Chart presentation、Table appearance、Core shared colors、adapter 和 docs shell 不在本文定义。

## 实现真源

- [`catalog.ts`](../../../plot/src/providers/theme/catalog.ts)：内置 Vibrant Light / Dark 的完整 token preset
- [`resolve.ts`](../../../plot/src/providers/theme/resolve.ts)：preset、shared colors 与显式覆盖的级联
- [`mapping.ts`](../../../plot/src/providers/theme/mapping.ts)：canonical token 与原生 `plotTheme` 的双向映射

本文规定视觉关系，具体数字与色值以当前 preset 和 schema 为准，避免 notes 与实现形成两份真源。

## Plot 视觉映射

| Plot 语义  | Vibrant 指导                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Surface    | Light 允许低色度 tinted plot surface；Dark 使用深 panel，二者都形成清楚的 plot 区域                          |
| Typography | 基础文字和 axis title 略大；legend title 可使用更强字重，次级 label 保持收敛                                 |
| Axis       | 默认可关闭 axis line 和 tick mark，避免与高信息量画面竞争                                                    |
| Grid       | 使用清晰、稳定的 grid 承担主要尺度参照，但不得与 marks 同权重                                                |
| Legend     | swatch、symbol、ramp 与项目间距略大，支持快速扫描多个系列                                                    |
| Palette    | categorical / series / sector 使用高区分度颜色；sequential 与 diverging 可更鲜明但必须保持数值顺序和中点语义 |

当前内置 sequential / diverging 方向分别使用 `Turbo` 与 `Spectral`；它们是 Plot preset 选择，不属于公共 Vibrant skill。

## 边界与覆盖

- 高色度集中于 marks 和有明确语义的强调；文字、axis、grid、legend 与 surface 使用受控色度。
- 内建 Plot preset 从 Core 注入 categorical / series / sector；Plot 只维护 sequential / diverging 与领域颜色角色。
- Plot style definition 显式提供的 palette 高于 Core baseline，之后仍可由 `plotThemeTokens` 与结构化 `plotTheme` 覆盖。
- 显式 `plotThemeTokens`、`colors` shorthand 与结构化 `plotTheme` 继续高于内置 Vibrant；不得按 mode 调色、重排、补全或替换用户颜色。
- Plot 不拥有 hover、selection 或 Chart presentation；Theme 不创造新的交互语义或 mark 渐变。
- mark、guide 与 lowering 消费解析后的有效主题，不增加 `ThemeStyle.Vibrant` 分支。

## 验收

- 第一注意力落在 marks，tinted surface、grid 和 legend 只建立清晰的屏幕层级。
- Light 与 Dark 保持系列索引和信息层级，没有浅色 surface、文字或 grid 泄漏。
- 少量与大量系列均可扫描，显式 palette 的原值、顺序和数量保持不变。
- 与同数据下的 Neutral、Academic、Clean 相比，Vibrant 鲜明但不过度装饰。
