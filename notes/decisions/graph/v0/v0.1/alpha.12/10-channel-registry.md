# ADR-10：visual channel registry

状态：Accepted
发布：`@retikz/plot` `0.1.0-alpha.12`

## 背景

ADR-07 收敛了 scale registry，但 visual channel 仍有缺口：color 通道最接近 registry 化，size / opacity / shape / strokeWidth 等仍散落在 `channel.ts` 的 resolver 分支中。这样 scale 管数学、channel 管输出的边界不清晰，内置通道也难以复用统一 delivery。

本 ADR 先把内置 visual channel 收敛为 registry，为 ADR-11 开放自定义视觉通道铺路。

## 决策

新增 `VisualChannelDefinition` 与 `defineVisualChannel`。职责划分为：

- scale：负责 domain 到归一化数学。
- visual channel：负责输出空间、默认 scale、范围、字段规则、legend 形态和 delivery 约定。

内置视觉通道降为注册项。legend 按 channel definition 的 legend contract 分派。`ordinal` 调色板泛型化，使 color / shape 等离散输出可以共享 palette 逻辑。

本 ADR 不改 IR schema，是 yellow level 收敛。它先把内置通道从 hardcode 分支迁入 registry；自定义通道的公开 options 与 `encoding.channels` 由 ADR-11 处理。

## 实现状态

该 ADR 在 2026-06-20 实现，并在 2026-06-21 与 ADR-11 一起收敛到统一 registry / delivery 形态。

与蓝图相比的偏差：

- 原计划放宽 `ChannelScaleResolution.of`，后续撤回。
- size / opacity / shape 走已泛型的 `ChannelResolution<T>`。
- `ChannelScaleResolution` 继续保持 color-string 语义。

## 实现指针

最终行为以代码为准，主要落在：

- `packages/graph/plot/src/contract/channel.ts`
- `packages/graph/plot/src/providers/channel/**`
- `packages/graph/plot/src/providers/scale/**`
- `packages/graph/plot/src/features/guide/**`

验证覆盖：

- `packages/graph/plot/tests/lower/size-channel.test.ts`
- `packages/graph/plot/tests/lower/opacity-channel.test.ts`
- `packages/graph/plot/tests/lower/shape-channel.test.ts`
- legend / guide / channel delivery 相关测试

## 影响

内置视觉通道与 scale registry 对齐，plot 不再把每个通道写成独立 resolver 分支。后续新增内置通道或自定义通道时，可以复用 definition / registry / delivery 机制。

## 不在本 ADR 范围

- 自定义 visual channel 的公开入口；由 ADR-11 处理。
- path / scope channel coverage 对账；由 ADR-12 处理。
- PaintSpec、Shadow、ArrowDetail 等对象值通道。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:notes/decisions/graph/v0/v0.1/alpha.12/10-channel-registry.md`（封板全文）。
