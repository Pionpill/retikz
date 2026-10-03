---
description: Flow 完整 Target 经过点曲线、tension 配置、Core 引用查询与路径避让检查
keywords: Flow、smooth、tension、Target、relative、relativeAccumulate、routing、PathTargetQuery
---

# ADR-017：Flow 过点曲线路由

- 状态：Proposed
- 决策日期：2026-10-02
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [bend 路由](./015-flow-bend-routing.md) · [贝塞尔路由](./016-flow-bezier-routing.md)

## 背景与目标

多处障碍或自定义绕行走廊可能无法用一条对称 bend 或单段贝塞尔清楚表达。作者需要指定按顺序经过的点，以连续曲线连接流程关系，同时仍由 Flow 负责节点排列。

过点曲线的使用优先级低于 bend 和显式贝塞尔，主要用于检查渲染后仍需复杂绕行的关系。它也能表达已知的定制路径，但不能把安全经过点误认为整条平滑曲线已安全。

## 决策

### 完整配置与唯一终点

Flow 单条 Relation 增加 `routing.kind: 'smooth'`，保留 Core SmoothStep 的完整 `points` 值域和 `tension`。points 接受 Core Target 的笛卡尔、极坐标、NodeTarget、relative、relativeAccumulate、offset 和 between 写法；NodeTarget 的 anchor、offset、boundary 及嵌套目标表达式均按 Core 语义消费。tension 为正数，省略时使用 Core 的 `1`，不改成平滑度百分比或相反方向的紧张系数。

Flow 的 source / target 仍是关系端点的唯一事实源。routing.points 表示两端之间的有序经过点，至少一个；Flow 自动在 Core smooth 点列末尾追加关系 target，起始 cursor 由 source 提供。该投影是 Flow 关系模型与 Core 独立 Path 的明确区别：作者无需在 points 重复声明终点，也不能通过其末项替换关系 target。

作者可以刻意经过某个端点节点后再绕行，重复引用不自动改写 relation endpoint 或 containment；但不保证这种几何安全或不自交。完整标签使用 ADR-015 的唯一 Relation.label 入口，所有 GeometryLabel 属性继续可用。

smooth 仅配置在 Relation.routing。根、Group 和 Definition 默认仍只接受常规 routing 模式；points 不作为作用域默认复制给其他边，tension 也不从别的路由种类继承。本条关系的 points 必须完整提供，数组按作者顺序消费而不排序。

### Core 拥有 Target 解析，Diagram 只绑定本次布局

经过点的引用基于已确定的真实 Entity / Group geometry。所有节点 id 引用，包括 polar.origin、offset.of 和 between 内部引用，都必须指向本 Flow 中的 Entity 或 Group；Layout 是无 Graph identity 的排列容器，不能作为 NodeTarget。坐标值域完整复用 Core，不借此开放外部 Scene 依赖或 Flow Coordinate catalog。

笛卡尔和极坐标在 Flow 根坐标空间解释；NodeTarget.offset 仍是 Core 定义的世界向量语义，不因 Flow 根坐标声明而悄悄改成本地向量。Core 在当前 compile 的 Scope transform 与 namespace 中解析后返回 Flow 根局部点。外层 transform 与显式 anchor / boundary 必须与最终 Graph 绘制使用同一个绑定环境。

relative 与 relativeAccumulate 使用 Core smooth 的有序 cursor 规则：最初基准是 source 参考点；绝对点和 accumulated-relative 更新后续基准，普通 relative 只产生经过点而不更新该基准。不能用“上一个生成点加偏移”替代这套区别，也不在 Graph、Vanilla 或 React 各写一个版本。

Core 增加 compile-local 的 Path Target 查询能力，通过既有 Composite compile context 对当前真实 child 进行引用绑定。输入是被查询 child、起始 Target 与有序 Target 点列；输出仅为局部有限坐标，既不创建可持久化 target registry，也不返回 Core 的可变节点状态或 Scene。查询与正常 Path 编译复用同一 Target schema、namespace、shape/boundary definitions、Scope transform 和 smooth cursor 规则。

Diagram 的 Layout execution context 提供 `resolveRoutePoints`，接收 provider 已确定的全部 element bounds、关系 source/target 与 authored points。它通过上述 Core 能力绑定同一 Graph 元素投影，返回包含首尾的完整数值 knot chain。provider 不解析 Target，不用元素 AABB 近似具名 shape anchor，也不能 deep import Core 内部 resolver。

### 曲线生成与两端边界

实际插值直接复用 Core smooth 和 Math 的 centripetal Catmull–Rom-to-cubic 能力。Diagram 不复制样条公式、不创造另一种 tension，也不把经过点当成贝塞尔控制点。已解析的中间 knots 与 authored target 引用下沉为 Core smooth，最终绘制保留正式 source / target identity。

Core smooth 对作为关系终点的最后一个无显式 anchor / offset 的 NodeTarget，必须与其他路径段一致处理真实连接边界；不能直接结束在目标中心。需要在 Core 完成这一通用 Path 行为，Diagram 不能以一条额外 line、隐藏 target 或伪造裁剪 point 补丁代替。

保留既有起始裁剪和 Catmull–Rom 参数语义；终端边界沿最后一段 cubic 的入射切线处理，并由 Core 应用最终箭头缩短。内部经过的节点引用仍表示经过其解析位置，不自动截断为另一条关系或绕开那个节点；有显式 anchor / offset 的末项沿用 Core 显式位置语义。最后一个由 Flow 追加的 target 使用默认边界连接。

### 渲染后避让与有限保证

样条会离开连接 knots 的折线通道，安全经过点不能保证平滑结果安全。tension 改变控制臂尺度，降低它也不自动获得避障保证；重复点、急转弯、很短间距或很大 tension 都需要检查整个生成曲线及标签。

内置 layered 保留经过点与 tension，在检测到非端点节点的曲线穿越时发出 `FlowSmoothObstacleConflict` warning。障碍处理沿用 ADR-015 的端点和 Group 规则；不自动加点、删点、改变 tension、切回折线或重新布置节点。warning 表示已检测冲突，不宣称未 warning 就已全局安全。

一般的自动避障仍是路径搜索、安全通道与平滑后验证的独立能力。本能力提供完整的显式绕行表达，LLM 通常先检查生成图，再为具体冲突选择少量必要 knots，重新渲染验证。没有证据表明单段贝塞尔不足时，不应因为“更平滑”直接选择 smooth。

## 基础数据结构与公开契约

```ts
type FlowSmoothRouting = {
  kind: 'smooth';
  points: Array<IRTarget>;
  tension?: number;
};

type FlowSmoothRoute = Readonly<{
  kind: 'smooth';
  points: ReadonlyArray<Readonly<Position>>;
  tension: number;
}>;

type PathTargetQuery = Readonly<{
  child: IRChild;
  source: IRTarget;
  points: ReadonlyArray<IRTarget>;
}>;

type PathTargetQueryResult = Readonly<{
  source: Readonly<Position>;
  points: ReadonlyArray<Readonly<Position>>;
}>;

type FlowRoutePointsQuery = Readonly<{
  elements: ReadonlyArray<FlowLayoutElementOutput>;
  source: string;
  target: string;
  points: ReadonlyArray<IRTarget>;
}>;
```

Core 的 `LayoutCompositeCompileContext.resolvePathTargets` 同步接收 `PathTargetQuery` 并返回 `PathTargetQueryResult`。结果 source 是起始参考点，points 数量和 query.points 一致；查询只执行引用位置确定，不做路由、贝塞尔插值、箭头、标签或最终 stroke shortening。查询处于 child 的根局部坐标，起始 source 若使用相对形式，其初始基准是 `[0, 0]`，随后 points 按 smooth cursor 规则推进。目标解析失败时抛出带查询字段位置的 Core owner 错误，不返回空数组或静默跳过点。

`FlowLayoutExecutionContext.resolveRoutePoints(query: FlowRoutePointsQuery)` 同步返回含起点、经过点和追加终点的 `ReadonlyArray<Readonly<Position>>`。elements 是本次回调最后返回的全部 root-local bounds，必须保持 authored identity / containment / placement；查询不能修改输入或把引用结果保存为下一次 compile 的缓存。

`FlowLayoutRouting` 增加有效 smooth 输入，保留 authored Target points 与已补全 tension；`FlowLayoutRoute` 增加上述数值输出，继续使用 ADR-015 的 `{ route, labelBounds? }`。route.points 至少为三个点，数量为 authored points.length + 2，按有序解析结果逐项对应。它是包含首尾的参考 knot chain，不是 cubic 控制点链或最终描边采样。

输出验证使用 provider 最终 element bounds 和同一 Core Target 查询核对全部 knots。不能只验证两个端点，或把中间点随意改为另一条安全路线。合法重复 knots 保留 Core 的退化语义，不沿用折线路由的相邻点折叠去改变这条点列的参数分段。

`capabilities.routingKinds` 增加 `smooth`，内置 layered 声明支持；自定义 provider 接收相同查询 context、Target 输入与数值输出合同。不支持时在 callback 前拒绝。自环仍是独立 capability，smooth 不自行增加 layered self-loop 支持。

完整标签语义沿用 ADR-015；smooth 的 position 按 Core 对生成 cubic 段的参数规则解释，不声明为整条曲线弧长比例。倾斜预留和绘制必须使用实际曲线切线，而不是相邻 knot 的折线方向。label、曲线和箭头的可见边界计入 drawing 包络。

artifact 保存同一数值 knots 与有效 tension，全部点平移到完整 Flow allocation-local 空间；使用 ADR-016 的 drawing.origin 进行作者坐标转换。它不复制 raw Target、解析 registry、Core query 或等价的整套 cubic 控制点。原始 Target 只保留在 authored Source 中。

React、Vanilla 与 direct JSON 完整表达所有 Target 写法、tension 和 GeometryLabel，不在 adapter 增加另一套 cursor 或引用解析。LLM describe 说明最末优先级、经过点顺序与自动追加终点、tension 的控制臂语义、平滑可能越出安全点链及渲染后检查要求；Target 字段继续说明各自 Core 坐标和引用契约。

## 行为、失败语义与兼容性

- 空 points、非正 tension 或不符合 Core Target 的字段，在 Source schema 边界拒绝；不以默认折线补救
- 引用不存在、引用 Layout 或引用本 Flow 外的 id，在领域引用检查或 Core query 边界拒绝并回指原 authored points 位置；不能绘制一条缺少经过点的关系
- Core 查询或真实边界绑定失败由 Diagram 包装为可定位的 materialization / provider failure，保留 cause；不会跳过整条路径后仍发布完整 artifact
- provider 的 point 数量、顺序、值、tension 或 mode 不符有效输入时沿用 `FlowLayoutOutputInvalid`；重复 knots 不因复用折线清理而丢失，末端零切线沿用 Core 退化几何处理，不由 Diagram 发明新的裁剪回退
- 合法曲线穿节点时绘制及 warning，作者必须重新检查；算法不修正 authored 路线，箭头语义不反转 knot order
- Core 的 smooth 终点自动边界处理是该能力的交付前提，与 Flow 实现和文档同一交付集验证；其更新同时适用于 direct Core / Graph smooth，不作为 Diagram 专用分支
- ADR-003 的 Source 路径限制由这份有类型的 smooth 意图扩展，仍不开放任意 Core Step route；ADR-004 的 execution context 和 ADR-005 的数值路线交付按本文扩展，无旧输出 fallback
