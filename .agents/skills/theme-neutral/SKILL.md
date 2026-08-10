---
name: theme-neutral
description: Use when designing, implementing, reviewing, or documenting Retikz ThemeStyle.Neutral in any package, especially when distinguishing the reliable default visual language from Clean, Academic, or Vibrant while preserving package ownership and explicit overrides.
---

# Neutral Theme

`ThemeStyle.Neutral` 是 Retikz 可靠、熟悉、低意见化的默认视觉语言。它提供完整且适中的阅读参照，不主动营造论文、编辑排版或展示型氛围，也不等于无色、无边界或删减后的 Clean。

## 参考与使用边界

本风格参考 [Vega](https://github.com/vega/vega) 默认视觉对透明宿主、系统字体、稳定层级与通用颜色方案的处理。

Vega 采用 [BSD 3-Clause License](https://github.com/vega/vega/blob/main/LICENSE)。本 skill 只抽象视觉原则，不复制其源码、默认配置、scheme 色值、模板、资源或交互实现；Retikz 的公开 Theme 契约与各 package owner 始终是实现真源。

## 公共视觉契约

| 维度     | Neutral 默认语言                       | 避免                                          |
| -------- | -------------------------------------- | --------------------------------------------- |
| 表面     | 兼容宿主的透明或纯中性色表面，层级直接 | 装饰性卡片、阴影、材质、品牌化底色            |
| 前景     | 中性、高可读的主次明度关系             | 纯黑压迫感或多个同权重强调色                  |
| 排版     | 熟悉的系统字体，字号、字重与密度适中   | 论文式排版、夸张标题、极端紧凑或松散          |
| 辅助结构 | 保留理解内容所需的常规参照与分隔       | 像 Clean 一样系统性删减，或让辅助元素压过内容 |
| 强调     | 颜色可辨但不抢占界面，状态反馈功能优先 | 高饱和全覆盖、发光、立体高光、无语义渐变      |
| 动效     | 宿主支持时采用短促、功能性的反馈       | 装饰性循环、弹跳或主题专属交互语义            |

Neutral 比 Clean 保留更完整的常规结构；比 Academic 更少论文与打印惯例；比 Vibrant 更少高饱和色和展示型层级。

## 颜色与 ThemeMode

- `ResolvedThemeColors` 与 owner 的显式颜色配置继续决定最终颜色；Neutral 不覆盖高优先级输入。
- Neutral 规定“均衡、通用、可区分”的颜色角色，不要求灰阶，也不复制参考项目的精确色值。
- semantic colors 只表达成功、警告和错误，不作为装饰色。
- Light 使用透明或近白表面与深前景；Dark 使用深中性表面与浅前景。两者保持相同信息层级和数据语义。
- 切换 mode 必须同步调整所有受影响的 paint role，不得只替换宿主背景。

## Package 所有权

- 本 skill 只定义跨包视觉意图，不维护 package token、preset 数值或局部组件规则。
- Core 拥有 `ThemeStyle.Neutral`、Theme 继承、registry 与 shared semantic / categorical colors。
- 每个领域 package 只把公共意图映射到自己拥有的 token；不得复制其它 owner 的 preset 或建立主题特判。
- adapter 与 docs 只传递标准 selector 和显式覆盖，不创建平行 Theme 实现。
- 处理 `@retikz/plot` 时，必须同时读取 [Neutral Plot Theme](../../../packages/viz/_notes/theme/plot/neutral.md)。

## 实施与验收

1. 先确认视觉语义的 owner，再读取该 package 的主题指导、preset 与测试。
2. 从当前 Neutral Light / Dark 建立基线，并与 Clean、Academic、Vibrant 使用相同内容比较。
3. 检查默认颜色、显式颜色、Light / Dark 和继承 / 局部覆盖，不用主题改变数据、几何或交互语义。
4. 运行受影响 owner 的类型与定向测试，并在真实宿主尺寸下检查视觉结果。

验收时必须满足：内容先于辅助结构被注意；没有无语义装饰；显式颜色与 token 优先级不变；Light / Dark 信息层级一致；各 owner 只修改自己拥有的视觉语义；Neutral 与另外三种风格可辨认。

若实现必须改变公开 Theme、IR、schema、registry 或跨包能力边界，停止局部调色，按仓库架构流程重新设计。
