---
name: theme-contract
description: Use when designing, implementing, reviewing, or documenting shared Retikz theme contracts across ThemeStyle, especially categorical palette structure, hue order, ThemeMode consistency, or explicit palette overrides.
---

# Theme Contract

为所有 Retikz `ThemeStyle` 提供公共且与具体包无关的主题设计契约。具体主题 skill 在此契约之上定义自己的视觉语言，具体包的 `_notes/theme` 负责记录包内 token 映射与实现细节。

## Categorical Hue Contract

内建 categorical palette 固定为 16 项，按 `8 × 2` 组织：

- 前 8 项使用不同色相，承担主要类别区分
- 后 8 项继续使用不同色相，补充前 8 项尚未覆盖的色相空间，承担次要类别区分
- 16 项共享固定索引语义；不同 `ThemeStyle` 不得重排 Hue

| 索引 | Hue | 分组 |
| ---: | --: | ---- |
|    1 | 210 | 主要 |
|    2 |  30 | 主要 |
|    3 | 150 | 主要 |
|    4 | 330 | 主要 |
|    5 | 190 | 主要 |
|    6 |  10 | 主要 |
|    7 |  50 | 主要 |
|    8 | 270 | 主要 |
|    9 | 100 | 次要 |
|   10 | 240 | 次要 |
|   11 | 300 | 次要 |
|   12 | 350 | 次要 |
|   13 |  75 | 次要 |
|   14 | 125 | 次要 |
|   15 | 170 | 次要 |
|   16 | 225 | 次要 |

所有内建 `ThemeStyle` 与 Light/Dark `ThemeMode` 必须保持相同的 palette 长度、索引语义和 Hue 顺序。Core 按 `hsl(H, S%, L%)` 生成默认 categorical palette：Hue 来自公共序列，每个 style / mode 分别维护与其一一对应的 16 项 S/L vector。

- 不用单一固定 S/L 覆盖全部 Hue。不同 Hue 对同一 S/L 的感知亮度与色度不等，黄色、青色和紫色需要独立补偿。
- 主次分组只表达索引使用顺序，不额外改变 S/L；每一项最终色调由对应 style / mode 的 vector 决定。
- Light / Dark 保持 Hue 与索引不变，只调整 S/L 以适配表面和前景对比，不把 Dark 简化为机械反色。
- 风格差异不能牺牲分类辨识：前八项必须在真实图元尺寸、常用透明度及 Light / Dark 表面上保持区分，不能只凭 swatch 判断。
- 相邻分类不明显时先扩大逐 Hue 明度节奏，再最小幅调整饱和度；不要退回全局固定 S/L。
- 具体 S/L 数值由 Core provider 维护；主题 skill 规定风格意图与参考边界，领域 package 不复制 shared palette 数值。

| ThemeStyle | Categorical tone 参考方向                                    |
| ---------- | ------------------------------------------------------------ |
| Neutral    | D3 Category10 与 Flint default 的均衡、通用分布              |
| Academic   | Flint nature 的出版型区分度与明度节奏                        |
| Vibrant    | Flint Power BI Light 与 D3 Tableau10 的高区分度屏幕配色      |
| Clean      | Lieflat Charts Palm 的低色度彩色倾向，并吸收 Wire 的克制层级 |

黑、白、灰属于中性色，不占用 categorical palette 的色相槽位。

## Boundaries

- 本契约只约束 categorical palette，不约束 semantic、sequential 或 diverging colors
- 用户显式传入的 palette 保持原始顺序和值，不重排、不调色、不补全
- Core 是内建 shared categorical palette 的单一真源，维护 Hue、Saturation、Lightness 与最终解析颜色
- 领域包默认只把 Core effective categorical palette 映射到本包视觉角色，不复制内建 categorical 色值
- 领域 style definition 可以显式提供本包 palette；它高于 Core baseline，之后仍可被本包 token 或结构化 theme 覆盖
- 具体包的 token 映射、领域 palette 角色、sequential / diverging 选择与覆盖顺序记录在对应包的 `_notes/theme` 中
