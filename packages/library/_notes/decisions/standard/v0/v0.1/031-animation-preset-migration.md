---
description: Core 保留动画机制、基础预设与通用工具，Extension 承接生长、强调和循环效果预设；共享 IRAnimationTrack，迁移只改变公开导入归属。
keywords: 动画、animation、preset、Core、Extension、grow、pulse、blink、wiggle
---

# ADR-031：动画基础预设与 Extension 效果预设分层

- 状态：Accepted
- 决策日期：2026-09-20
- 关联：[Standard v0.1 roadmap](./roadmap.md) · [Extension 与 Standard 包边界 ADR-032](./032-extension-package-boundary.md) · [最小内置集合 ADR-023](./023-core-minimal-builtins-and-standard-provider-entrypoints.md) · [Standard 拓展库设计](../../../../architecture/standard-library-design.md) · [Core 动画预设 ADR-021](../../../../../../kernel/_notes/decisions/v0/v0.3/021-animation-presets.md) · [Core Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景与目标

动画预设是生成 `IRAnimationTrack` 的纯函数。淡入、缩放、闪烁和摆动都通过相同的关键帧与时序数据表达，不拥有独立播放机制。所有效果都留在 Core，会让底层包的公开目录随效果丰富度持续增长；全部迁出，又会使基础动画作者必须为最常见的变化引入 Extension。

沿用 Node Shape、Arrow 的“基础内置集合＋可选官方扩展”原则：Core 保留完整动画数据契约、编译机制和少量基础预设，Extension 提供跨领域可复用的效果目录。时钟、插值和 SVG / Canvas 播放仍由 Render 拥有，不随预设迁移。

## 决策：按基础变化与效果组合冻结预设归属

Core 基础预设覆盖透明度、缩放、位移和描边展示，通用工具提供显式起止值过渡及轨道编排。特定节奏、循环强调和基础变化的便捷组合归 Extension。常用程度用于选择基础集合，但不构成持续扩张 Core 的唯一理由。

| 归属               | 公开函数                                                      | 职责                               |
| ------------------ | ------------------------------------------------------------- | ---------------------------------- |
| Core 基础预设      | `fadeIn`、`scaleIn`、`slideIn`、`drawOn`                      | 常见的透明度、缩放、位移和描边入场 |
| Core 通用过渡      | `colorShift`、`cameraTo`                                      | 显式指定颜色或镜头的起止值         |
| Core 编排工具      | `loop`、`stagger`                                             | 包装现有轨道的循环、方向和延迟     |
| Extension 效果预设 | `grow`、`growUp`、`pulse`、`spin`、`flash`、`blink`、`wiggle` | 生长、循环及状态强调效果           |

未来新增效果默认进入 Extension；只有补足基础变化类型且适合作为 Core 稳定基线时，才通过新的决策调整 Core 集合。`growUp` 虽适合柱形生长，也能用于普通图元的定向缩放，不引入 Plot 的数据或基线语义。

Extension 预设直接生成公开 Core 轨道，不建立新的 Definition、名称 registry、provider 装配或 preset discriminator。作者自定义预设同样是返回轨道的函数。只有新增属性或插值能力时才进入相应底层扩展契约，不能通过预设私造另一条执行路径。

## 基础数据结构与公开契约

不新增 IR 或运行时状态。两层预设继续返回 `IRAnimationTrack`，输出只包含 JSON-safe 的属性、关键帧、时序与触发配置，不保存工厂名称、包来源、函数或播放句柄。

Extension 从根入口提供迁入函数及专属选项类型，不新增动画子路径；Core 不反向依赖 Extension：

```ts
import { fadeIn, loop } from '@retikz/core';
import { pulse, wiggle } from '@retikz/extension';

const entrance = fadeIn();
const emphasis = pulse({ peak: 1.15 });
const repeatedWiggle = loop(wiggle({ angle: 8 }), { iterations: 2 });
```

共享 `AnimationPresetOptions` 继续归 Core，保持 duration、delay、easing、trigger 的现有契约。`ScaleInOptions`、`SlideInOptions`、`ColorShiftOptions`、`CameraToOptions`、`LoopOptions` 留在 Core；`GrowUpOptions`、`PulseOptions`、`SpinOptions`、`FlashOptions`、`BlinkOptions`、`WiggleOptions` 随对应函数迁入 Extension。`grow` 继续接受 `Omit<ScaleInOptions, 'from'>`，不另建同义类型；Extension 不转导出 Core 类型或保留项。

React、Vanilla 和直接 IR 作者均从同一个 owner 导入纯工厂，把结果交给已有 `animations` 字段。无需新增 Extension adapter 组件或构造器，也不从 React / Vanilla 包兼容转发迁出的函数。

## 行为与默认值

迁入预设保持现有参数、关键帧、可选字段省略方式和默认值，迁移不顺带统一时长或改变效果。

| 预设     | 属性与关键帧                                                            | 默认时序与专属参数                                          |
| -------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| `grow`   | scale 0 → 1                                                             | 等价于 `scaleIn({ from: 0 })`；400ms、ease-out，透传 origin |
| `growUp` | scaleY 0 → 1                                                            | 500ms、ease-out，origin 为 bottom                           |
| `pulse`  | scale 1 → peak → 1，位置为 0 / 0.5 / 1                                  | 1000ms、ease-in-out，peak 为 1.1，无限循环                  |
| `spin`   | rotate 0 → 360                                                          | 1000ms、linear，无限循环                                    |
| `flash`  | opacity 1 → dim → 1，位置为 0 / 0.5 / 1                                 | 300ms、ease-in-out，dim 为 0，默认 2 次                     |
| `blink`  | opacity 1 → dim → 1，位置为 0 / 0.5 / 1                                 | 800ms、ease-in-out，dim 为 0，默认无限循环                  |
| `wiggle` | rotate 0 → angle → −angle → angle → 0，位置为 0 / 0.25 / 0.5 / 0.75 / 1 | 400ms、ease-in-out，angle 为 5 度，默认 3 次                |

公共参数覆盖预设默认值；未提供 delay、trigger 时继续省略字段。除 `growUp` 默认 bottom 外，可选 origin 未提供时继续省略，由既有变换契约决定支点。没有显式循环次数的单次预设继续由轨道默认值决定次数。fill、direction 等未写入的字段仍消费 Core / Render 的既有默认语义。

`loop`、`stagger` 对 Core 与 Extension 轨道一视同仁；`stagger` 继续以编排后的 delay 覆盖轨道原有 delay。预设迁入 Extension 不改善或改变动画目标分组、可见触发、系统减少动态效果、静态截帧、后端属性支持等既有行为。

## 失败语义与兼容性

这是公开导入路径的 breaking change。迁出函数及专属选项类型从 Core 公共面删除，调用方显式依赖 Extension 并更新导入；不保留弃用别名、旧入口 re-export、自动注册、自动加载或 fallback。Extension 与 kernel 继续独立版本管理，消费方使用契约兼容的版本组合。

已经保存的轨道 JSON 不包含预设名称，因此无需改写，也不需要为播放这些 JSON 安装 Extension。相同有效参数产生相同轨道数据，之后的编译、动画求值与 renderer 消费继续走原有入口。

工厂不新增参数解析或异常分支；外部 JSON 仍在现有 schema 入口校验。动画目标不匹配、后端不支持的属性与触发限制继续由原 owner 诊断，Extension 不吞掉告警或提供替代渲染。

本决策接受后，取代 Core ADR-021 中关于上述迁出项归 Core 及 adapter 可转导出的归属结论；保留其纯工厂、手写轨道等价和跨入口共享原则，不替代动画 IR 或播放机制决策。

## 文档归属

Kernel 动画文档继续解释轨道、基础预设、通用编排和播放机制，其 API 参考只列 Kernel 拥有的入口。Extension 文档拥有迁入效果的用法、选项与 API 参考，明确安装依赖和纯工厂接入方式。跨包示例可以组合两层预设，但必须使用真实 owner 导入，并链接对应参考；不得在两边复制同一套预设 API 声明。
