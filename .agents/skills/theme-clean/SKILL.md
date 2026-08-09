---
name: theme-clean
description: Use when designing, implementing, reviewing, or documenting Retikz ThemeStyle.Clean across Core, Plot, Chart, Table, adapters, or ComponentPreview. Defines the Clean visual contract for flat surfaces, restrained typography, quiet guides, color independence, light/dark behavior, package ownership, and visual acceptance.
---

# Clean Theme

`ThemeStyle.Clean` 表达扁平、克制、以内容为中心的编辑式视觉语言。它不是简单地删除所有线条或缩小所有尺寸，而是降低容器与辅助元素的存在感，让数据、标题和关键标注成为稳定的第一层级。

## 参考与使用边界

本风格参考 [Lieflat Charts](https://github.com/larashero3-dotcom/lieflat-charts) 对纸面感、墨色层级、实心图形、编辑式排版与克制动效的处理。

参考仓库采用 [PolyForm Noncommercial License 1.0.0](https://github.com/larashero3-dotcom/lieflat-charts/blob/main/LICENSE)。本 skill 只抽象可复用的视觉原则，不复制其模板、catalog、源码、token 色值、图型工作流或资源；Retikz 的公开 Theme 契约、owner 边界与现有 token 结构始终是实现真源。

## 核心视觉契约

| 维度   | Clean 默认语言                                       | 避免                                              |
| ------ | ---------------------------------------------------- | ------------------------------------------------- |
| 表面   | 单一、平整的画布层；通过留白和层级组织内容           | 阴影、发光、玻璃态、装饰性渐变、无语义卡片嵌套    |
| 前景   | 接近墨色的主前景和有限的中间明度层级                 | 大面积纯黑压迫感、多个同权重强调色                |
| 图形   | 实心、轮廓清楚、几何简单；透明度只承担数据或状态语义 | 材质效果、立体高光、装饰噪声、无语义透明叠加      |
| 排版   | 无衬线字体优先；标题明确，正文与标签紧凑但可读       | 全部文字同权重、为了留白把标签缩到难以阅读        |
| 辅助线 | 只保留读数或分组真正需要的轴线、刻度和网格           | 默认展示完整边框、密集刻度、比数据更醒目的网格    |
| 强调   | 由字重、位置、明度或一个明确语义色建立主次           | 每个系列都使用高饱和强调、重复编码同一结论        |
| 动效   | 宿主支持时使用快速、平稳的进入与状态过渡             | 弹跳、长时间循环、装饰性运动、忽略 reduced motion |

Clean 必须在去掉阴影、渐变和装饰后仍然完整可读。减少视觉家具不能以丢失比例、单位、类别、交互反馈或数据语义为代价。

## 颜色与 ThemeMode

Clean 规定颜色的角色关系，不垄断具体颜色数组。

- `ResolvedThemeColors.categorical`、显式 Plot palette 或上层颜色配置继续决定数据系列颜色；Clean 不覆盖这些高优先级输入。
- 未提供显式 palette 时，内置 fallback 应保持清楚、克制和可区分，不把参考项目的 Mono 或彩色预设硬编码为唯一答案。
- semantic colors 继续表达成功、警告和错误，不把它们当普通装饰色使用。
- Light 使用近纸面表面与深前景；Dark 使用深墨表面与浅前景。两者保持同一信息层级，只调整对比关系，不改变数据语义。
- Dark 下不得遗留 Light 画布、网格或标签色；Light 下也不得依靠只在深色背景可见的边界。
- 去掉色相后，标题、数据、辅助线和弱化内容仍应通过明度、字重、线型与位置区分。

## Owner 映射

只在拥有对应视觉语义的 owner 中实现 Clean，不在 adapter 或 docs 复制 preset。

### Core

- 保持 `ThemeStyle.Clean`、Theme 继承、registry 与 shared colors 的公共入口不变。
- Core 只拥有跨领域 semantic / categorical colors；不下沉 Plot、Chart 或 Table 的局部视觉 token。
- 自定义 Theme style 与内置 Clean 继续走同一 definition、registry 和 resolve 路径。

### Plot

- Plot surface 保持平整；轴线和 tick 默认弱化或关闭，但读数需要时允许保留。
- 网格使用低对比、细线和必要密度；不能用“Clean”作为删除所有尺度参照的理由。
- label、axis title 与 legend 建立有限字号层级，图例符号紧凑但保持可点击与可辨认尺寸。
- mark 颜色优先消费 effective palette，不在 mark 或 lowering 中写 Clean 专属色值。

### Chart

- Chart canvas、padding、gap 和 presentation typography 形成一个连续编辑画面，不额外制造卡片层。
- 标题最强，副标题与 caption 次之，note / source / credit 最弱；层级主要来自字号、字重和明度。
- Chart 只决定自身 canvas 与 presentation；Plot 的 axis、legend、mark 视觉仍由 Plot owner 解析。

### Table

- 表格优先用留白、对齐和字重组织内容；外框、竖线与大面积 header fill 默认不出现。
- 需要分隔时使用少量低对比横线或 header bottom，不同时恢复所有边界。
- 数据编码颜色继续来自 Table 的 effective colors，不能因 Clean preset 丢失可视编码。

### Docs 与 adapter

- `ComponentPreview`、React 和 Vanilla adapter 只传递标准 Theme selector 与显式覆盖，不创建 docs-only Clean 分支。
- 保持现有优先级：全局主题默认最低，单个 ComponentPreview 覆盖其上，demo 或 spec 的显式 Theme / token 最高。
- 预览外壳的站点背景、边框和工具栏不是图表 Theme token；不要为了模拟 Clean 修改无关 docs shell。

## 实施流程

1. 确认改动属于 Core、Plot、Chart、Table、adapter 还是 docs，读取对应 owner 与 layer skill。
2. 从当前 `ThemeStyle.Clean` preset 和测试建立 Light / Dark 基线，区分结构 token、paint token 与显式用户覆盖。
3. 把视觉意图映射到 owner token；不要在 pipeline、adapter 或 demo 中增加主题特判。
4. 同时检查 Neutral、Academic、Vibrant，确保 Clean 的差异可观察且没有改变其它 style。
5. 用相同数据比较 Light / Dark、默认 palette / 自定义 palette，并检查全局与单预览覆盖优先级。
6. 先做受影响 owner 的类型与定向测试，再在 docs 的真实 ComponentPreview 尺寸下检查视觉结果。

## 验收清单

- 画布和图形没有无语义阴影、渐变、发光或材质效果。
- 数据和标题先于容器、网格、轴线、来源等辅助内容被注意到。
- 轴、刻度、网格或边界的删减没有破坏读数、比例与分组。
- 自定义 categorical palette 和显式 token 仍高于 Clean 默认值。
- Light / Dark 的信息层级一致，Dark 没有浅色画布泄漏。
- Plot、Chart、Table 各自只修改自己拥有的 token，adapter 与 docs 没有复制 preset。
- Neutral、Academic、Vibrant 不受影响，Clean 的差异在快照或定向断言中可观察。
- ComponentPreview 在常见宽度下标签可读、留白平衡，工具栏与预览外壳未被主题实现污染。

若实现为了满足上述规则必须改变公开 Theme、IR、schema、registry 或跨包能力边界，停止局部调色，按仓库架构流程重新设计。
