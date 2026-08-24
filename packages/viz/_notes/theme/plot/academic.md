# Academic Plot Theme

本文把公共 [Academic Theme](../../../../../.agents/skills/theme-academic/SKILL.md) 映射到 `@retikz/plot` 拥有的视觉语义。只描述 Plot surface、typography、label、Axis、Legend 与 palette；Chart presentation、Table appearance、Core shared colors、adapter 和 docs shell 不在本文定义。

## 实现真源

- [`presets/plot.ts`](../../../../../apps/docs/src/modules/docs/components/component-preview/theme/presets/plot.ts)：docs 参考 Academic Light / Dark 的稀疏 token definition，其余值来自 mode 默认 preset
- [`resolve.ts`](../../../plot/src/resolve/theme/resolve.ts)：preset、shared colors 与显式覆盖的级联
- [`mapping.ts`](../../../plot/src/resolve/theme/mapping.ts)：canonical token 与原生 `plotTheme` 的双向映射

本文规定视觉关系，具体数字与色值以当前 preset 和 schema 为准，避免 notes 与实现形成两份真源。

## Plot 视觉映射

| Plot 语义  | Academic 指导                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Surface    | Light 使用纸面式纯色表面；Dark 使用结构等价的深中性表面，不模拟黑纸或彩色 panel                       |
| Typography | 使用有可靠 fallback 的出版型字体；基础文字与 label 紧凑，axis title 和 legend title 保持清楚层级      |
| Axis       | 保留明确 axis line 和较短 line tick，优先支持精确读数与窄图幅                                         |
| Grid       | 使用细、低对比的参考线；能通过 axis 与 tick 读数时不强化 grid                                         |
| Legend     | title、label、swatch、symbol 和间距紧凑但可辨，无装饰容器                                             |
| Palette    | categorical / series / sector 消费有效颜色；sequential 优先灰度韧性较好的方案，diverging 保持稳定中点 |

当前 docs reference sequential / diverging 方向分别使用 `Cividis` 与 `RdBu`；它们是宿主 Plot definition 的选择，不属于公共 Academic skill。

## 边界与覆盖

- Plot 不拥有 LaTeX、期刊栏宽、导出 DPI 或字体资源，只维护 renderer-neutral Plot token。
- 内建 Plot preset 从 Core 注入 categorical / series / sector；Plot 只维护 sequential / diverging 与领域颜色角色。
- Plot style definition 显式提供的 palette 高于 Core baseline，之后仍可由 `plotThemeTokens` 与结构化 `plotTheme` 覆盖。
- 显式 `plotThemeTokens`、`colors` shorthand 与结构化 `plotTheme` 继续高于 docs Academic definition；不得调色、重排或替换用户输入。
- 颜色不足以支持灰度辨识时，复用 mark / encoding 已有线型、形状或标注能力，不在 Theme 中创造新编码。
- mark、guide 与 lowering 消费解析后的有效主题，不增加 `style === 'academic'` 分支。

## 验收

- axis title、tick label、单位、legend 和连续色带在常规与窄图幅下可精确阅读。
- marks 的数据墨水强于 grid、axis 和容器，缩放或灰度下仍可辨认。
- Light 与 Dark 保持相同结构和系列索引，没有外部字体或 LaTeX 依赖。
- 与同数据下的 Neutral、Vibrant、Clean 相比，Academic 更紧凑、严谨并具有出版感。
