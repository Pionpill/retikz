---
description: 三类几何图元提供独立 Annotation 入口，不绑定数据，复用 Plot 坐标投影与 Kernel 绘图能力
keywords: Annotation、PointAnnotation、PathAnnotation、IntervalAnnotation、常量位置、参考线、独立实例
---

# ADR-018：独立 Annotation 与数据图元共用几何能力

- 状态：Accepted
- 决策日期：2026-10-17
- 关联：[版本规划](./roadmap.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)、[渐进式属性](./014-progressive-mark-properties.md)、[数据执行作用域](./015-scoped-data-execution.md)、[坐标方向](./017-coordinate-relative-orientation.md)

## 背景与目标

参考点、阈值线与背景区域需要使用 Plot 的比例尺及坐标视图，却不应随主数据逐行生成。ReferenceMark 已移除，独立标注需要由点、路径和区间几何承接。

数据图元仍是主要使用方式，其常用 API 不应为了较少使用的独立几何而整体增加模式对象或嵌套。独立输入也不应继续暴露字段绑定，再依赖运行时猜测是否使用数据。

## 决策：入口区分实例来源，几何与绘图能力共用

React 提供 PointAnnotation、PathAnnotation、IntervalAnnotation；Vanilla 提供 pointAnnotation、pathAnnotation、intervalAnnotation。它们分别生成一个独立点、一条显式路径、一个区间区域，始终不绑定数据。PointMark、PathMark、IntervalMark 保留数据驱动职责与既有常用 authoring 形式。

Annotation 的实例来源由入口及对应 Source IR 分支显式确定，不通过“位置都是常量”推断。数据图元即使使用常量位置仍保留数据行或系列语义；Annotation 即使位于有数据的 Plot 中也不继承数据实例来源。

Plot 拥有独立实例、尺度映射、坐标投影及领域解析；Plot Vanilla 拥有作者输入与统一 normalize，React 调度 Vanilla。Annotation 和数据图元共用适用的 Plot 几何能力，最终调用同一 Kernel Node、Path、标签、样式、主题、锚点及渲染能力，不建立 annotation 专用 renderer 或平行几何算法。

这里的共用不要求经过数据获取、字段解析或数据变换。独立几何不制造空数据行，不借用第一条数据，不产生虚假的 datum lineage。

## 基础数据结构与公开契约

三个 Annotation 入口采用直接值：颜色字符串是颜色，文字字符串是文字，位置字符串是分类值，不解释为字段名。样式与标签复用相应几何宿主的常量契约；不暴露 field、encoding、dataset、transform、series、order、数据位置调整或逐行回调。

```tsx
<PointAnnotation x={10} y={20} text="目标" fill="red" />

<PathAnnotation
  from={{ x: { edge: 'start' }, y: 50 }}
  to={{ x: { edge: 'end' }, y: 50 }}
  stroke="red"
/>

<IntervalAnnotation
  x={{ from: 20, to: 40 }}
  y={{ from: 30, to: 60 }}
  fill="blue"
/>
```

Vanilla 工厂接受等价的 plain 输入，例如 `pointAnnotation({ x: 10, y: 20, text: '目标' })`，返回可进入 Plot 作者输入组合的声明。React 与 Vanilla 不分别决定默认值或位置语义。

Source IR 仍按 `type: 'point' | 'path' | 'interval'` 表达几何类别，以 `kind: 'annotation'` 明确独立分支。数据分支的 kind 为 data，既有数据声明省略 kind 时仍表示 data。两分支采用各自的严格对象契约，不允许 annotation 携带数据绑定字段。

Annotation 的 Source 几何分别为 `position` 角色映射、`from` / `to` 角色映射、`bounds` 角色区间映射；样式使用直接常量契约。React / Vanilla 的点位置及区间 x/y 属性分别归入 position、bounds。普通位置值为有限数值或分类字符串；时间位置使用既有时间尺度的数值表示。位置也可为 `{ edge: 'start' | 'end' }`。角色名由当前坐标定义决定，不将 x/y 写死为屏幕方向；自定义角色通过同名 position 或 bounds 映射表达。

PointAnnotation 必须提供当前坐标的完整位置。PathAnnotation 的 from、to 必须分别提供完整位置；它表达两端间的显式路径，不把主数据行连接为轨迹。IntervalAnnotation 必须给出各角色的 from、to，完整视图范围用两端 edge 引用表达。缺失维度不隐式满铺。

Annotation 共用 `id`、`coordinateView` 及相应宿主的常量样式、标签和裁切能力。PointAnnotation 的 orientation 使用点图元的既有屏幕或坐标方向契约；PathAnnotation 复用坐标的插值语义及适用的路径外观；IntervalAnnotation 复用区间投影能力。由 Plot 产生的位置、路径步骤及区域形状不能被样式字段覆盖。

## 位置、视图与实例行为

普通位置常量属于数据空间，必须经过对应角色的 scale 和 coordinate，不是屏幕像素。edge 引用解析为当前坐标视图中该角色最终映射范围的起止边界，包含反向范围及域留白的影响，不等同于原始数据的最小值、最大值，也不以无限数值代替。

edge 由 Plot 共用坐标角色解析能力消费，内置和自定义坐标采用同一契约。边缘解析依赖已确定的视图范围，不反向贡献 domain。视图或尺度变化时重新解析位置；独立不意味着不可更新。

Annotation 的 `contributeToDomain` 默认为 false，适合参考几何。显式 true 时，普通位置常量及区间、路径的各端点参与对应尺度的 domain 推导；edge 始终不贡献。仅包含 annotation 的视图可显式设置 scale domain，或开启常量域贡献；全 edge 输入不能凭自身建立数据域，仍遵循尺度既有缺域诊断。

Plot 根级 data 仍为必填，并必须提供对应的数据绑定；即使全部内容都是 annotation，也不允许省略 data。缺少根数据声明或绑定时直接报错，不绘制 Plot，不创建隐式数据集。提供空数组与缺少 data 不同：有效绑定的空数据集不抑制已存在坐标视图中的 annotation，尺度仍须能确定有效 domain。

Annotation 自身不读取数据行、不解析字段、不执行 mark 局部数据变换，也不为自身调用数据执行器。Plot 根级数据准备、显式声明的 root transform 与数据分面仍沿用既有规则，其错误不能因只含 annotation 而被忽略。Annotation 不凭空创建缺失的 facet 分区；在分面视图内声明时，每个实际生成的视图实例各生成一个 annotation。

路径与区间标注共用 `connection: 'coordinate' | 'straight'`，默认 `coordinate`。不再提供标注专属的 `interpolation` 配置。坐标与数据图元既有插值配置仍各自负责其几何语义。

`coordinate` 由坐标帧提供映射后角色空间的线段与区域投影能力。连续极坐标沿角度与半径参数插值；多边形极坐标沿端点之间有序的分类角向骨架补充顶点，再以直线分段连接。中间半径在映射后参数空间插值，等半径路径经过每个中间分类的相同参考值；这些顶点不是数据行。区间内外边界使用同一骨架，B–E 范围应经过 C、D，不因仅使用四个端点而退化。

端点范围按最终映射参数的方向解释，反向输入反向遍历，不猜测最短跨缝路径；整圈由不同的范围起止边界表达。区域的完整闭合边界遵循坐标帧的拓扑规则。相同端点与零宽区域保持退化，不制造额外跨度。

`straight` 将路径两端投影后直接连接；二维区间在投影后以直线连接各角点，自定义区域的角点与边界由所属坐标定义确定。相对方向上的四角可能共线，这是直连模式的退化行为。笛卡尔坐标两种模式结果一致。

连接能力属于 Plot 坐标扩展契约，内置与自定义坐标共用，不在 annotation lowering 中识别内置坐标类型来实现连接算法。自定义坐标必须明确提供所需线段或区域投影能力；缺失时明确报错，不以直线隐式替代坐标连接。最终产物仍使用既有 Kernel Path、Node 与区域形状。

Annotation 保留声明级身份与实际生成图形的锚点、定位能力；分面身份包含所属视图。不生成数据行、系列或 transform provenance，不允许通过 datum locator 假装访问数据实例。

## 行为、失败语义与兼容性

- 类型与 Source schema 分别约束合法输入；JSON 中出现 annotation 数据绑定、未知字段或非法常量时，入口解析失败。内部不重复 TypeScript 已保证的检查。
- 未知坐标角色、角色缺失、缺少指定坐标或其必要投影能力、无法确定 edge、不能映射的显式位置均明确诊断，不静默读取数据或退回屏幕坐标。外部 JSON 与领域上下文错误分别由各自 owner 处理。
- 重合端点、零宽区间等退化几何沿用相同几何宿主的规则，不人为扩成参考线或区域。
- 数据图元的常用输入、数据实例数量及原有常量 IR 通道语义保持不变；本决策不把数据图元的所有常量位置自动转换成 annotation。数据 authoring 的位置常量简写可单独扩展，不是 Annotation 生成实例的前提。
- 本决策为独立标注入口的增量能力，不恢复 ReferenceMark，也不提供旧入口别名。直接 JSON IR、React、Vanilla、standalone 与 embedded 使用同一 Plot 语义。
- Annotation 的节点、路径和区间继续使用既有主题与绘图输出；用户可见的输入、默认值及错误约束须同步中英文文档。
