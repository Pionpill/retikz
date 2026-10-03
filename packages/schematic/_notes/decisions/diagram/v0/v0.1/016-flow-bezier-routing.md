---
description: Flow 二次与三次贝塞尔显式路由、完整控制点配置及渲染后避让修正
keywords: Flow、Bezier、curve、cubic、control、control1、control2、routing、drawing.origin
---

# ADR-016：Flow 贝塞尔路由

- 状态：Proposed
- 决策日期：2026-10-02
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [bend 路由](./015-flow-bend-routing.md)

## 背景与目标

bend 可以低成本表达常规曲线，但其对称角度或切线简写不足以精确表达部分复杂绕行。作者需要直接给出一个或两个贝塞尔控制点，在节点布局仍由 Flow 负责的情况下调整某条关系的路径。

贝塞尔路由主要服务检查生成图示后发现的节点穿越、标签遮挡或边重叠，也允许有明确几何要求的作者直接指定。简单曲线优先用 bend；显式控制点的能力不等于自动避障。

## 决策

### 完整复用二次与三次贝塞尔

Flow 单条 Relation 的 routing 增加 Core 同名的 `curve` 与 `cubic`：前者完整保留 `control`，后者完整保留 `control1`、`control2`。控制点复用 Core ControlPointSchema，只接受有限的笛卡尔 `[x, y]`，不增加 Core 本身没有的节点引用、相对控制点或任选控制点数量。

source / target 仍是 Flow element id，替代 Core Step 的起始 cursor 与 `to`；曲线首尾不由作者另写。标签复用 ADR-015 的唯一 Relation.label 入口，完整 GeometryLabel 不在 routing 重复保存。Graph materialization 生成对应 Core curve / cubic，不用 bend 近似替代，也不在 Diagram 重写贝塞尔公式。

### 精确路径只配置在单条关系

`curve` 和 `cubic` 只允许出现在 Relation.routing；根、Group 与 Definition 默认 routing kind 仍只接受无关系专属控制点的常规模式。把同一绝对控制点隐式分配给整个作用域的每条边不构成有用默认，也会使 LLM 难以判断路径。

常规作用域路由继续继承；一条关系显式选择 curve / cubic 时，控制点必须在本条关系完整提供，不从祖先、另一条关系或 Definition 补出。不存在省略控制点后生成默认 S 曲线、自动由 bend 推断控制点或从渲染器读取控制点的行为。

### 坐标系和修图闭环

控制点使用本次 Flow 布局的根坐标系，先于 Diagram title、Frame、padding 和 drawing placement；不是屏幕像素、完整 Frame-local 坐标或 Scene world 坐标。Group 内关系仍使用 Flow 根坐标，不按 Group 再偏移。

Flow artifact 的 `regions.drawing` 增加必需 `origin: Position`，表示 Flow 根坐标 `[0, 0]` 在完整 Flow allocation-local 空间中的位置。该值等于实际 drawing placement 所用的平移，不等于 drawing allocationBounds 的左上角；负坐标或曲线溢出时两者可以不同。

artifact 中的 route 端点、控制点与标签预留盒仍统一使用 allocation-local 坐标。作者从同 revision artifact 取得控制点时，先减去 drawing.origin 再写回 Source；Scene 的祖先 transform、缩放和屏幕映射另由 Core world-space 查询处理。origin 是坐标转换所需的独立事实，不保存一份重复的根坐标 route 或 Source 快照。

LLM 通常先生成常规模式并检查真实渲染结果，结合同次编译的 artifact 定位冲突，只修改受影响关系。控制点是作者事实，布局改变时仍使用原值；Flow 不自行搬移它们或保证原绕行继续安全。作者应重新渲染检查，优先调整方向、布局间距或简单 bend；需要精确局部绕行时再用贝塞尔。

### 避让能力与几何保证

曲线一般不经过控制点。一个控制点在障碍外，或控制点组成的折线绕开了障碍，都不证明贝塞尔安全；必须检查整条曲线，包括首尾接近节点的位置和完整标签。

本决策提供显式单段几何，不自动搜索控制点、不重排节点、不把 cubic 扩成多段路径。可以通过既有 Layout Definition 接入更强的路由能力，但本 Source 中显式控制点始终是必须遵守的作者约束，provider 不得覆盖它们；完整自动避障需要另一份明确设计。

内置 layered 对其他节点避让盒中的曲线穿越发出 `FlowBezierObstacleConflict` warning，保留本条曲线和控制点。端点节点、相关祖先 Group 和合法跨组边界按 ADR-015 的同一规则处理。边交叉或标签接近只说明需要检查，不以全局无交叉为公开保证。warning 不是安全证明，也不代替 LLM / 作者的渲染后检查。

## 基础数据结构与公开契约

```ts
type FlowBezierRouting =
  { kind: 'curve'; control: IRPosition } | { kind: 'cubic'; control1: IRPosition; control2: IRPosition };

type FlowBezierRoute =
  | Readonly<{
      kind: 'curve';
      points: readonly [Readonly<Position>, Readonly<Position>];
      control: Readonly<Position>;
    }>
  | Readonly<{
      kind: 'cubic';
      points: readonly [Readonly<Position>, Readonly<Position>];
      control1: Readonly<Position>;
      control2: Readonly<Position>;
    }>;

type FlowDrawingArtifact = FlowArtifactBounds &
  Readonly<{
    origin: Readonly<Position>;
  }>;
```

`FlowRoutingSchema` / `IRFlowRouting` 在 ADR-015 的基础上增加这两个分支，作为完整单条关系路由。根与 Group 使用其常规模式子集；不建立第二套同义字段或新的作者路径格式。实际类型从复用 Core 字段的 schema 派生。

`FlowLayoutRouting` 和 `FlowLayoutRoute` 分别增加同名有效输入与几何输出分支。回调输出沿用 ADR-015 的 `{ route, labelBounds? }`。route.points 只保存两个 endpoint 参考点，不能把控制点塞入 points 冒充经过点，也不同时保存与控制点等价的采样点或参数形状。

`capabilities.routingKinds` 增加 `curve`、`cubic` 两个独立值；内置 layered 声明两者。Definition 可以只支持其中一种，必须准确反映 catalog，不因为两者都属贝塞尔而自动接受未声明模式。Definition 默认 kind 不得是这两个关系专属模式。

输出验证要求端点对应 source / target 的参考中心、全部坐标有限，并逐值保留有效输入中的控制点和 routing kind。Core 对实际首尾按 control / control1 / control2 的方向与真实连接面进行边界处理，再应用箭头缩短与标签中断；artifact 仍是参考路线。

标签的全部属性、显式配置优先级与旋转预留沿用 ADR-015。`position` 分别是二次、三次贝塞尔的参数位置，不能按控制点折线长度或均分折线点推算；最终绘制和倾斜标签使用 Core 的真实曲线采样语义。

React、Vanilla 和 direct JSON 接受相同完整 routing 与标签属性，不提供独立 JSX Step children 或 adapter 私有控制点转换。artifact 平移 points、全部 control 字段和 labelReservation，不能只平移首尾。

LLM describe 固定表达：简单曲线优先 bend；curve / cubic 用于精确局部避让或自定路径，通常在检查渲染并定位重叠后使用；控制点不是经过点，没有自动避障保证。control1 / control2 分别说明首尾切线影响，控制点字段说明 Flow 根坐标与 artifact origin 转换。

## 行为、失败语义与兼容性

- 缺少必要控制点、填写其他曲线分支字段或在根/Group 指定 curve / cubic，在 Source 边界拒绝；不制造默认值或隐式转换
- Definition 未声明对应 mode 时沿用 capability 错误；返回控制点变更、旧 points 输出、错误 route kind 或非有限几何时沿用 `FlowLayoutOutputInvalid`
- 控制点重合、共线或落在节点内不单凭形状判为 schema 错误；保留 Kernel 对退化几何的语义，真实穿越使用 warning，非有限编译失败保留 Core cause
- 正向、反向、双向和无箭头只影响 Graph 语义箭头，不交换两个控制点或重写 authored source → target 的曲线
- 新增模式不改常规路由、默认 straight、自环 capability 或作者固定 Layout placement；Node/Group 仍不得由曲线路由重新定位
- `regions.drawing.origin` 为新增必需 artifact 字段，所有内置消费者和 schema 同步更新，不通过 fallback 猜测旧 artifact 的原点
- 本决策扩展 ADR-003 对作者路径几何的限制：关系允许这两个有类型的几何输入，仍不开放任意 Core route；扩展 ADR-004 的 mode 与 ADR-005 的 artifact 坐标转换，其余约束沿用 ADR-015
