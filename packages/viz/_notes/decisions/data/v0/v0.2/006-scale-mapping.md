---
description: Data 拥有可被 Plot 和 Table 共同消费的通用比例尺声明、Definition 与映射解析，宿主保留视觉选型、绑定、主题和布局策略
keywords: scale、比例尺、映射、Data、Plot、Table、domain、range、registry
---

# ADR-006：通用比例尺映射归 Data

- 状态：Accepted
- 决策日期：2026-10-28
- 关联：[版本规划](./roadmap.md)、[Data 完备设计](../../../../architecture/data-capability-complete.md)、[Plot 消费决策](../../../plot/v0/v0.2/029-scale-mapping-contract.md)

## 背景与目标

Plot 与 Table 都已存在分类、连续和阈值映射。Table 的条件配色不是 Plot 图元，其复用不应要求依赖 Plot。两者可以共享映射规则与扩展机制，但不应被迫共享缺值、配色、范围和布局策略。

Data 的职责从数据准备与变换扩展为宿主无关的数据准备、变换及通用值映射。不新增 scale 发布包，不把整套 Plot 比例尺系统搬入 Data。

## 决策：Data 定义和解析映射，宿主选择配置并绑定消费

Data 拥有比例尺 operation schema、ScaleDefinition、defineScale、registry、解析结果及内置映射。Plot 和 Table 单向消费 Data；Data 不依赖 Plot、Table、Core、Standard、renderer 或 adapter。

| Data 拥有                                                                                                                           | 宿主拥有                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| linear、log、pow、sqrt、symlog、time、radial、band、point、ordinal、quantize、quantile、threshold、sequential、diverging 的映射机制 | 根据通道、图元或单元格用途选择类型与默认配置             |
| 根据给定 domain 或样本建立映射、插值、分位边界、分类顺序                                                                            | 确定参与训练的字段、数据视图、行集合及共享作用域         |
| 原始代表值、带宽、step、反向计算及数学映射重建                                                                                      | 连续性许可、刻度标签、轴、图例、坐标投影、单元格视觉呈现 |
| 命名插值资源的解析与显式范围处理                                                                                                    | 主题配色、属性单位、基线许可、自动留白和布局范围         |

Scale 是与 transform 并列的 Data 能力。解析 scale 产生可复用的映射，不要求变换 rows、生成新列或创建虚假的 lineage。数据 transform 可以在真实需求下消费映射，但不是使用 scale 的前提。

## 基础数据结构与公开契约

Data 的映射 operation 以 `type` 选择映射规则，包含适用的 domain、range、clamp、nice、断点或插值配置。宿主声明名称、引用作用域与消费属性不进入通用 operation；Plot 的 `name`、视觉 `output` 和 Table 的 selector/target 留在宿主包装中。

Data 映射输出数值或字符串标量，颜色插值是字符串映射的一种明确插值方式，不按字符串内容猜测用途。形状映射仅处理标识字符串；形状是否注册、CSS 颜色是否合法、数值是否满足透明度或尺寸约束，由宿主消费契约校验。不将 Core schema 或形状 registry 作为 Data 依赖，也不增加任意对象输出。

ScaleDefinition 由 Data 声明，内置与自定义共同通过 defineScale 和统一 registry 进入解析。Definition 以 `type` 注册，持有 `paramsSchema`、输入兼容性与解析回调。实例以 `type` 引用定义，公共 domain/range 与自定义 `params` 分离；params 为 JSON 对象。函数、插值器与运行时映射不进入 JSON。宿主将自定义定义与解析资源交给同一机制，不再各自定义一套数学 scale registry。

公开调用关系为 `defineScale({ type, paramsSchema, isFieldCompatible, resolve })`，解析回调为 `resolve(context, params)`；context 包含宿主选定的标量样本、可选 domain/range 及命名插值资源，不包含图元与主题。外部声明在 `parseScaleOperation` 边界按公共结构和所引用定义的 paramsSchema 完成解析；`resolveScale` 消费已类型化声明，不重新解析内部对象。默认参数从所属 paramsSchema 复用。

`resolveScaleRegistry` 合并内置与用户定义，重复 type 报错；`resolveScale` 依 type 查找同一 registry 并包装第三方解析异常。映射结果使用 `map(value)`、`domain`、`range`，算法按实际支持情况直接提供可选数学成员。输入为 Data 标量，输出为 number/string 或表示缺值的 undefined。类别 unknown 策略通过 ordinal 参数明确指定为扩展或缺值；宿主选择策略，不依赖宿主名称。

解析输入是 operation、宿主选定的标量样本和显式映射资源。解析结果可提供原始代表值计算 ticks、数值反向映射 invert、独立重建 rebuild，以及 bandwidth、step、thresholds 数学结果。分类序列和分档输出分别直接读取 domain 和 range，不另存可推导投影。Data 不建立消费能力清单，不提供连续图例采样、输出布局界限或 domainPadding 协议。

刻度计算只提供原始数值；数值/时间/分类的展示语义、标签格式、图例形态和自动留白由消费方拥有。宿主可在自己的注册定义中声明消费策略，不能把这些策略反向加入 Data。数学重建可替换适用的 domain、range 和 clamp，产生独立映射，不能通过共享可变实例使不同消费视图互相污染。

Data 负责量化数学规则，宿主负责策略参数。例如 Table 连续配色的 clamp=true、分类颜色数量要求，以及 Plot 的既有配色与域边距策略，均由各自显式提供，不选一方默认覆盖另一方。

Table 的现有两端颜色线性插值由通用颜色插值能力承接；Plot 是否开放 linear 的颜色配置由 Plot 决定，Data 不继承 Plot 的入口限制。sequential/diverging 仍保留现有规则，不因共享算法成为废弃别名。

## 行为、失败语义与兼容性

同一 operation、训练样本和资源产生相同映射，结果不取决于调用者是 Plot 还是 Table。宿主选择的有效样本、默认范围和策略不同，可以合法产生不同结果。quantile 保留样本重复值，是否合并多个绑定的数据由宿主决定。

不增加比例尺类型，不借归属迁移改变既有数学行为、UTC 时间策略或消费端默认。空域、单值与缺值中的现有差异通过显式策略或宿主预处理保留，不能通过调用者包名分支实现。

Data 的注册冲突、非法数学配置和映射解析错误由 RetikzDataError 表达；第三方回调异常保留 cause。Plot/Table 的引用、属性值域、能力消费和布局错误由各自领域错误表达；需要补充宿主上下文时保留下层错误为 cause。

Data 不持有 React/Vanilla 专属入口。宿主的 JSON 与各 adapter 进入同一映射能力。迁移完成后删除 Plot/Table 重复的数学 Definition 与实现，不保留旧导出别名或双 registry；宿主必要的绑定与呈现定义继续存在。

本 ADR 的职责与参数入口已获用户确认。Accepted 表示设计接受，不表示全部消费者已迁移或能力已经发布。
