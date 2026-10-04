---
description: Flow 二次与三次贝塞尔的自动和显式输入、有界候选搜索、参考曲线碰撞与坐标契约
keywords: Flow、Bezier、curve、cubic、控制点、自动避让、AABB、搜索预算、routing、drawing.origin
---

# ADR-016：Flow 贝塞尔路由

- 状态：Accepted
- 决策日期：2026-10-02
- 修订日期：2026-10-04
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [bend 路由](./015-flow-bend-routing.md)

## 背景与目标

bend、二次和三次贝塞尔都服务曲线连接与局部避让。bend 本身已使用三次贝塞尔表达；新增模式的价值是障碍驱动的非对称候选与完整显式控制点，不是提高曲线阶数就能保证避障。

常规曲线优先 bend；其有限候选不足时使用自动贝塞尔；已知精确控制点时使用显式模式。需要多个有序经过点时考虑 smooth。本决策不提供全局路径规划、自动切换路由、节点重排或最终像素级安全保证。

## 决策

### 关系级输入

`Relation.routing` 通过控制点是否完整提供区分自动与显式输入，不提供 `mode` 字段。与 bend 的省略参数自动求解体验一致：不填控制点时自动生成，完整填写时使用作者控制点；不支持部分自动补点或额外自动约束配置字段：

```ts
type FlowBezierRouting =
  | { kind: 'curve'; control?: never }
  | { kind: 'curve'; control: IRPosition }
  | { kind: 'cubic'; control1?: never; control2?: never }
  | { kind: 'cubic'; control1: IRPosition; control2: IRPosition };
```

控制点复用 Core ControlPointSchema 的有限笛卡尔 `[x, y]` 值域。`curve` 省略 control 时为自动，提供时为显式；`cubic` 同时省略 control1/control2 时为自动，同时提供时为显式。只提供一个三次控制点、提供其他 kind 的控制点字段或填写 mode 均在 Source schema 边界拒绝；无效控制点也不得被视为省略后转成自动。显式点不得被移动、clamp 或替换。根、Group、Layout 作用域和 Definition 默认 routing 均只接受原有常规模式。关系标签仍由完整 `Relation.label` 表达，source / target 仍绑定 Flow element id。

自动求解结果只进入 route / artifact，不回写 Source。显式点不会随布局变化搬移；作者需要精确首尾方向时通过显式控制点表达，本版自动模式不公开方向锁定参数。

### 唯一能力声明

Layout Definition / registry 仍是唯一扩展入口，不增加 routing registry。将 `capabilities.routingKinds` 替换为 `capabilities.routing`：每种 kind 只出现一次，普通模式保持既有输入语义，贝塞尔必须明确非空、无重复的 modes。

```ts
type FlowRoutingCapability =
  | { kind: 'straight' | 'orthogonal' | '-|' | '|-' | 'bend' }
  | { kind: 'curve' | 'cubic'; modes: ReadonlyArray<'auto' | 'explicit'> };

// capabilities.routing: ReadonlyArray<FlowRoutingCapability>
```

能力声明中的 modes 表示 provider 支持的输入语义，不是作者需要填写的字段；预检从已解析控制点结构推导 auto/explicit。该数组非空；catalog 原样投影它，不另存重复的 kinds 或自动能力布尔值。内置 layered 对 curve / cubic 均声明 auto、explicit；自定义 Definition 可以只支持其中一种 kind 或 mode。不支持的请求在调用 callback 前以 `FlowLayoutCapabilityUnsupported` 拒绝。Definition 默认 kind 必须存在且属于常规模式。所有内置消费者同步迁移，不保留旧字段兼容入口。

### 有限搜索与控制点生成

以下搜索规则属于内置 layered；自定义 provider 可以采用其他算法，但必须遵守输入模式、有限几何、显式点不可变和公共输出验证。

首先用同 kind 的共线控制点构造基线：二次取中点，三次取弦的三分点。无节点及标签冲突时直接采用基线；auto 不承诺一定呈现弯曲形状。

基线受阻时最多扩展两轮。以起终点弦为纵轴、其左法线为横轴，把当前最优路线的冲突障碍投影到这个坐标系；后一轮合并此前已发现的冲突障碍。障碍包括曲线遇到的节点、已有标签，以及本关系标签撞到的节点或标签，不以整图所有节点的大盒替代局部障碍。

目标 Q 的纵向位置取冲突包络中心并限制在弦长的 1/4 至 3/4；横向位置分别取包络两侧向外扩展的边界。首轮间距取最近公共布局作用域 `max(nodeGap, rankGap, 1) / 2`，第二轮翻倍，单位为用户单位。每侧分别使用 τ = 1/4、1/2、3/4。目标点和参数位置是独立量，Q 在曲线外侧不代表整条曲线安全。

二次曲线端点为 P₀、P₁，控制点反求为：

$$
C=\frac{Q-(1-\tau)^2P_0-\tau^2P_1}{2(1-\tau)\tau}
$$

三次候选令 C₁ = P₀ + a d₀、C₂ = P₁ − b d₁。d₀ 是离开起点的方向，d₁ 是进入终点的前进方向；将 B(τ) = Q 代入后解两个控制臂 a、b。每个 Q / τ 使用四组相对弦方向的角度 `(30°, −30°)`、`(60°, −60°)`、`(60°, 30°)`、`(−30°, −60°)`，另一侧镜像。退化方程、非有限值、非正控制臂或控制臂超过四倍弦长时直接淘汰，不 clamp 成另一条曲线。

二次也限制控制点到两个端点的距离均不超过四倍弦长，避免远端目标产生不可控外扩。上述约束只筛选自动候选，不限制合法显式控制点。二次反求和三次约束求解属于 Diagram 的候选构造；曲线求值、极值、切分、长度计算仍消费 Math，不另建几何底座。

每条关系最多提出 **13 条二次候选**（1 + 2 × 2 × 3）或 **49 条三次候选**（1 + 2 × 2 × 3 × 4）。无效和重复提案也占预算，不追加补偿候选。这不是推荐总要计算的条数；基础路线可直接结束，第一轮成功后也不进入第二轮。

### 碰撞、评分和提前结束

节点障碍沿用 bounds + margin、端点局部豁免与祖先 Group 规则。出发时位于自身节点中的连续区间可以豁免，离开后重新穿入仍检测。完整标签与倾斜标签的旋转 AABB 沿用 bend 的 Core 采样及预留语义。

曲线先求真实 x/y 极值 AABB，重叠部分递归切分为子曲线并继续比较 AABB。控制点包围盒不作为精确碰撞结果，子曲线也不改成直线。根为第 0 层，每条分支最多二分 **8 次**；现有 0.25 用户单位的空间终止阈值沿用。未分离的终端区间保守保留，允许贴边和空白角落误判。

候选按以下元组依次比较：

1. 撞到的非豁免节点数量，同节点只计一次
2. 标签冲突对数：曲线与已有标签、本关系标签与节点、其他标签；相同对象对只计一次
3. Math 以 32 个等参数区间计算的近似曲线长度
4. 曲线沿弦法线的最大绝对偏移，以真实投影极值计算
5. 固定提案顺序：先基线，再轮次、左侧/右侧、τ 升序、方向组顺序

不使用碰撞参数跨度作为二次/三次的路径质量指标，不跨 kind 选路。每轮全部候选比较结束后，与此前最优候选一起择优；当前最优节点数和标签数都为零时结束。结果只保证是已评估集合中的最佳，不声称之后未展开的候选更差。

关系按 Source 顺序求解。预留集合包含所有显式/非自动路线标签和此前已确定的自动路线标签；后续自动关系参考已选结果，不迭代回改前面的曲线。节点冲突少优先于标签冲突少，不能只因碰到第一条无节点冲突曲线就停止本轮。

### 参考几何与最终绘制边界

自动选择、冲突诊断与 artifact 均针对 provider 的中心参考路线和标签预留。Core 根据控制点方向与实际节点连接面重新计算曲线首尾，保留控制点，再处理箭头缩短、标签中断等；这不是简单截取原曲线的一段，最终曲线和标签位置可能改变。

因此无 warning 仅表示参考几何通过当前保守检测，不代表最终描边、箭头、节点形状或标签像素无冲突。本版不新增 Core 最终路径查询，也不复制 Core clipping 或从 renderer 反推路径。作者仍需检查最终绘制；不能以参考检测结果声称最终几何已验证。边交叉、平行边重叠同样不在保证范围。

### 失败交付与诊断

显式路线保留原控制点并绘制，参考节点或标签冲突发出 `FlowBezierObstacleConflict` warning，指出关系和冲突对象。

自动搜索结束仍有冲突时，保留已评估集合中的最佳有限路线并发出 `FlowBezierSearchExhausted` warning。该诊断表示有界搜索未找到通过检测的路线，不表示数学上无路可走；包含冲突对象，不静默切换 bend / smooth。内置 provider 在预算完成后返回最优路线，公共 compile 对自动输出的参考冲突使用该诊断；对于自定义 provider，它仅说明其已返回的搜索结果仍冲突，不推断其内部候选数。两种模式不对同一关系重复发送两类 warning。

不同元素中心重合时，内置自动生成没有可用弦方向，抛出 `FlowBezierRouteUnavailable`，不构造伪方向或非有限点；自环仍先受已有 selfLoops capability 约束。有限且不重合的端点至少保留基线；若计算无法形成任何有限路线，同样拒绝交付。显式退化几何不单凭共线、重合或控制点在节点内拒绝，沿用 Core 语义；Core 失败保留 cause。

### 坐标和公开输出

显式点使用 Flow 布局根坐标，位于 Diagram title、Frame、padding 和 drawing placement 之前。Group 内关系也使用 Flow 根坐标，不叠加 Group 偏移。

`FlowLayoutRoute` 增加二次、三次分支，各只保存两个 endpoint 参考点及完整 control 或 control1/control2；不保存与控制点等价的采样数组、自动参数或 Source 快照。自动/显式语义从有效输入的控制点结构推导，不额外保存 mode，也不重复写入数值 route。回调继续返回 `{ route, labelBounds? }`。

输出验证要求 kind 与输入一致、端点对应 source / target 参考中心、全部坐标有限，显式控制点逐值相等。无标签时不得输出 labelBounds，有标签时必须输出。违规沿用 `FlowLayoutOutputInvalid`。

Graph materialization 生成 Core 同名 curve / cubic，不用 bend 近似替代。reverse、both、none 只影响箭头语义，不交换控制点或改写 source → target 顺序。完整 GeometryLabel 属性原样进入 Core；position 使用曲线参数语义，不使用控制折线长度。

artifact 的 `regions.drawing` 增加必需 `origin: Position`，记录 Flow 根原点在完整 allocation-local 中的真实 drawing 平移。它与 drawing allocationBounds 左上角不同，负坐标溢出时不能互换。route endpoints、全部控制点和标签预留盒统一平移一次到 allocation-local；将同 revision artifact 的控制点减 origin 才能写回显式 Source。祖先 transform 和屏幕映射仍归 Core world-space 查询。

React、Vanilla、direct JSON 共享该契约，不提供 adapter 私有自动算法或 JSX Step children。所有 artifact 消费者同步新必填字段，不 fallback 猜测旧原点。

### LLM 选择条件和成本边界

Schema guidance、catalog 与文档共同表达 bend → 自动贝塞尔 → 精确显式控制点/多经过点 smooth 的选择条件；这不是运行时自动升级链。控制点通常不在曲线上，Q 才是候选经过点。自动 Bézier 不承诺比 bend 更短、更快或更安全。

成本随关系数、候选数、障碍数和细分工作增长。8 层限制作用于单曲线/单障碍检测，13/49 是单关系提案上限，均不是整图固定成本或毫秒承诺。不使用墙钟超时决定路线；几何中间结果只在本次计算中复用，不新增持久化派生缓存。

## 兼容性与能力归属

本决策扩展 ADR-003 的关系几何输入、ADR-004 的 capability 声明和 ADR-005 的 artifact 坐标转换；其余常规路由默认及作者 placement 不变。Diagram 拥有 Source、候选、选择和诊断；Math 提供曲线计算，Core 拥有最终连接和绘制语义，Graph 只负责关系语义及 lowering。

本设计已接受；接受设计不等于实现完成。性能目标及最终像素级避障不属于本版承诺。
