---
description: Flow 二次与三次贝塞尔的有界自动避让、显式控制点、曲线碰撞检测与坐标契约
keywords: Flow、Bezier、curve、cubic、控制点、自动避让、AABB、搜索预算、routing、drawing.origin
---

# ADR-016：Flow 贝塞尔路由

- 状态：Proposed
- 决策日期：2026-10-02
- 修订日期：2026-10-03
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [bend 路由](./015-flow-bend-routing.md)

## 背景与目标

bend、二次 / 三次贝塞尔与过点曲线都服务曲线连接和路径避让。bend 已以三次贝塞尔表达几何，并支持切线配置；显式 cubic 并不会天然获得更强避障能力。贝塞尔自动模式的价值在于依据障碍生成非对称、定向的有限候选，显式模式则服务作者精确指定路径。

常规曲线优先 bend；有限 bend 候选不能满足避让需求，或关系有明确的非对称 / 首尾方向要求时，再选择贝塞尔。需要多个有序绕行位置时考虑过点曲线。更高阶表达不等于全局无碰撞保证。

## 决策

### 自动意图与显式控制点分离

Flow 单条 Relation 的 routing 支持 Core 同名的 `curve` 与 `cubic`，每种具有互斥的自动与显式输入语义：

- 自动输入表达生成意图及已支持的约束，控制点由本次布局确定；不要求 LLM 先猜绝对坐标
- 显式二次输入完整提供 `control`；显式三次输入完整提供 `control1`、`control2`，复用 Core ControlPointSchema 的有限笛卡尔 `[x, y]` 值域
- 不支持部分手写、部分自动补齐控制点；显式点不得被 provider 移动、clamp 或换成其他 routing kind
- 自动结果只进入 layout route 和 artifact，不回写 Source；作者主动将结果转为显式输入时才形成新的作者事实

Source 的自动 / 显式判别写法和自动约束字段仍待定，本文不把省略控制点视为已经冻结的自动入口。最终 schema 必须排除两种意图混用与不完整的显式输入。

source / target 仍是 Flow element id，曲线首尾由关系绑定；Relation.label 是唯一完整标签入口。Graph materialization 生成对应 Core curve / cubic，不以 bend 近似替代，不在 Diagram 重写曲线求值、极值或切分能力。

### 关系级作用域和扩展入口

本提案将自动和显式 curve / cubic 均限定在 Relation.routing，根、Group 与 Definition 默认 routing kind 继续使用常规模式。显式控制点不从祖先、其他关系或 Definition 补出；选定自动模式后，候选生成使用本条关系与本次布局环境。

内置与自定义布局继续共用 Layout Definition / registry，不增加独立 routing registry。`routingKinds` 表达几何种类，但仅声明 curve / cubic 不足以区分自动生成与显式消费能力；两种能力的准确声明、catalog 投影及调用前拒绝语义必须在公开契约定稿时同步冻结，不能默认所有 provider 都支持自动生成。

### 障碍驱动的有限候选

自动模式先选择绕行侧和少量目标位置，再产生控制点并验证真实曲线。候选依赖已确定的端点、合法连接方向、节点障碍盒与标签预留；不在二维坐标空间中无界枚举控制点，也不改变节点布局。绕行目标 Q 是希望曲线经过的位置，不是控制点；安全的 Q 不证明整条曲线安全。

二次曲线可从经过目标 Q 和参数位置 τ 反求控制点。设端点为 P₀、P₁：

$$
C=\frac{Q-(1-\tau)^2P_0-\tau^2P_1}{2(1-\tau)\tau}
$$

τ = 1/2 时，C = 2Q − (P₀ + P₁)/2。候选目标可位于障碍两侧，并依据障碍靠近起点、中部或终点调整 τ 和绕行间距。τ 必须远离 0、1，避免控制点失控；具体取值和距离范围尚未冻结。

三次曲线优先用合法的首尾方向约束控制点：C₁ = P₀ + a d₀，C₂ = P₁ − b d₁，a、b > 0。d₀ 表示离开起点的方向，d₁ 表示进入终点的前进方向。确定方向后只需确定两个控制臂长度；结合 Q 与 τ 可求解长度，但退化、无可用正解或超过允许长度的候选应淘汰，不改写作者约束。非对称与 S 形只是有限候选形状，不保证所有方向组合均有解。

候选生成与现有 bend 的几何表达可重叠，其新增能力来自障碍驱动的选择。单段曲线无法满足多次转弯时，结束本次搜索并报告有限搜索失败；不静默增加曲线段、切换 smooth 或推断不存在可行路径。

### 坐标系和修图闭环

显式控制点和自动求解的内部控制点使用本次 Flow 布局的根坐标系，先于 Diagram title、Frame、padding 和 drawing placement；不是屏幕像素、完整 Frame-local 坐标或 Scene world 坐标。Group 内关系仍使用 Flow 根坐标，不按 Group 再偏移。

Flow artifact 的 `regions.drawing` 增加必需 `origin: Position`，表示 Flow 根坐标 `[0, 0]` 在完整 Flow allocation-local 空间中的位置。该值等于实际 drawing placement 所用的平移，不等于 drawing allocationBounds 的左上角；负坐标或曲线溢出时两者可以不同。

artifact 中的 route 端点、控制点与标签预留盒仍统一使用 allocation-local 坐标。作者从同 revision artifact 取得控制点时，先减去 drawing.origin 再写回 Source；Scene 的祖先 transform、缩放和屏幕映射另由 Core world-space 查询处理。origin 是坐标转换所需的独立事实，不保存一份重复的根坐标 route 或 Source 快照。

LLM 通常先生成常规模式并检查真实渲染结果，结合同次编译的 artifact 定位冲突，只修改受影响关系。显式控制点是作者事实，布局改变时仍使用原值；Flow 不自行搬移它们或保证原绕行继续安全。自动模式则根据变化后的布局重新求解。作者应重新渲染检查，优先调整方向、布局间距或简单 bend；需要精确局部绕行时再用贝塞尔。

### 真实曲线碰撞与候选比较

节点障碍盒沿用 bounds + margin 及 ADR-015 的端点、祖先 Group 和合法跨组边界规则。曲线 AABB 使用实际曲线首尾与 x、y 方向极值，不把控制点折线或其大包围盒当成精确碰撞结果。二次与三次的极值、子曲线切分均复用 Math 能力。

检测沿用整曲线 AABB 初筛、重叠分支递归细分、子曲线 AABB 保守判断。子段仍是曲线，不被当成直线。自动与显式二次 / 三次曲线的碰撞检测统一最多沿同一递归分支二分 8 次，整曲线为第 0 层。达到既定几何精度或第 8 层仍未分离的区间保守保留，因此空白角落和贴边可能误判；无 warning 不等于精确安全证明。

候选先比较节点冲突，再比较标签冲突；安全性相同时优先较短、绕行幅度较小的路线，最终以固定顺序决胜。现有 bend 的碰撞参数跨度是启发式量，不是实际穿越长度，不能未经归一或其他设计直接跨二次、三次与多段曲线比较。确切评分指标、曲线长度近似及提前结束条件仍待冻结，不承诺跨模式全局最优。

验证必须说明参考端点曲线与 Core 边界处理后实际路径的关系，覆盖首尾接近节点的位置和完整标签。不得仅因中心参考路线通过检测，就承诺最终裁剪、箭头或标签均无冲突；所需几何应通过下层公开能力获得，不读取 renderer 反推路径。

显式曲线穿越非豁免节点时保留控制点和绘制，发出 `FlowBezierObstacleConflict` warning。自动搜索用尽预算仍未找到通过检测的候选时，必须区分“检测到冲突”和“有限搜索未找到安全路线”；具体诊断标识、保留最优冲突路线还是拒绝交付的公开语义列为待决，不静默换路由。边交叉与平行边重叠不作为本提案的安全保证。

### 确定性预算与有限保证

自动贝塞尔是有固定搜索预算的局部避让，不是无界路径规划。先检查少量基础候选，只对受阻关系扩展；每条关系的总候选数、扩展轮数和几何细分均须有确定上限，不能仅限制单个参数档位后任由组合膨胀。预算耗尽的行为必须可诊断，相同输入与配置产生相同结果，不使用墙钟超时决定选路。

满足已定义安全条件与偏好顺序后允许提前结束，但不能跳过仍可能按公开评分获胜的候选后宣称“最优”。候选顺序、质量排序与提前结束的组合必须在定稿时形成一致契约。

控制点反求成本通常低于候选碰撞检测。主要成本随关系数、候选数、障碍数及实际细分工作增长；贴边曲线和候选组合是主要风险。同一候选的极值和子段几何可在本次计算中复用，不因此新增持久化派生状态。本文不承诺毫秒级延迟、相对 bend 的倍数或已达到交互性能；细分深度上限已确定为 8；候选总数、扩展轮数及性能目标仍待单独验证。

### LLM 选择条件

Schema guidance、Definition catalog 与文档示例共同表达：常规分支和简单绕行优先 bend；其有限候选受阻，或需要明确的非对称 / 首尾方向时，选择自动贝塞尔；已知精确路径时可以直接使用显式控制点。需要多个有序绕行位置时考虑 smooth，不仅因“更平滑”升级模式。

自动模式让 LLM 表达意图，由布局求解控制点；显式修图必须使用同 revision artifact 并进行 origin 转换。两者都需要重新检查最终绘图，不把控制点当经过点，不把曲线阶数当成避障保证，也不在调用方未选择的情况下自动升级路由类型。

## 基础数据结构与公开契约

```ts
// 仅展示显式分支；自动 Source / callback 输入形态尚未冻结
type FlowBezierExplicitRouting =
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

`FlowRoutingSchema` / `IRFlowRouting` 在 ADR-015 的基础上增加这两个分支，并以互斥输入区分自动与显式语义，作为单条关系路由。根与 Group 使用其常规模式子集；不建立第二套同义字段或新的作者路径格式。实际类型从复用 Core 字段的 schema 派生。

`FlowLayoutRouting` 和 `FlowLayoutRoute` 分别增加同名有效输入与几何输出分支。回调输出沿用 ADR-015 的 `{ route, labelBounds? }`。route.points 只保存两个 endpoint 参考点，不能把控制点塞入 points 冒充经过点，也不同时保存与控制点等价的采样点或参数形状。

`capabilities.routingKinds` 增加 `curve`、`cubic` 两个独立值；内置 layered 的目标是消费显式配置并提供有界自动生成；最终声明必须与实际能力一致。Definition 可以只支持其中一种，必须准确反映 catalog，不因为两者都属贝塞尔而自动接受未声明模式。Definition 默认 kind 不得是这两个关系专属模式。

输出验证要求端点对应 source / target 的参考中心、全部坐标有限，并保留 routing kind。显式模式逐值保留有效输入控制点；自动模式验证已声明约束及有限几何，不要求与不存在的 Source 控制点比较。Core 对实际首尾按 control / control1 / control2 的方向与真实连接面进行边界处理，再应用箭头缩短与标签中断；artifact 仍是参考路线。

标签的全部属性、显式配置优先级与旋转预留沿用 ADR-015。`position` 分别是二次、三次贝塞尔的参数位置，不能按控制点折线长度或均分折线点推算；最终绘制和倾斜标签使用 Core 的真实曲线采样语义。

React、Vanilla 和 direct JSON 接受相同完整 routing 与标签属性，不提供独立 JSX Step children 或 adapter 私有控制点转换。artifact 平移 points、全部 control 字段和 labelReservation，不能只平移首尾。

LLM describe 沿用上述选择条件；control1 / control2 说明首尾切线影响，显式控制点字段说明 Flow 根坐标与 artifact origin 转换。

## 行为、失败语义与兼容性

- 显式模式缺少必要控制点、混用自动与显式字段、填写其他曲线分支字段或在根/Group 指定 curve / cubic，在 Source 边界拒绝；自动模式不制造作者控制点快照
- Definition 未声明对应 mode 时沿用 capability 错误；返回显式控制点变更、自动约束违反、旧 points 输出、错误 route kind 或非有限几何时沿用 `FlowLayoutOutputInvalid`
- 显式控制点重合、共线或落在节点内不单凭形状判为 schema 错误；保留 Kernel 对退化几何的语义，真实穿越使用 warning，非有限编译失败保留 Core cause；自动候选的淘汰不改变显式输入的合法性
- 正向、反向、双向和无箭头只影响 Graph 语义箭头，不交换两个控制点或重写 authored source → target 的曲线
- 新增模式不改常规路由、默认 straight、自环 capability 或作者固定 Layout placement；Node/Group 仍不得由曲线路由重新定位
- `regions.drawing.origin` 为新增必需 artifact 字段，所有内置消费者和 schema 同步更新，不通过 fallback 猜测旧 artifact 的原点
- 本决策扩展 ADR-003 对作者路径几何的限制：关系允许这两个有类型的几何输入，仍不开放任意 Core route；扩展 ADR-004 的 mode 与 ADR-005 的 artifact 坐标转换，其余约束沿用 ADR-015

## 待决契约

本提案尚未冻结自动 Source 的判别与约束字段、Definition 自动 / 显式能力声明、默认候选预算与扩展参数、评分及提前结束条件、最终路径验证边界，以及自动失败诊断和交付策略。控制臂退化、重合端点等无法生成有效候选的情形也必须纳入失败契约。相关决策完成前不视为可直接实施的完整 API；性能数字与具体参数不以推测写成保证。
