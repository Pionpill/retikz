---
description: Vanilla 统一默认文字测量与环境降级，React 透传测量配置和宿主字体，Core 保持环境无关。
keywords: Vanilla、React、文字测量、measureText、TextMeasurer、SSR、Canvas、defaultFontFamily
---

# ADR-056：Vanilla 默认文字测量

- 状态：Accepted
- 决策日期：2026-10-18
- 关联：[roadmap](./roadmap.md)、[包职责](../../../../../../notes/architecture/package-responsibility-design.md)、[绘图完备性](../../../architecture/core-drawing-complete.md)、[Vanilla runtime](../v0.3/003-vanilla-runtime-and-dependency-graph.md)、[Vanilla authoring](../v0.3/004-vanilla-imperative-builder.md)

## 背景与目标

React 自动提供浏览器文字测量，Vanilla 默认使用 Core 的估算器，导致同一浏览器中的等价输入可能得到不同节点宽度、折行与连接边界。环境测量与框架无关，应由所有框架共同消费的 Vanilla 处理入口统一选择。

统一默认行为，同时保留无浏览器环境下的同步编译、自定义测量器和 Core 的环境无关边界。

## 决策：由 Vanilla 选择默认测量能力

Vanilla 对需要编译的输入统一应用以下优先级：

1. 显式 `compile.measureText` 优先，使用调用方提供的测量能力。
2. 未提供时，默认测量器在实际调用时尝试获取浏览器 Canvas 2D 上下文。
3. 无浏览器环境、Canvas 创建或上下文获取失败时，使用 Core 的 `fallbackMeasurer`。

React 只透传调用方测量器与宿主字体，不维护独立浏览器测量实现。Core 继续拥有 `TextMeasurer`、度量结果校验与估算器；直接调用 Core 且未注入时仍使用估算器。Render 消费编译后的 Scene，不负责选择编译度量。

Vanilla 的根入口保持 SSR 导入安全：模块加载时不访问 DOM。默认测量允许在调用时惰性访问浏览器能力，这是通用 processing 的受限环境适配；DOM 挂载、事件与元素生命周期仍属于 DOM 子入口。根入口不依赖 DOM 挂载子入口。

## 基础数据结构与公开契约

沿用 Core 的 `TextMeasurer` 与 `CompileOptions.measureText`，不增加 IR 字段、平行度量类型或全局测量器注册表。

- Vanilla `ProcessingOptions` 与渲染／挂载共用选项增加可选 `defaultFontFamily?: string`，表达文字未指定字体族时的宿主默认字体；同步、异步准备、static 与 retained 路径使用相同规则。
- React `Layout` 增加可选 `measureText?: TextMeasurer`，透传为 Vanilla 的 `compile.measureText`。缺省时不注入 React 自有测量器。
- React 将 `style.fontFamily` 传为 Vanilla 的 `defaultFontFamily`。该值属于处理配置，不写入可持久化 IR。
- Vanilla 在调用测量器前，仅为未指定字体族的文字补入显式 `defaultFontFamily`，自定义测量器也获得这份宿主信息。文字自身的显式字体族优先，其他字体字段保持原义，不修改调用方对象。
- 内置浏览器测量在上述字体族仍缺省时，读取页面 `body` 的计算字体；不可读取或为空时使用 `sans-serif`。字号、字重与字形沿用已解析的文字配置。

显式宿主默认字体也用于宿主文字显示的缺省字体环境；它不改变文字自身的覆盖优先级。已有 Scene 输入不进行测量或重新布局。对于预编译 Scene，改变显示字体不会自动修正其几何。

Render 的 SVG `BuildDocumentOptions` 提供可选 `defaultFontFamily`，写入根 SVG 的字体族属性，供文档构建与字符串导出共享；它只影响显示，不参与编译或重测量。Vanilla 将同一宿主默认字体传给 SVG 输出及 SVG / Canvas 挂载宿主。

## 行为、失败语义与兼容性

- 同一环境、同一有效字体与测量配置下，React 与 Vanilla 对等价输入使用同一度量规则，不因选择 SVG 或 Canvas 后端改变测量器。
- Node / SSR 无浏览器能力时保持估算行为。浏览器中的 Vanilla 默认尺寸可能变化，这是默认语义的有意变更；需要固定估算结果的调用方可显式传入 Core 的 `fallbackMeasurer`。
- 自定义测量器优先路径不探测 Canvas。调用方异常、非法度量结果及已获得上下文后的实际测量异常不得静默改为估算；遵循现有 API 错误边界并保留原因。
- Canvas 创建或上下文获取不可用时允许估算。缺失字形 ascent / descent 时沿用字号比例补足，返回负值的对应垂直指标按零处理；仍有有效宽度时不因缺少可选字形指标而放弃浏览器测量。
- 字体尚未加载时，测量可能使用浏览器当前的备用字体；不会同步等待字体加载。本决策不增加字体加载订阅或自动重编译，应用仍负责在字体就绪后启动或重新执行处理。
- 测量配置在 retained 实例生命周期内固定；需要更换测量器或宿主默认字体时重建实例。React 按编译配置变化重建处理实例，普通输入更新继续复用现有处理生命周期。
- 公式仍通过 `lowerTex` 接入，本决策不改变公式初始化、下沉、缓存或失败行为。

本决策替代早期 Vanilla ADR 中“Vanilla 一律默认估算且不内置浏览器测量”的约束，保留其 SSR 导入安全目标。浏览器能力探测的边界不扩展为任意 DOM 操作许可。
