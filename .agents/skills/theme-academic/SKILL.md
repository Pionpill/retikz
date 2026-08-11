---
name: theme-academic
description: Use when designing, implementing, reviewing, or documenting Retikz Academic reference theme in any host or package, especially for publication-oriented hierarchy, compact information density, print legibility, monochrome resilience, package ownership, or explicit color overrides.
---

# Academic Theme

`academic` 是 docs 维护的参考 style，表达严谨、紧凑、适合论文与技术报告的出版型视觉语言。它重视精确阅读、稳定排版、有限数据墨水和脱离屏幕后仍可辨认的结构，但不等于把任意内容强制变成 LaTeX 或某个期刊模板。

## 参考与使用边界

本风格参考 [SciencePlots](https://github.com/garrettj403/SciencePlots) 的 `science` 与 `ieee` styles 对紧凑画幅、出版型字体、有限装饰和黑白印刷辨识的处理。

SciencePlots 采用 [MIT License](https://github.com/garrettj403/SciencePlots/blob/master/LICENSE)。本 skill 只抽象视觉原则，不复制其 mplstyle、色值、字体配置、LaTeX preamble、期刊尺寸、模板、资源或导出参数；Retikz 的公开 Theme 契约与各 package owner 始终是实现真源。

## 公共视觉契约

| 维度     | Academic 默认语言                                   | 避免                                 |
| -------- | --------------------------------------------------- | ------------------------------------ |
| 表面     | Light 接近纸面，Dark 是结构等价的屏幕适配           | 卡片、阴影、材质、展示型彩色表面     |
| 前景     | 接近墨色的主前景和克制的次级明度                    | 多个同权重强调色或仅靠微弱色相区分   |
| 排版     | 出版型字体、紧凑字号和明确层级；必须有可用 fallback | 强制 Times、LaTeX 或外部字体依赖     |
| 辅助结构 | 参照清楚、线条稳定，支持精确阅读和缩放              | 删除必要参照，或让密集结构与内容竞争 |
| 强调     | 优先使用字重、线型、形状、位置与有限颜色            | 仅依赖透明度、屏幕发光或高饱和色     |
| 密度     | 在可读前提下提高信息密度和版面利用率                | 为“论文感”把文字和符号缩到不可读     |

Academic 比 Neutral 更紧凑、更强调出版层级；比 Clean 保留更多精确阅读结构；比 Vibrant 更少彩色表面和高饱和强调。

## 颜色与 ThemeMode

- `ResolvedThemeColors` 与 owner 的显式颜色配置继续决定最终颜色；Academic 不重排、调色或替换显式输入。
- docs reference fallback 应克制、可区分，并在灰度下尽量保留明度差；不能把参考项目的 color cycle 固化为唯一答案。
- 颜色不足以支持黑白辨识时，复用对应 owner 已有的线型、形状或直接标注能力，不在 Theme 中创造数据编码。
- semantic colors 只表达成功、警告和错误。
- Light 使用纸白与深墨关系；Dark 使用深中性表面与浅前景，并保持相同结构。Dark 是屏幕适配，不模拟黑纸印刷。

## Package 所有权

- 本 skill 只定义跨包视觉意图，不维护 package token、preset 数值、导出 DPI、期刊栏宽或局部组件规则。
- Core 拥有开放 style selector、Theme 继承、registry 与内置 Neutral；docs 通过公开 definition 维护 Academic 的 shared semantic / categorical colors。
- 每个领域 package 只把公共意图映射到自己拥有的 token；不得复制其它 owner 的 preset 或建立主题特判。
- adapter 只传递标准 selector 和 definitions；docs 通过各 owner 的公开 definition / registry 组合参考实现，不创建跨 owner registry。
- 处理 `@retikz/plot` 时，必须同时读取 [Academic Plot Theme](../../../packages/viz/_notes/theme/plot/academic.md)。

## 实施与验收

1. 先确认视觉语义的 owner，再读取该 package 的主题指导、preset 与测试。
2. 从当前 Academic Light / Dark 建立基线，并与 Neutral、Clean、Vibrant 使用相同内容比较。
3. 检查默认颜色、显式颜色、彩色 / 灰度、Light / Dark 和缩放结果，不用主题改变数据编码。
4. 运行受影响 owner 的类型与定向测试，并在真实宿主尺寸下检查视觉结果。

验收时必须满足：内容层级可精确阅读；数据墨水强于辅助结构；缩放或灰度下仍可辨认；不强制外部字体、LaTeX、DPI 或期刊模板；显式颜色与 token 优先级不变；Light / Dark 结构一致；各 owner 只修改自己的视觉语义；Academic 与另外三种风格可辨认。

若实现必须改变公开 Theme、IR、schema、registry 或跨包能力边界，停止局部调色，按仓库架构流程重新设计。
