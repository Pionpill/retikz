# 画板交互控件与状态持久化讨论记录

> **状态：长期方向讨论记录，未冻结公开契约、包名或实现范围。** 本文讨论画板内 Button、Tabs、Select 等控件的适用边界，以及交互和动画状态如何保存。现有事件水合与动画触发能力不等于完整的 Headless Interaction。
>
> 关联：[`交互与增量运行时设计`](./interaction-design.md) · [`性能与增量运行时设计`](./performance-design.md) · [`包职能设计`](./package-responsibility-design.md) · [`Editor 编辑运行时架构设计`](./editor-design.md) · [`Core 绘图完备设计`](../../packages/kernel/_notes/architecture/core-drawing-complete.md) · [`Standard 标准库设计`](../../packages/library/_notes/architecture/standard-library-design.md)

---

## 1. 问题与边界

画板中的图形可以承担按钮、选项和导航的职责，但画出控件外观与提供完整控件行为是两个不同问题。前者主要复用图形、布局、组合和主题；后者还涉及命中、焦点、键盘、状态、无障碍、弹层及表单。

Retikz 适合提供可跨 SVG / Canvas、React / Vanilla 使用的画板交互底座，并在上层组合绘图原生控件。完整 Web 控件所需的输入法、文本编辑、表单和浏览器无障碍能力，应允许宿主 DOM 参与，不要求 Canvas 独自重建。静态绘图、SSR 和导出仍应能从持久化内容生成确定的稳定画面。

本文不把 UI 组件家族并入 Kernel，也不预先决定新包。是否形成独立的控件能力域，需要由多个真实消费场景、行为契约和跨后端闭环验证；单纯的图形外观可以复用现有 Standard、Layout 与 Core 公开能力。

## 2. 现有基础与能力缺口

当前已有 Composite 与布局能力、空间句柄、稳定 identity / ownership / transaction 基础、Scene 图元 id，以及 SVG / Canvas 的点击和指针事件水合。动画 Source IR 可保存 JSON-safe 的关键帧、时长和 `load`、`visible`、`manual`、`{ onEvent }` 触发器；播放时钟与控制句柄留在运行时。Canvas 当前按图形路径命中，文字本身不作为独立路径命中。

这些能力可支持“图形被点击后由宿主执行动作”，但尚未形成统一的语义 target、键盘与焦点、behavior、presentation 和 intent 闭环。现有 `{ onEvent: 'click' }` 面向动画所属图元的运行时事件；按钮 A 触发图形 B 的动画仍需要跨 target 路由，不能视为已有声明式能力。

| 控件或行为                    | 相对难度 | 主要缺口                                                      |
| ----------------------------- | -------- | ------------------------------------------------------------- |
| 热点、可点击标签、简单 Button | 低到中   | 语义 target、禁用、按压反馈、键盘激活与焦点                   |
| Checkbox、Switch、单选项      | 中       | 状态所有权、受控值、键盘规则与无障碍状态                      |
| Tabs、分段选择器              | 中       | 焦点与选中项分离、方向键、内容区关系                          |
| Slider、范围刷选              | 中到高   | 指针捕获、连续预览、取消、键盘步进与提交                      |
| Tooltip、Popover、菜单        | 高       | 层叠、锚点、视口避让、关闭规则与焦点恢复                      |
| Select、Combobox、文本输入    | 很高     | 选项导航、输入法、滚动、表单与屏幕阅读器；宜允许 DOM 宿主参与 |

难度以完整可用的行为衡量，不以外观绘制难度衡量。SVG 与 Canvas 应共享语义；若宿主无能力提供键盘或无障碍映射，应明确 capability 差异，不静默宣称等价。

## 3. 长期能力归属

- Core 继续拥有后端中立的图形、组合与可追踪的语义 target / hit area / provenance 契约，不拥有 Button、Tabs、Select 的状态机。
- Runtime 与 Kernel Interaction 负责归一化输入、identity / ownership 路由、瞬时 presentation、intent 与 transaction 协调；具体领域状态仍由领域 owner 拥有。
- Render 负责可见内容、命中、动画和表现更新；呈现、命中与事件 target 必须使用一致的状态。Render 不解释业务动作。
- React / Vanilla 负责宿主接线；浏览器焦点、无障碍树、原生输入和弹层可由 DOM 宿主桥提供，不写入 Core IR 或 renderer 私有语义。
- 上层控件能力组合已有图形与布局，拥有控件的行为和视觉变体。仅当去除领域词汇后仍可复用且不需要独立纵向运行模型时，才评估是否适合 Standard；完整控件体系的归属另行判断。
- Editor 的选择、工具、命令和历史服务作者编辑画板；消费态按钮、图例开关和仪表板筛选不因使用 pointer / keyboard 就自动归 Editor。

优先验证一条最小闭环：多个 Scene 图元映射到同一稳定按钮 target，pointer 与 keyboard 产生同一激活语义，按钮跨 target 启动动画，并在 SVG / Canvas 呈现、命中和销毁时保持一致。这个场景尚不要求建立完整控件库。

## 4. 持久化判断

决定是否保存一个值，应先问：**丢弃运行时并重新打开文档后，用户是否仍要求恢复这个事实？** 还要问该事实由哪个 owner 决定。是否由 Signal 实现、是否频繁变化，都不能单独决定持久化。

| 内容                                             | 默认处理                                      | 真源或 owner                                 |
| ------------------------------------------------ | --------------------------------------------- | -------------------------------------------- |
| 图形、控件组成、动画关键帧与时序                 | 持久化                                        | 对应领域 Source IR                           |
| 稳定 target 之间的声明式交互规则                 | 若要随文档复用，可持久化；具体契约待 ADR 冻结 | 规则所属领域的 JSON-safe Source              |
| 业务值，如已展开、当前选项、应用筛选             | 需要跨会话保持时持久化                        | 对应领域或应用 snapshot，由 transaction 更新 |
| hover、pressed、焦点、拖动预览、打开中的临时弹层 | 默认不持久化                                  | Interaction / presentation session           |
| 动画播放中、当前帧、时钟偏移与 renderer 对象     | 默认不持久化                                  | Render / presentation runtime                |
| 由持久值确定的可见样式、Scene、索引与派生 Signal | 重建或按需计算，不重复保存为事实源            | 下游结果或缓存                               |

如果产品需要恢复一段未完成的交互会话，可以另存带文档版本和身份校验的**会话快照**；如果需要精确回放操作，可以另存有时间顺序和外部输入的**事件日志**。两者目的不同，均不应默认塞入绘图 Source IR。只保存点击事件，通常不足以确定异步数据、外部回调和版本变化后的重放结果。

### 点击按钮启动动画

1. 文档保存按钮与目标的稳定身份、动画定义，以及经后续契约确认的“激活按钮 → 启动目标动画”规则。
2. 点击或键盘激活产生语义事件。Interaction 按 ownership 解析规则，通知动画呈现；动画时钟、逐帧值和运行中状态只存在于 session。
3. 重新打开文档时，动画按声明的初始 / 稳定展示策略呈现，等待下一次激活；不会因过去点击过就自动恢复旧播放进度。
4. 若按钮同时改变应保存的业务值，由目标领域 owner 通过 transaction 提交新 snapshot。重新打开时先恢复该值与稳定画面；是否再播放过渡动画由明确的加载策略决定。

持久化 Source、领域 snapshot、Scene 与 presentation 不应互相代替。特别是动画末帧的静态展示与“当前是否正在播放”是不同事实。

## 5. Vega Signal 的启发及边界

[Vega Signals](https://vega.github.io/vega/docs/signals/)在规格中声明命名变量、初值、事件更新与依赖；[Event Streams](https://vega.github.io/vega/docs/event-streams/)描述触发更新的输入。信号的当前值在 View 运行时传播，进而更新依赖它的图形。Retikz 值得借鉴的是**显式命名、事件驱动、依赖传播和局部更新**，而不是把所有可变值并入一个全局 Signal 文档。

同一个 `open` 值可能是短暂的 Popover 状态，也可能是必须恢复的业务状态；“它是 Signal”无法回答所有权与持久化问题。Signal 可作为包内实现细粒度订阅或派生缓存的工具。跨包仍需显式传递 identity、ownership、revision、change / intent，并让持久更新回到领域 owner 的完整 snapshot。图形属性的逐帧更新走 presentation，低频业务变化走 transaction；不能为了响应速度把 renderer state 变成第二份文档真源。

## 6. 后续设计需确认的问题

- 声明式交互规则的 owner、JSON 边界、target 寻址、循环与缺失 target 诊断；不要用任意回调填入 IR。
- 跨 target 动画与业务 intent 同时发生时的顺序、取消、重入及错误语义。
- SVG / Canvas 与非 DOM 宿主的焦点、键盘和无障碍 capability，以及静态导出时的展示规则。
- 控件状态由文档、领域数据还是宿主应用拥有；受控值与默认值不得形成双重事实源。
- 是否存在足够的独立消费场景来建立可选控件家族，以及它与 Standard、Editor 和宿主 DOM 的明确边界。

上述问题应由后续 ADR 逐项冻结。本文只记录长期判断，不预设具体字段、包名或版本排期。

## 参考实践

- [Vega Signals](https://vega.github.io/vega/docs/signals/) 与 [Event Streams](https://vega.github.io/vega/docs/event-streams/)：声明式事件到命名状态的依赖传播。
- [PixiJS Accessibility](https://pixijs.com/8.x/guides/components/accessibility)：Canvas 图形借助 DOM 覆盖层接入屏幕阅读器与键盘焦点。
- [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs) 与 [Select](https://www.radix-ui.com/primitives/docs/components/select)：完整控件的键盘、焦点及选项语义超出外观绘制。
- [Konva Editable Text](https://konvajs.org/docs/sandbox/Editable_Text.html)：画板内文本编辑通过原生 DOM 输入元素完成。
