# ADR-07：scale registry

状态：Accepted
发布：`@retikz/plot` `0.1.0-alpha.12`

## 背景

alpha.12 进入 registry 收敛阶段后，scale 是最需要统一的轴之一。此前 position scale、color scale、deriveScale、compat assert、legend form、scheme 表散落在多处逻辑中，内置能力与自定义能力并不共享同一机制。

本 ADR 把 scale 相关分派收敛到 definition / registry 模型中，使内置 scale 与扩展 scale 都通过同一注册、解析和消费逻辑进入 pipeline。

## 决策

新增 scale runtime definition 体系，并开放：

- `defineScale`
- `options.scaleDefinitions`
- `options.colorSchemes`

scale definition 按 family 分层。位置 scale 产出 `PositionScale`，颜色 / channel scale 产出 evaluator 与 legend 契约。IR 仍描述 scale operation；runtime definition 承载执行逻辑。二者分名分层，避免把函数或 class 实例塞进 JSON IR。

内置 scale 降为内置注册项，自定义 definition 在内置之后合并。冲突、未知 scale、非法字段类型等问题 fail loud。Custom scale schema 只接收非内置 type，保证内置 scale 的静态精确校验仍然存在。

`options.colorSchemes` 作为 color 子轴的命名调色板扩展点；配色表是运行时能力，IR 只记录 scheme 名称或 scale 配置。

## 最终形态

核心 scale registry 已在 2026-06-19 落地。最终命名使用 `IRPlotScaleOperation`。channel 同源取值保持确定性重算。

与蓝图相比的 staged 项：

- React `<Scale type={custom}>` 糖未在本轮放宽。
- 自定义 scale 经程序化 `scaleDefinitions` / `colorSchemes` 可用。

## 影响

scale 轴从“内置分支 + 局部补丁”收敛为 definition registry。后续自定义 scale 可以走公开扩展点注入，不需要修改内置 lowering 分支。

这也为 ADR-10 / ADR-11 的 visual channel registry 铺路：scale 管 domain 到归一化数学，visual channel 管输出空间与落点。

## 不在本 ADR 范围

- 自定义 visual channel 的 delivery；由 ADR-11 处理。
- React `<Scale>` 对所有 custom type 的声明糖完全放开。
- 新增 core 渲染能力。
