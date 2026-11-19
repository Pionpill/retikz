# v0.4 后续候选池

> 状态：未排期。这里记录 v0.4 讨论中尚未进入正式 milestone 的方向、边界和启动条件；不代表版本承诺。
>
> 当前执行状态见 [`roadmap.md`](./roadmap.md)，已完成方向的历史讨论见 [`history.md`](./history.md)。候选一旦进入正式版本，应迁到新版本 roadmap / ADR，并从本文件删除或标记迁出。

## 候选索引

| 方向                        | 当前边界                                           | 启动条件                                               |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Headless interaction        | 不做编辑器 UI；只讨论事件、命中、选择等通用契约    | 明确跨 React / Vanilla 的用户场景与 Scene 边界         |
| Progressive IR / 增量编译   | 不先承诺 JSON Patch stream 或局部重编译 API        | 有真实大图或交互性能证据，先量化全量 compile 成本      |
| 跨框架 runtime              | Vue / Svelte adapter 不进入 core                   | React / Vanilla 公共 adapter contract 稳定且出现维护者 |
| Pseudo-3D 投影              | 只输出二维 core IR / Scene，不做完整 3D renderer   | plot 坐标或独立 coordinate domain 提出明确消费需求     |
| ScenePrimitive 底层能力重评 | 不在单个 renderer 私加 mesh / SDF / effect graph   | WebGL、位图、mesh 或命中区域形成跨后端共同需求         |
| Path 求交与装饰             | 求交依赖 math；motif / markings 不与普通 Path 混做 | 至少两个独立 domain 消费，先确认扩展机制归属           |

## Headless interaction 与增量编译

完整编辑器不属于 Kernel。可讨论的最小方向是宿主无关的 interaction contract：命中结果、选择状态、事件 payload 与 provenance；React / Vanilla 负责生命周期接线，renderer 只提供后端所需的命中能力。

增量编译不能从“支持 JSON Patch”直接倒推架构。启动前先回答：

1. 哪类用户操作触发性能问题，Scene 与 IR 的稳定 identity 是什么。
2. 能否通过 bailout、缓存或 domain lowering 局部化解决，而不公开增量 API。
3. IR diff、局部 compile、Scene patch 和 concurrent 调度分别由谁拥有。
4. SVG 与 Canvas 是否能共享同一语义，还是只共享变更描述。

## Pseudo-3D 投影

### 目标

在二维 retikz 之上引入可控视角，把三维坐标投影回二维结果，并允许按深度派生有限的二维样式。它不是完整 3D 渲染，也不包含遮挡、光照、mesh 或材质系统。

```text
[x, y, z] + view -> [screenX, screenY]
depth -> opacity / zIndex / scale
```

候选视角参数包括 `target`、`azimuth`、`elevation`、`distance`、`projection` 与 `scale`。最小闭环只考虑点投影、opacity 和 zIndex；连线、路径与标签继续消费投影后的二维结果。

### 归属边界

- core 继续只理解二维 IR / Scene。
- plot coordinate 或独立 coordinate domain 负责投影和深度派生。
- renderer 只绘制二维结果，不增加三维特判。
- path / node / label 继续复用二维布局、连接和渲染语义。

如果需求必须把三维坐标写进 core IR，或要求 SVG / Canvas 各自解释相机，应停止并重新评估 owner。

### 正式 review 前的问题

1. 能力只属于 plot，还是存在不依赖数据可视化的通用 coordinate domain。
2. 最小视角参数集合是什么；是否只做 orthographic。
3. 深度可以派生哪些样式，是否只限 opacity 与 zIndex。
4. 连线、标签和 guide 是否需要新语义，还是全部在投影前解决。
5. 需求能否通过现有 composite / lowering 实现，不新增 core contract。

## ScenePrimitive 重评条件

当前 `RectPrim`、`EllipsePrim`、`TextPrim`、`PathPrim` 与 `GroupPrim` 覆盖二维矢量最大公约子集。只有位图独立放置、mesh / triangle batch、SDF text、path triangulation、effect graph 或交互命中区域成为跨后端共同需求时，才统一重评 Scene contract。

单个 renderer 的性能便利不能直接成为新 primitive；必须证明它能被其它后端解释、序列化和测试，并明确降级行为。

## Path 后续能力

- path-path 求交：先由 `@retikz/math` 提供曲线求交原语，再决定 core 暴露面。
- motif 装饰：优先评估 path kind / generator / domain extension，不能为一个花括号成品扩张 core。
- 沿路径放置节点或 markings：需要真实布局与标签场景，先判断属于 compile 通用机制还是 Sugar。
