# Vibrant Theme

`vibrant` 是 docs 维护的参考 style，表达面向屏幕、鲜明、具有展示张力的视觉语言。它通过高区分度数据颜色、更强内容层级和适度有色表面建立能量，但不等于提高所有元素的饱和度，也不允许装饰压过内容。

## 参考与使用边界

本风格参考 [Plotly.js](https://github.com/plotly/plotly.js) 默认视觉对浅色 panel、深蓝灰前景、鲜明 colorway 与 screen-first 层级的处理。

Plotly.js 采用 [MIT License](https://github.com/plotly/plotly.js/blob/master/LICENSE)。本文件 只抽象视觉原则，不复制其源码、默认 template、精确 colorway、token 色值、图表资产、交互实现或品牌元素；Retikz 的公开 Theme 契约与各 package owner 始终是实现真源。

## 公共视觉契约

| 维度     | Vibrant 默认语言                             | 避免                                     |
| -------- | -------------------------------------------- | ---------------------------------------- |
| 表面     | 允许浅色 tint 或深色 panel，形成清楚内容区域 | 渐变、发光、玻璃态、阴影堆叠和装饰纹理   |
| 前景     | 高对比文字与受控色度的辅助层级               | 让所有文字、边界和容器同时彩色化         |
| 排版     | 主要标题更强，次级内容清楚，间距略宽         | 所有文字同时加粗、彩色或放大             |
| 辅助结构 | 结构清楚但权重受控，快速支持屏幕扫描         | 同时强化所有参照、分隔和边框造成噪声     |
| 强调     | 高区分度颜色集中于内容与明确语义             | 荧光全覆盖、无语义渐变、仅靠颜色表达状态 |
| 动效     | 宿主支持时使用短促、明确的进入与反馈         | Theme 创造新交互语义、长循环或弹跳表演   |

Vibrant 比 Neutral 更鲜明、更强调表面与主要层级；比 Academic 更面向屏幕而非出版；比 Clean 保留更强颜色和展示张力。

## 颜色与 ThemeMode

- docs reference fallback 应高区分度、有节奏且避免相邻类别过近；不能复制参考项目 colorway 的精确色值作为唯一答案。
- 高色度优先用于内容和有明确语义的强调；文字、辅助结构与大面积表面使用受控色度。
- Light 可使用浅 tint、深前景和清楚分隔；Dark 使用深 panel、浅前景与适配后的辅助结构。两者保持类别索引和信息层级。

## 专项验证

- 处理 `@retikz/plot` 时，必须同时读取 [Vibrant Plot Theme](../../../../packages/viz/_notes/theme/plot/vibrant.md)。

验收时必须满足：第一注意力落在内容与主要标题；高色度没有扩散到所有辅助结构和容器；显式颜色的原值、顺序和数量不变；semantic colors 不被普通类别占用；Light / Dark 类别索引和信息层级一致；各 owner 只修改自己的视觉语义；Vibrant 与另外三种风格可辨认但不过度装饰。
