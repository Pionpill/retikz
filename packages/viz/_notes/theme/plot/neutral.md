# Neutral Plot Theme

本文把公共 [Neutral Theme](../../../../../.agents/skills/theme-neutral/SKILL.md) 映射到 `@retikz/plot` 拥有的视觉语义。只描述 Plot surface、typography、label、Axis、Legend 与 palette；Chart presentation、Table appearance、Core shared colors、adapter 和 docs shell 不在本文定义。

## 实现真源

- [`catalog.ts`](../../../plot/src/providers/theme/catalog.ts)：内置 Neutral Light / Dark 的完整 token preset
- [`resolve.ts`](../../../plot/src/providers/theme/resolve.ts)：preset、shared colors 与显式覆盖的级联
- [`mapping.ts`](../../../plot/src/providers/theme/mapping.ts)：canonical token 与原生 `plotTheme` 的双向映射

本文规定视觉关系，具体数字与色值以当前 preset 和 schema 为准，避免 notes 与实现形成两份真源。

## Plot 视觉映射

| Plot 语义  | Neutral 指导                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Surface    | Light 优先透明或纯中性表面以兼容宿主；Dark 使用深中性表面，不增加卡片或阴影                         |
| Typography | 使用熟悉的系统无衬线 fallback；基础文字、label、axis title 与 legend 保持常规尺寸和有限层级         |
| Axis       | 默认保留 axis line 与 line tick，提供完整、熟悉的尺度参照                                           |
| Grid       | 使用低对比、细线和必要密度；Dark 同步提高可见性但不压过 marks                                       |
| Legend     | title、label、swatch、symbol 与间距采用均衡默认值，不刻意压缩或放大                                 |
| Palette    | categorical / series / sector 消费有效颜色；sequential 使用通用感知均匀方案，diverging 保持明确中点 |

## 边界与覆盖

- Plot 只拥有 `PlotThemeToken` 和原生 `plotTheme` 中的 Plot 视觉，不重定义 `ResolvedThemeColors`。
- 内建 Plot preset 从 Core 注入 categorical / series / sector；Plot 只维护 sequential / diverging 与领域颜色角色。
- Plot style definition 显式提供的 palette 高于 Core baseline，之后仍可由 `plotThemeTokens` 与结构化 `plotTheme` 覆盖。
- 显式 `plotThemeTokens`、`colors` shorthand 与结构化 `plotTheme` 继续高于内置 Neutral；不得重排或二次处理用户颜色。
- mark、guide 与 lowering 消费解析后的有效主题，不增加 `ThemeStyle.Neutral` 分支或硬编码专属色值。
- Chart 转发 Plot 输入时不得复制 Neutral preset；adapter 与 docs 只负责接线。

## 验收

- axis、tick、label 和必要 grid 足以读数，marks 仍是第一视觉层级。
- Light 与 Dark 的 surface、文字、grid、axis 和 legend 同步适配，没有模式泄漏。
- 默认颜色、自定义颜色和显式 token 的来源顺序可追踪且结果稳定。
- 与同数据下的 Academic、Vibrant、Clean 相比，Neutral 呈现均衡、熟悉且低意见化。
