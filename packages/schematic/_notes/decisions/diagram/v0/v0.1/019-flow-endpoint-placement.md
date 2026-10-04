---
description: Flow Relation 端点的单边选择、自动分离与精确锚点，复用 Core 边界查询并贯通路由和绘制
keywords: Flow、Relation、endpoint、side、overlap、anchor、fraction、端点避让
---

# ADR-019：Flow 端点选侧与自动分离

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[roadmap](./roadmap.md) · [Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [Defaults](./008-theme-source-fragments.md) · [bend](./015-flow-bend-routing.md) · [贝塞尔](./016-flow-bezier-routing.md) · [经过点](./017-flow-smooth-routing.md) · [正交避让](./018-flow-orthogonal-avoidance.md)

## 背景与目标

同一 Entity 上的多条关系有时可以共用落点，有时需要分开。作者应能只声明连接侧和不重叠要求，让 Flow 计算边界位置，而不必先填写 fraction。不同关系、同一关系的 source 与 target 可以提出不同要求，因此约束属于 Relation 端点；Entity 只是汇总求解的对象。

Diagram 拥有端点分配与路由协调，Graph/Core 继续拥有节点身份、真实边界、锚点查询、路径和箭头绘制。自动计算的 fraction 只进入布局结果，不回写 Source，不生成独立 Port catalog。这里的避让指同侧连接落点分离，不承诺整条路径互不交叉、标签全局避让或线段自动合并。

## Source 与作者入口

Relation 的 source / target 共用以下契约。示意类型中的 Side、IRNodeTarget 和 anchor 值域均复用 Core；正式 Source 类型由权威 schema 派生。

```ts
type FlowEndpointOverlap = 'allow' | 'separate';

type IRFlowEndpoint =
  | string
  | ({ id: string; overlap?: FlowEndpointOverlap } & (
      { side?: Side; anchor?: never } | { anchor: NonNullable<IRNodeTarget['anchor']>; side?: never }
    ));
```

- 字符串是无局部约束的紧凑端点，与 `{ id }` 同义；两者均为正式 JSON Source 表达，不是兼容转换。
- side 取 top/right/bottom/left，只约束连接边，边上位置自动选择；省略时自动选择自然连接位置。
- anchor 是最后使用的精确位置约束，完整复用 Core AnchorRef，包括命名锚点、角度及 `{ side, fraction }`。side 与 anchor 互斥；不新增 offset、boundary 或任意路径输入。
- overlap 可与 side 或 anchor 组合。allow 允许自然落点重合，但不要求合并；separate 要求本端点与同一元素上的其它连接端点具有不同落点。
- 字符串、id 均非空白。Entity 与 Group 都可作为端点并共享上述语义；Layout 仍不能作为端点。分配仅协调同一 Flow 内的关系，不扫描外部 Core/Graph 连线。
- direction 只沿用关系语义及箭头映射，不交换 authored source/target 的约束。

```json
{
  "relations": [
    { "source": "a", "target": { "id": "attention", "side": "bottom", "overlap": "separate" } },
    { "source": "b", "target": { "id": "attention", "side": "bottom", "overlap": "separate" } }
  ]
}
```

React 的 FlowRelation、批量 FlowRelations、Vanilla 与 direct JSON 表达同一契约；普通二元组关系继续表示两个无局部约束的端点。适配器不选择锚点、分配位置或补自己的默认值。

## 默认与字段描述

末端 overlap 默认 allow，保持没有新增约束的普通图行为。统一设置使用与实例同形的 `flowDefaults.relation.source.overlap` 和 `flowDefaults.relation.target.overlap`；这两个默认片段只允许 overlap，不接受 id、side 或 anchor。Flow Theme 返回相同稀疏片段，优先级为末端默认 → Flow Theme → 显式 flowDefaults → 当前端点。字符串端点同样继承默认；显式 allow 可覆盖 separate。Entity、Group 和 Relation 根不增加第二个 overlap 开关。

默认片段必须在作者稀疏字段合并后补全，不提前将省略的 overlap 物化为 allow 而遮蔽继承。Overlap 属于 Flow 的端点布局策略，不向 Graph defaults 或 Graph Theme 投影。

面向作者和 LLM 的字段描述必须包含以下选择规则，schema describe 用英文表达同义内容：

| 字段    | 必须说明的选择规则                                                                        |
| ------- | ----------------------------------------------------------------------------------------- |
| side    | 仅在必须从某侧进入或离开时设置；该侧上的位置仍自动选择，通常省略                          |
| overlap | separate 自动等分连接位置；allow 仅允许重合，不合并线段、不创建汇合节点；不保证路径无交叉 |
| anchor  | 仅在必须固定精确位置时使用；不会被自动分离移动，与 side 互斥                              |

不要为了实现不重叠而引导 LLM 猜 fraction、像素间距或虚构具名端口。没有固定锚点干扰时，两个独立自动槽使用 1/3、2/3，三个使用 1/4、1/2、3/4；展示时可四舍五入为两位小数。

## 自动分配的可观察规则

每个 Entity/Group 汇总所有 source 与 target 端点统一协调，包括无箭头线端。对任意两个端点，只要一个要求 separate，就必须分离；两个都是 allow 才允许重合。固定 anchor 不移动，自动端点避开其位置；不同侧靠近同一角落的端点也检查实际连接位置，不能仅凭 side 不同豁免。

单侧连接使用 Core 的真实边界比例点：top/bottom 的 fraction 从左到右，left/right 从上到下。同侧每个 separate 端点独占一个槽，全部自动 allow 端点共用一个槽；n 个槽的第 i 个位置为 i / (n + 1)。计算与绘制保留完整精度，仅展示可保留两位。槽按对端中心沿该侧切向的投影排列；共享槽使用成员投影均值，同分按 Source 关系顺序及 source 先于 target 裁决。

分离只保证连接落点不同，不保证箭头图形不重叠；不测量 marker、不引入 clearanceRadius 或 Core 测量接口。节点没有 side、anchor 或 separate 请求时保持既有自然裁剪；存在任一请求时将其全部关联端点纳入选侧分配。自动侧按对端中心位移除以节点宽高的主方向选择，等值优先水平，同中心为 right；显式侧不改变。

固定 anchor 不计入自动槽数。等分位置与需要分离的固定位置冲突时，按与原 fraction 最近的空隙中点重新分配自动槽，等距取较小 fraction。空隙由 0、1、原始等分比例与该侧已占用比例分隔；已分配槽保持固定。非比例锚点使用实际坐标检查，不猜其 fraction。自动比例连接要求目标形状提供 Core edgePoint 能力；不支持时保留底层查询失败，不使用外包矩形代替真实边界。候选点必须经 Core 查询并核对实际位置；穷尽候选仍重合时诊断失败。

显式 side 是硬约束；省略 side/anchor 时按自然方向选择侧边。分配不能自动改变节点大小、节点位置、包含关系、关系数量或方向。显式 anchor 即使位于内部也沿用 Core 合法语义，并作为固定位置参与检查；不会因 separate 自动投射到边界。

同一 Source、definitions、测量环境和 provider 必须得到相同结果。自定义 provider 可选择不同合法位置，不要求与内置算法逐点相同，但必须满足相同选侧、固定锚点与分离约束。有界搜索未找到解必须明确表示未找到可行分配，不能声称已证明全局无解。

## 布局扩展、路由与交付

继续使用唯一 Flow Layout Definition/registry，不新增端点或路由 registry。新增必填布尔能力 `endpointPlacement`：请求包含 side、anchor 或有效 separate 时要求该能力，在 callback 前拒绝不支持的 Definition。内置 layered 支持；self-loop 仍由独立 selfLoops 能力控制，不因端点能力新增而隐式支持。

Provider relation 输入的 source/target 统一为含 id、有效 overlap、可选 side 或 anchor 的只读对象。不重复另存端点 id、marker recipe 或 Graph appearance。执行 context 增加公开 `resolveEndpoint({ target, elements })`：target 复用 Core NodeTarget，elements 是本次完整根局部布局矩形；返回同坐标系 Position。端点分配使用 Core/Graph 真实投影查询，不能从矩形盒重建形状。查询对内置和自定义同等开放，复用 Core resolvePathTargets，不新增 marker 测量。

Provider relation 输出在原 route / labelBounds 之外提供 source/target，复用 Core NodeTarget 的 id/anchor 窄投影。自动分离或指定侧的结果必须有确定 anchor；完全无约束且允许重合时可省略 anchor，保留既有自动边界裁剪。输出不携带 overlap 或原始 side；这些分别是输入约束和可由 anchor 表达的事实。

有确定 anchor 时，route 的首尾参考点对应真实锚点坐标；无 anchor 时继续使用既有中心参考点与 Core 自动裁剪。所有 routing 消费同一分配结果；不得只修改 Graph source/target，却让显式 route 的 move/终点仍引用旧中心。输出校验同时检查身份、端点与点链/曲线的一致性、选侧、固定锚点、分离和已有路由约束。

straight 仍直连分配后的两端；-| 与 |- 保留其固定单折角顺序。orthogonal 的轴对齐判定改为分配后的参考点，沿用正交候选、显式 turnPosition 与回边规则。bend 的侧向/切线、curve/cubic 的显式控制点、smooth 的显式经过点不被端点分配偷偷改写；允许自动生成的部分以新端点求解。所有端点约束同时满足不意味着路径避障成功，路径碰撞继续采用所属 routing 的诊断语义，不将 warning 偷换为端点成功证明。

公开 routeFlowRelations 使用同一执行 context 与端点分配规则，返回同形输出。中途失败不发布部分结果。Graph 物化与 artifact 消费唯一已验证输出；artifact 的 source/target 改为上述已解析目标，route 保留绘制所需几何，不增加平行 port 列表、派生坐标索引或 Source 副本。真实边界和箭头缩短仍由 Core 处理，避免再次自动裁剪已固定的锚点。

## 失败语义与契约演进

- 非法字段、side/anchor 并存在 Source schema 边界拒绝；不存在的 id、Layout 端点与不可解析锚点保持可定位诊断。
- 固定位置冲突或有界分配失败使用 `DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE`，details 区分 `fixed-endpoint-conflict`、`endpoint-search-exhausted`，携带相关关系索引、source/target 位置和元素 id。退化边界导致不同 fraction 映射同一点时明确失败。
- 不支持的能力使用既有 capability 错误；底层测量/查询失败保留 cause；provider 输出违反已声明约束使用既有 layout-output-invalid 错误。不能用重叠、换侧、缩小箭头或移动固定 anchor 静默恢复。
- 本文获批后扩展 ADR-003 的端点窄输入及 ADR-008 的默认片段限制，修订 ADR-004/005 的 provider 与 artifact 端点合同，并覆盖 ADR-011/015～018 的中心参考端点假设；其余路由意图与失败语义继续成立。
- Source 保留正式字符串简写；provider 和 artifact 的端点输出属于 breaking 变更，全部消费者同批迁移，不提供旧合同适配、兼容字段或双轨。
