---
description: Group 与 Block 根外壳复用 Graph 主题来源，保持实例 Surface 字段最终覆盖
keywords: 'Group、Block、Graph、Theme、background、border'
---

# ADR-014：Group 与 Block 继承 Graph Theme 外观

- 状态：Accepted
- 决策日期：2026-08-31
- 修订日期：2026-09-14
- 关联：[Graph v0.1 roadmap](./roadmap.md) · [Graph Theme](./006-graph-entity-registry-theme.md) · [Block](./013-block-open-content.md) · [替代旧 token 与级联契约的 ADR-017](./017-theme-source-fragments.md)

## 背景与目标

只让 Entity / Relation 消费 Graph Theme，会使同图的 Group / Block 外壳固定在另一套默认外观。Graph 应成为这些语义图元外观的共同 owner；Flow 测量与最终物化消费相同的 Graph definitions，避免复制主题数值。

## 决策与公开契约

Graph Theme 的 defaults.group 与 defaults.block 只复用 Standard Surface 的 background、border、cornerRadius。同形片段也可以由作者 graphDefaults 提供，具体生成类型、空片段与级联规则由 ADR-017 定义；旧 tokens 和 graphTheme 不再接受。

Group / Block 不新增 selector rules，也不让主题控制 padding、gap、width、minWidth、overflow、caption 或 children。Header / Section / Row 的局部 shell、普通 Core / Standard / Layout child 与未知 composite 不进入该默认目标。

Neutral 保留既有外观：Group 使用 lightgray / 0.04 背景、lightgray 的 1 unit 虚线边框与圆角 4；Block 使用透明背景、currentColor / 0.2 的 1 unit 边框与圆角 8。

## 覆盖与消费

外壳使用进入 composite 时已经生效的 Core Theme、同名 Graph Definition 与祖先作者默认，显式实例 Surface 字段最终覆盖。background、border 整体替换，不把复合值任意深合并；稀疏 Source 不被回填。

容器自身的 theme 改变其内容环境，不预解析为自身外壳环境。自身 graphDefaults / graphRules 作用于可见后代，祖先作者层不会被新的 theme 清除；完整优先级以 ADR-017 为准。

Flow 的显式 flowDefaults 与实例字段仍可覆盖 Graph 已公开的字段，但 Flow 不复制 Graph reference baseline。Graph / Diagram / Flow 各自在同一个 Core theme.style 下使用自己的 Definition；缺失同名注册不能互相借用或回退。

## 三入口、失败语义与结果

Direct IR、React、Vanilla 与 Flow Graph 投影共享同一 Theme 解析和 Surface lowering。未知默认字段、非法 Surface 值、重名、缺失 Definition 和 callback 失败明确诊断并保留 cause。renderer 只消费最终 Core Scene。

本决策保留 Group / Block 外壳主题化目标；ADR-017 替代其旧 token 类型和混合环境级联。发布包只维护 Neutral，宿主 reference definitions 不内置到 Graph、Diagram 或 Flow。
