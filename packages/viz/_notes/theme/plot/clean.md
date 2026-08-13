# Clean Plot Theme

本文把公共 [Clean Theme](../../../../../.agents/skills/theme-clean/SKILL.md) 映射到 `@retikz/plot` 拥有的视觉语义。只描述 Plot surface、typography、label、Axis、Legend 与 palette；Chart presentation、Table appearance、Core shared colors、adapter 和 docs shell 不在本文定义。

## 实现真源

- [`presets/plot.ts`](../../../../../apps/docs/src/modules/docs/components/component-preview/theme/presets/plot.ts)：docs 参考 Clean Light / Dark 的完整 token definition
- [`resolve.ts`](../../../plot/src/providers/theme/resolve.ts)：preset、shared colors 与显式覆盖的级联
- [`mapping.ts`](../../../plot/src/providers/theme/mapping.ts)：canonical token 与原生 `plotTheme` 的双向映射

本文规定视觉关系，具体数字与色值以当前 preset 和 schema 为准，避免 notes 与实现形成两份真源。

## Plot 视觉映射

| Plot 语义  | Clean 指导                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- |
| Surface    | Light 与 Dark 默认保持透明平面，不为 Plot 增加卡片背景、阴影、渐变或材质                      |
| Typography | 使用编辑式无衬线 fallback；基础文字、label、显式重新开启的 axis title 与 legend 紧凑但可读    |
| Axis       | 默认隐藏 axis title；只绘制 x Axis line，关闭 x / y tick mark 与 y Axis line，保留 tick label |
| Grid       | 只保留 y Axis 的细、低对比 grid，不能以 Clean 为由删除全部尺度参照                            |
| Legend     | title、label、swatch、symbol、ramp 与间距保持紧凑，仍满足辨认和交互尺寸                       |
| Palette    | categorical / series / sector 默认映射 Core effective palette；不在 Plot 复制 Clean 分类色值  |

当前 docs reference sequential / diverging 方向分别使用 `Cividis` 与 `RdBu`；它们是宿主 Plot definition 的选择，不属于公共 Clean skill。

## 边界与覆盖

- mark 颜色优先消费 effective palette，不在 mark、guide 或 lowering 中写 Clean 专属色值。
- 内建 Plot preset 从 Core 注入 categorical / series / sector；Plot 只维护 sequential / diverging 与领域颜色角色。
- Plot style definition 显式提供的 palette 高于 Core baseline，之后仍可由 `plotThemeTokens` 与结构化 `plotTheme` 覆盖。
- 显式 `plotThemeTokens`、`colors` shorthand 与结构化 `plotTheme` 继续高于 docs Clean definition；不得为维持“简洁”删除用户设置。
- `axis.title.enabled` 的 Clean 基础值为 `false`；全局 token、dimension rule 或结构化 `plotTheme.axis.title` 可以重新开启，Axis guide 的 title 继续只负责内容与局部样式。
- Plot 只维护自己的 surface、typography、label、Axis、Legend 和 palette，不修改 Chart canvas 或 docs shell。
- 实现不得通过 `style === 'clean'` 特判绕开 definition、registry、resolve 与 mapping 路径。

## 验收

- marks 和关键 label 先于 surface、grid、axis 与 legend 被注意到。
- 默认 palette 的长度、索引与 Hue 顺序和 Core effective palette 一致。
- x Axis line、y grid 与 tick label 足以支撑读数；默认省略 axis title 和其它 axis line / tick mark 没有破坏比例、单位和分组，显式重新开启仍按正常样式渲染。
- Light 与 Dark 都保持透明平面和一致层级，没有模式 paint 泄漏。
- 与同数据下的 Neutral、Academic、Vibrant 相比，Clean 平整、克制且仍完整可读。
