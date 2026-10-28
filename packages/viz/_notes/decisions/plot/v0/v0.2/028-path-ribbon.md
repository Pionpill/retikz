---
description: PathMark 复用 Ribbon Path kind，通过既有路径构造与带宽通道表达带状关系；桑基布局独立于流带绘制
keywords: PathMark、ribbon、带状连接、桑基图、width、RelationMark
---

# ADR-028：PathMark 带状路径与关系能力

- 状态：Accepted
- 决策日期：2026-10-26
- 关联：[roadmap](./roadmap.md)、[026](./026-mark-target-endpoints.md)、[027](./027-path-step-construction.md)、[023](./023-closed-mark-vocabulary.md)、[Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)
- 前置：[Relation ribbon](../../v0.1/073-relation-ribbon.md)；本决策定义其在统一 PathMark 中的替代契约，RelationMark 旧入口移除

## 背景与目标

PathMark 已能表达数据顶点、逐行端点与完整路径步骤。带状关系需要在这条路径上附加宽度，而不是另建关系专用路线或用粗描边模拟带状几何。旧 RelationMark ribbon 限制为单段水平连接，无法与统一路径构造自然组合。

本决策让 PathMark 消费既有 Ribbon Path kind，复用目标引用、数据投影、字段求值、标签和实例身份。桑基图由矩形路径节点与流带组合，均使用 PathMark：节点布局、流量守恒和连接槽位分配由布局数据提供，PathMark 不自动计算桑基布局。

## 决策：路径构造与带状外观正交组合

Plot Source 仍使用 `type: 'path'`，以 `properties.kind` 选择 `stroke` 或 `ribbon`，省略时为 `stroke`。不新增 RibbonMark，也不将 Plot 图元的 `type` 改为 `ribbon`。

Ribbon 几何、宽度策略、端帽、采样与 profile 扩展继续由既有 Ribbon owner 提供；当前公开实现属于 `@retikz/extension`。Plot 只拥有数据绑定、尺度、坐标投影与 Core Path 下沉，不复制几何算法、profile registry 或 renderer 分支。底层 owner 的独立迁移不由本决策实施。

本次接入 Ribbon 的中心线模式。顶点 `position`、`from / to`、完整 `steps` 保持互斥，其实例、字段依赖、domain 和声明顺序沿用 026、027。选择 ribbon 不会隐式把直线改为水平曲线；弯曲中心线由已有步骤显式表达。

Ribbon 的双边界模式与中心线具有不同输入结构，本契约不接入 `mode: 'boundary'`，也不允许通过未类型化选项绕过限制。

## 基础数据结构与公开契约

### 路径种类与固定参数

`properties.ribbon` 复用底层中心线选项中的 `width`、`start`、`end`、`sampling`、`align`；固定宽度规则保留 `fixed`、`taper`、`stops`、`profile` 四种结构及其默认值。`profile` 名称和 JSON 参数经已有注册链路消费，不限制为内置名称。

`mode` 不另设 Plot 字段；整条路径标签统一放在 `properties.label` 与 `encodings.label`，不再在 ribbon 对象内重复声明。ribbon 标签复用底层 Ribbon 标签契约，支持带内、带外及端面标签；不接受描边断口参数。端面标签使用底层 `start.label` / `end.label` 的固定声明，本决策不新增任意嵌套属性求值语言。

```ts
{
  type: 'path',
  encodings: {
    from: { x: { field: 'sourceX' }, y: { field: 'sourceY' } },
    to: { x: { field: 'targetX' }, y: { field: 'targetY' } },
    fill: 'flowColor',
    ribbon: { width: 'flowWidth' },
  },
  properties: {
    kind: 'ribbon',
    ribbon: { align: 'center' },
    stroke: 'none',
  },
}
```

以上端点形式生成直线中心线。需要桑基曲线、多段路线或图元目标时，使用同一 PathMark 的 `steps`；`way` 与 React `PlotPathStep` 仍是这些步骤的等价作者入口。

### 带宽通道与单位

`encodings.ribbon.width` 与 `encodings.ribbon.endWidth` 使用既有数值 Channel 契约。通道最终输出为非负有限的绘图单位，不是位置坐标，不经过 x/y 比例尺，不贡献位置 domain，也不触发自动留白。

- 未配置宽度尺度时，字段数值直接表示绘图单位；显式尺度绑定按现有 Channel 语义映射，输出仍为绘图单位，不隐式推导带宽范围。
- 只有 width 时构造固定宽度；提供 endWidth 时构造首尾渐变，采用底层 taper 的默认插值。
- 固定参数可提供完整宽度规则。字段绑定 width 可以覆盖 fixed.value 或 taper.start；字段绑定 endWidth 只能覆盖 taper.end。
- 无固定宽度规则时，由绑定形态建立 fixed 或 taper。endWidth 单独存在而无源宽度时报错。
- stops/profile 与这两个字段绑定互斥；不将 profile.params 或 stops 中的字符串自动解释为数据字段。
- 宽度字段参与实例依赖和通道检查。按系列组织的顶点路径保持路径外观取首行的既有规则；按行端点或 steps 则逐实例取值。

固定值零与字段值零采用相同的底层退化语义，不能一个被接受、另一个被 Plot 强制改成正数。负数、缺失、非有限或尺度映射后非法的带宽明确报错，不回退到默认值。完全退化中心线及零宽结果由 Ribbon 统一处理。

### 作者入口与底层契约

React PathMark 与 Vanilla 路径图元输入接受相同 `properties.kind`、`properties.ribbon` 和 `encodings.ribbon`，不另增只服务某个 adapter 的种类开关。React 通过 Plot Vanilla 组装同一 JSON Source；字段读取在 Plot 发生。

下沉使用 Core `Path kind='ribbon'`，中心线进入其步骤，带状参数及标签进入 Ribbon 的 `kindOptions`。绘图能力通过同一 provider contribution 装配，自定义 profile 与内置 profile 共用解析路径。Source 不持久化函数、已解析几何或 adapter 对象。

## 行为、失败语义与兼容性

- ribbon 必须获得宽度规则或 width 字段绑定；stroke 禁止 ribbon 参数及带宽通道，不静默忽略。
- ribbon 只接受底层中心线所支持的开放路径。闭合、多个不被支持的子路径、非法生成器输出等由底层能力给出诊断，Plot 不近似为另一条路径。
- `closed`、`closure`、`connectNulls`、`cornerRadius`、`marks`、箭头简写与步骤标签不进入本次 ribbon 契约，显式提供时报错；现有 stroke 行为不变。ribbon 外轮廓的 fill、stroke、opacity 等仍使用底层共享样式，不把 strokeWidth 当作带宽。
- 共享位置输入、curve 和坐标连接规则仍受原输入分支约束；steps 不接受顶点曲线或坐标插值配置。底层 Ribbon 决定给定中心线的带状几何，不由 Plot 再次计算法向。
- 引用图元继续遵守声明顺序与当前视图作用域；缺失目标报错，不自动重排。实例 provenance 来自流带数据，不能被端点图元的数据身份替换。
- 桑基图的一条节点边上可有多个连接槽位；节点 anchor 不替代槽位分配。布局产出的坐标端点可以直接使用，显式图元目标只定位作者指定的锚点与偏移。
- 文档在关系用法中增加带状连接，使用 PathMark 的矩形步骤与 ribbon 构成桑基示例，展示布局产物、流带宽度和路径构造的关系；React 与 Vanilla 同步说明。
- 桑基展示使用统一 PathMark；关系消费方遵循下述组合契约，不新增旧入口别名或兼容转换层。

## 关系图元收敛

RelationMark 的 schema、组件、归一化和下沉入口移除，不保留兼容别名。连接使用 PathMark 的端点或步骤，端点 glyph 使用独立 PointMark，流带使用 ribbon kind；数据关系变换继续由 Data 提供。组合遵循各图元自身的 domain、留白、实例身份和失败语义，非法端点明确报错，不保留整行静默跳过。

标签使用整条路径的字段绑定或固定步骤声明；逐段字段标签、正交路径最长段／最后一段自动选段不在当前契约内。
