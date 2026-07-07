# ADR-11：custom visual channel

状态：Accepted
发布：`@retikz/plot` `0.1.0-alpha.12`

## 背景

ADR-10 把内置 visual channel 收敛为 definition / registry，但公开自定义通道仍缺最后一环。若自定义 channel 只能走单独补丁路径，内置与扩展能力仍然不是同一机制。

本 ADR 在 ADR-10 的基础上开放自定义 visual channel：用户通过 runtime definition 注入通道逻辑，IR 只描述字段绑定和 JSON-safe 配置。

## 决策

公开：

- `defineVisualChannel`
- `options.visualChannelDefinitions`

IR / encoding 侧增加自定义通道字段绑定入口。最终实现将 `encoding.channels` 落在 Point encoding 表面，用于把自定义通道绑定到数据字段。

`VisualChannelDefinition.deliver` 为必填。definition 负责把解析后的通道值送到既有 core IRNode 样式属性；如果需要新的渲染能力，必须先下沉补 core，而不是在 plot 里私造 renderer 语义。

registry 合并顺序为内置先注册、自定义后合并。冲突、未知通道和非法落点 fail loud。`lowerPoint` 遍历统一的 `ChannelDelivery[]`，不再把 custom channel 放进独立补丁路径。

自定义 channel 的 legend 在本轮推迟，避免在 channel delivery 尚未完全稳定时扩大 guide contract。

## 实现状态

该 ADR 已在 2026-06-21 落地。

与蓝图相比的偏差：

- `encoding.channels` 落在 `PointEncodingSchema`，不是全 mark 通用入口。
- 自定义通道 legend 推迟。
- 评审后修正了 custom channel 的二等路径，统一走 registry / delivery。

## 实现指针

最终行为以代码为准，主要落在：

- `packages/viz/plot/src/contract/channel.ts`
- `packages/viz/plot/src/providers/channel/**`
- `packages/viz/plot/src/schemas/encoding/**`
- `packages/viz/plot/src/providers/mark/features/point.ts`

验证覆盖：

- `packages/viz/plot/tests/lower/node-channel-registry.test.ts`
- `packages/viz/plot/tests/lower/size-channel.test.ts`
- `packages/viz/plot/tests/lower/opacity-channel.test.ts`
- 自定义 channel delivery 相关测试

## 影响

visual channel 完成“内置 / 自定义同机制”的收敛。自定义通道可以在不改内置 lowering 分支的情况下绑定数据字段、解析 scale、并 delivery 到既有 core node 属性。

这为后续 path / scope 通道、对象值通道、legend 扩展留下统一入口。

## 不在本 ADR 范围

- 自定义通道 legend。
- path / scope channel 内置 coverage。
- 新 core 样式属性或 renderer 能力。
- 所有 mark 的通用 `encoding.channels`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/11-custom-visual-channel.md`（封板全文）。
