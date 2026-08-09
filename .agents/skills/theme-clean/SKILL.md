---
name: theme-clean
description: Use when designing, implementing, reviewing, or documenting Retikz ThemeStyle.Clean in any package, especially for flat surfaces, restrained typography, quiet supporting structure, color independence, light/dark behavior, package ownership, or explicit overrides.
---

# Clean Theme

`ThemeStyle.Clean` 表达扁平、克制、以内容为中心的编辑式视觉语言。它不是简单地删除所有线条或缩小所有尺寸，而是降低容器与辅助元素的存在感，让内容、标题和关键标注成为稳定的第一层级。

## 参考与使用边界

本风格参考 [Lieflat Charts](https://github.com/larashero3-dotcom/lieflat-charts) 对纸面感、墨色层级、实心图形、编辑式排版与克制动效的处理。

参考仓库采用 [PolyForm Noncommercial License 1.0.0](https://github.com/larashero3-dotcom/lieflat-charts/blob/main/LICENSE)。本 skill 只抽象可复用的视觉原则，不复制其模板、catalog、源码、token 色值、图型工作流或资源；Retikz 的公开 Theme 契约与各 package owner 始终是实现真源。

## 公共视觉契约

| 维度     | Clean 默认语言                                       | 避免                                               |
| -------- | ---------------------------------------------------- | -------------------------------------------------- |
| 表面     | 单一、平整的内容层；通过留白和层级组织信息           | 阴影、发光、玻璃态、装饰性渐变、无语义卡片嵌套     |
| 前景     | 接近墨色的主前景和有限的中间明度层级                 | 大面积纯黑压迫感、多个同权重强调色                 |
| 图形     | 实心、轮廓清楚、几何简单；透明度只承担数据或状态语义 | 材质效果、立体高光、装饰噪声、无语义透明叠加       |
| 排版     | 无衬线字体优先；标题明确，其它文字紧凑但可读         | 全部文字同权重、为了留白缩到难以阅读               |
| 辅助结构 | 只保留理解内容真正需要的参照、分隔和边界             | 默认展示完整边框、密集结构或比内容更醒目的辅助元素 |
| 强调     | 由字重、位置、明度或一个明确语义色建立主次           | 每个类别都使用高饱和强调、重复编码同一结论         |
| 动效     | 宿主支持时使用快速、平稳的进入与状态过渡             | 弹跳、长循环、装饰性运动、忽略 reduced motion      |

Clean 必须在去掉阴影、渐变和装饰后仍然完整可读。减少视觉家具不能以丢失比例、单位、类别、交互反馈或数据语义为代价。

## 颜色与 ThemeMode

- `ResolvedThemeColors` 与 owner 的显式颜色配置继续决定最终颜色；Clean 不覆盖高优先级输入。
- 内置 fallback 应清楚、克制和可区分，不把参考项目的 Mono 或彩色预设硬编码为唯一答案。
- semantic colors 只表达成功、警告和错误，不作为普通装饰色使用。
- Light 使用近纸面表面与深前景；Dark 使用深墨表面与浅前景。两者保持同一信息层级，不改变数据语义。
- 去掉色相后，主要内容、辅助结构和弱化内容仍应通过明度、字重、线型与位置区分。

## Package 所有权

- 本 skill 只定义跨包视觉意图，不维护 package token、preset 数值或局部组件规则。
- Core 拥有 `ThemeStyle.Clean`、Theme 继承、registry 与 shared semantic / categorical colors。
- 每个领域 package 只把公共意图映射到自己拥有的 token；不得复制其它 owner 的 preset 或建立主题特判。
- adapter 与 docs 只传递标准 selector 和显式覆盖，不创建平行 Theme 实现。
- 处理 `@retikz/plot` 时，必须同时读取 [Clean Plot Theme](../../../packages/viz/_notes/theme/plot/clean.md)。

## 实施与验收

1. 先确认视觉语义的 owner，再读取该 package 的主题指导、preset 与测试。
2. 从当前 Clean Light / Dark 建立基线，并与 Neutral、Academic、Vibrant 使用相同内容比较。
3. 检查默认颜色、显式颜色、Light / Dark 和继承 / 局部覆盖，不用主题改变数据、几何或交互语义。
4. 运行受影响 owner 的类型与定向测试，并在真实宿主尺寸下检查视觉结果。

验收时必须满足：内容先于容器和辅助结构被注意；没有无语义阴影、渐变、发光或材质；删减没有破坏阅读与分组；显式颜色与 token 优先级不变；Light / Dark 信息层级一致；各 owner 只修改自己的视觉语义；Clean 与另外三种风格可辨认。

若实现必须改变公开 Theme、IR、schema、registry 或跨包能力边界，停止局部调色，按仓库架构流程重新设计。
