---
description: 上层绘图能力复用完整适用的基础样式契约，补齐Shape、Arrow、Pattern和Pin的实例配置与Definition消费边界
keywords: 原子属性、Shape、Arrow、Pattern、Pin、fillRule、opacity、绘制上下文
---

# ADR-072：适用绘制属性完整承接

- 状态：Proposed
- 决策日期：2026-10-23
- 关联：[roadmap](./roadmap.md) · [原子契约](../../../../../../notes/architecture/atomic-contract-design.md) · [绘图完备](../../../architecture/core-drawing-complete.md) · [通用样式](./066-complete-visual-style.md) · [宏属性](./071-macro-visual-property-resolution.md) · [基础图元](./070-marker-scene-primitives.md)

## 背景与目标

定义能够返回完整基础图元，并不意味着实例能够配置这些图元。若 Source、解析结果与 Definition 上下文各自维护样式子集，底层已有的填充规则、描边、通道透明度与效果就可能在上层入口被截断。

上层必须承接职责内全部适用的基础绘制属性；有意收窄须由明确的领域语义说明。输入接受的属性必须到达实际消费者，且普通与混排、端点与中段、内置与自定义使用同一契约。

## 决策：按绘制通道组合，按所有权消费

Core 继续拥有 Source 样式、解析与 Scene 契约。上层从同一权威原子组合填充、描边、透明度与效果，不复制叶子约束；Scene 中使用已解析绘制值，不引入通用样式对象或专属 marker 图元。Definition 上下文只包含本能力可消费的有效属性与必要几何服务。

`color` 和 `opacity` 保留宏属性角色。主色先按既有优先级解析到适用通道，整体透明度由明确的宿主边界应用一次。Definition 输出中的固定样式保留，不能通过对所有输出图元强行覆盖来补偿上下文缺口。

理由：同一绘制能力应有同一约束和默认语义；新增基础字段时，上层必须明确承接或排除，不能依赖历史白名单；图元结构、几何和容器职责需要独立于绘制样式演进。

## 基础数据结构与公开契约

### 共用绘制字段

Source 继续使用 `fill`、`stroke`、`strokeWidth`、`dashPattern`、`dashOffset`、`lineCap`、`lineJoin`、`shadow`、`blendMode`。路径填充使用 `fillRule: 'nonzero' | 'evenodd'`。这些字段复用现有权威约束，不创建按组件重复的 schema。

具有填充和描边的能力使用 `opacity: number | { overall?: number; fill?: number; stroke?: number }`。独立绘制图元上的整体与通道因子仍分别相乘，Source 中不新增平级 `fillOpacity` / `strokeOpacity`。纯文字、引线、渐变 stop 等只有单一透明度需求的入口保留标量。

| 上层能力        | 适用绘制面                                                    | 明确边界                                                                                |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Node / Shape    | 完整填充、描边、三因子透明度、阴影、混合；新增实例级 fillRule | fillRule只交给路径型形状；椭圆和矩形没有可切换的复合填充规则。形状几何仍由shape参数负责 |
| Path / PathKind | 保持已有完整绘制面，与基础样式共享真源                        | 路径几何、标签、箭头和整体变换仍由各自契约负责                                          |
| Arrow           | 完整填充、描边、三因子透明度、fillRule、阴影、混合            | 尺寸、参考点、方向和接触补偿仍由箭头几何负责；整体透明度由宿主消费，不交定义重复应用    |
| Pattern motif   | 完整填充、描边、三因子透明度、fillRule、阴影、混合            | tile尺寸、背景、旋转与几何参数单独消费；不将外部填充对象的主色自动写入motif             |
| Node label pin  | 完整描边、标量透明度、阴影、混合                              | pin为开放引线，不开放填充、fillRule或独立填充透明度                                     |
| 正文与标签      | 完整承接TextPrim已有文字、字体、行级颜色和透明度能力          | 不凭空给TextPrim增加渐变字色、文本描边或效果；几何与测量由文本布局负责                  |

### Arrow

Arrow 的描边宽度统一使用 `strokeWidth`，删除同义的 `lineWidth`，定义上下文同步采用该名称。宽度保持既有marker局部坐标含义，默认值和接触补偿沿用现有几何契约。

实心与空心表达默认绘制方式，不再静默忽略显式通道：实心默认填充、无描边；空心默认描边、无填充。显式 `fill`、`stroke`、`strokeWidth` 均有效。`hollow` 继续决定缺省接触补偿方式，显式增加的轮廓不会自动改变作者声明的箭头几何包络。

整体透明度与Path宿主相乘；填充、描边因子进入对应绘制通道，已有图元局部因子继续保留。所有新字段均参与共用、逐端和实例覆盖，省略不清除继承，显式零保留。Path `color` 覆盖mark宏颜色、具体paint优先的规则不变。

### Pattern

Pattern实例的绘制字段保持在既有配置层，不增加包装层。`color`作为本motif主色：线型缺省描边和圆点缺省填充消费它，具体fill/stroke优先。省略fill不使线型图案产生填充；省略stroke不使圆点产生轮廓。

描边宽度统一为 `strokeWidth`。圆点半径使用独立 `radius`，默认仍为size的五分之一；删除曾同时表示线宽和点半径的 `lineWidth`。`radius`是motif几何参数，不能出现在方向或线型周期样式里。

横向、纵向和周期线型样式复用完整描边、标量透明度与效果，不接收填充字段。其字段作为局部覆盖继承基础motif对应值，整体透明度与宿主paint通道透明度各应用一次。背景继续是独立tile背景色，不被motif的填充、描边或效果改写。

Definition接收解析后的paint与样式，内置和自定义均可选择其内容中应响应配置的绘制部分。允许合法的渐变和图案paint，资源绑定、嵌套依赖和循环诊断复用现有Scene资源机制。

### TeX 降解边界

TeX lowerer 是字形绘制输出协议，不是任意Scene生成器。它保留字形命令、布局度量以及none/currentColor/固定颜色的paint关系，并复用基础路径的fillRule、描边、透明度及效果类型；补齐 `dashPattern`、`dashOffset`、`strokeLinecap`、`strokeLinejoin`、`shadow`、`blendMode` 的输出消费。

不在公式用户输入上新增CSS字体族、任意shape参数或资源注册能力。Lowerer没有Scene资源注册上下文，因此不接收孤立的resourceRef或Source paint对象；需要资源生成能力时另行设计完整注册契约。字形之外的嵌套箭头、身份、动画和裁剪不属于该输出协议。

## 行为、失败语义与兼容性

- 已有视觉默认保持不变；新字段缺省保留定义默认，不能以新默认覆盖作者固定样式。无对应通道的几何不因共享字段而自动创建通道。
- 属性应用以实际基础图元能力为界；自定义定义必须说明哪些内容响应上下文。无需响应实例样式的固定内容可保留固定值，Core不递归重涂。
- 样式不自动携带几何、id、meta、动画、裁剪或group合成。Group仍是结构容器，本决策不引入离屏组透明度。
- 闭合输入拒绝旧名及未知字段；资源缺失、类型错误、循环依赖与回调异常保持现有owner诊断。定义输出只做必要上下文处理，不重复解析内部对象。
- 获批后，本决策替代ADR-051和ADR-071中Arrow仅有标量透明度、保留lineWidth的限制，以及ADR-066中空心忽略fill的限制；保留主色优先级、宿主因子与无后处理重涂的规则。Node标签透明度保持显式标签值优先、省略时继承Node整体值；混排片段透明度与有效标签值相乘，pin显式值独立覆盖、省略时继承有效标签值。
- 这是Source与Definition的breaking调整。旧名直接删除，无兼容别名、自动迁移或双轨。React、Vanilla和Direct IR表达同一能力，Extension同步消费同一上下文；完整编译与增量更新须保持相同结果。
