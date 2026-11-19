---
description: Flow 正交连线的中点优先有限候选避让与显式折点比例，轴对齐端点保持直连
keywords: orthogonal、turnPosition、正交、避让、折点
---

# ADR-018：Flow 正交连线有限候选避让

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[路由基础](./011-flow-elbow-routing.md) · [布局扩展](./004-flow-layout-definition-registry.md)

## 背景与目标

正交连线在节点间隙中点转折时可能穿过其它节点。保持节点布局不变，通过有限转折位置降低冲突，允许作者锁定位置。

## 决策与公开契约

Diagram Flow 拥有正交路由选择，沿既有 Layout Definition 消费同一契约；Graph/Core 继续拥有节点边界裁剪、圆角与绘制。

`routing: { kind: 'orthogonal', turnPosition?: 0.25 | 0.5 | 0.75, cornerRadius?: number }` 可用于根、Group、Relation。React、Vanilla 和 JSON IR 同义。turnPosition 只继承同种正交路由，实例优先；没有有效继承值时保持省略并自动选择。其它 routing 不接受该字段。

非对齐的前向关系按 authored source 到 target 的面对面边界间隙计算比例；间隙重叠时使用中心间隔。横向布局决定中间竖段位置，纵向布局决定中间横段位置。平行关系沿用通道偏移与间隙限幅；显式比例固定基础位置，不参与搜索。

自动模式按 0.5、0.25、0.75 比较有限候选，依次最小化碰撞节点数、节点内穿越长度、标签冲突数，同分保持候选顺序。障碍继承现有节点 margin 与祖先外壳豁免语义，只豁免端点相连的连续接触区间，不豁免离开后重入。

水平或垂直对齐的两端保持直连，不搜索且不作避让冲突诊断。非对齐回边保留既有外侧通道，不应用间隙比例，但仍可诊断冲突。不增加任意多折点、不移动节点、不比较边交叉。

## 结果与失败语义

所有候选冲突时仍返回最优路线并报告 FlowOrthogonalObstacleConflict。显式路线冲突同样警告而不改写。检查针对未圆角化的参考折线，不保证最终圆角、箭头和标签全局无冲突。圆角继承保持不变。

路由输出保留正交点链、圆角以及作者显式的 turnPosition；自动选出的比例不另存为可由点链推导的字段。provider 必须遵守显式比例及其退化与回边语义，不能只回传参数却改写点链。默认自动候选、对齐直连和回边通道由内置布局执行；自定义 provider 在未锁定比例时仍可返回其自身的合法正交点链。

## 兼容性

straight、bend、贝塞尔、smooth、-| 和 |- 不变。原有 orthogonal 非对齐前向连线可能因避障改变折点；对齐端点始终直连。沿用既有 capabilities.routing 契约，不增加平行 registry。

## 布局与路由复用

Diagram Flow 公开 routeFlowRelations(input, elements, context?)，接收已解析布局输入和布局确定的完整根坐标元素矩形，按原关系顺序返回参考路线及标签预留。内置布局与自定义布局调用同一套路由策略，输入不被修改。自定义布局负责坐标和尺寸，路由函数不放置节点、不移动障碍；最终输出仍接受既有布局校验与冲突诊断。需要经过点查询的路线须传入本次布局 context。此入口复用全部已有路由，不在 React 或 Vanilla 建立独有能力。
