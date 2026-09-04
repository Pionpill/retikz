# ADR-04：Point family 的 Scatter recipe

- 状态：Proposed
- 决策日期：2026-08-22
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md)

## 背景与目标

`scatter` 属于 `point` family，用二维位置表达观测值，并复用 Plot 的 Point、channel、scale、coordinate、guide、lowering 与 provenance 能力。Source 只暴露作者需要的字段绑定、常量 properties、可选 Chart marks 与显式 Plot fragment

本 ADR 冻结 Scatter 的 family 归属、Source shape、semantic mark、Chart mark contract 与失败边界。它不为 Chart 复制 Plot mark schema、scale 解析或 renderer 行为

## 决策：Point family 的精确 Scatter recipe

`point` 是 Source 根 `type`；具体 recipe key 写在 `recipe.chartType`：

```ts
type IRScatterChartRecipe = {
  chartType: 'scatter';
  encodings: IRScatterChartEncodings;
  properties?: IRScatterChartProperties;
  marks?: Array<IRPointMark>;
};

type IRPointMark = {
  kind: 'scatter';
  override?: boolean;
  encodings?: IRPointMarkEncodings;
  properties?: IRPointProperties;
};

type IRScatterChart = z.infer<typeof ScatterChartSchema>;
```

最终 Source 由共享 strict root shell 与具名精确 recipe schema 组合后推导，不接受任意 `Record` payload。`encodings` 的值只能是非空字段名；`properties` 的值只能是当前 recipe schema 允许的常量。`plotExtension` 只保存作者显式声明的 Plot fragment，不保存 recipe 展开的 semantic mark 或 scaffold

Scatter 要求 `encodings.x` 与 `encodings.y`，并可选 `color`、`size`、`opacity`、`shape` 等字段绑定。recipe 根据字段绑定、properties 与 recipe Theme 生成一个 Point semantic mark；默认坐标、scale、axes 与 legend 由 Point recipe 和 Plot owner 确定

## semantic mark 与 Chart mark contract

Scatter recipe 生成一个 `kind: 'scatter'` 的 semantic mark 组，组内包含一个 Point Plot mark。semantic mark 的 identity、默认坐标、scale、guide、provenance、lineage 与 locator 属于 recipe / Plot 主链，不写回 Source

Scatter 允许有序 `recipe.marks`，当前唯一合法 kind 为 `scatter`：

- `scatter` mark 默认是额外的 Point authored Chart mark；`override: true` 时替换 Scatter recipe 的内建 semantic mark 组
- mark 的 `encodings` 只接受可选字段绑定，`properties` 只接受常量
- 省略的 slot 仅从 recipe binding 声明的 Chart context 继承；显式 mark properties / encodings 依次覆盖继承值，同一显式目标中 encoding 胜出
- mark resolver 必须输出至少一个 Plot mark，并沿 Plot 正式 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链消费

解析顺序固定为：

```text
scatter semantic mark group
  -> 应用命中的 recipe.marks override
  -> 其余 recipe.marks 按 authored order 追加
  -> plotExtension.marks 按 Plot order 最后追加
```

Scatter 当前只有一个内建 `scatter` 组。`override` 省略或为 `false` 时保持追加行为；为 `true` 时，解析后的 authored Scatter mark 在原位置整体替换内建组，因此最终只保留一个 Scatter 组。`override` 不改变 scale、guide、coordinate、composition 或其它 scaffold。若未来某个 recipe 允许 `scatter` mark 但没有内建同 kind 组，resolver 仍追加该 mark，并通过 Core compile warning 报告目标缺失；同一 Source 对 `scatter` 声明多个 override 必须 fail-loud

`plotExtension.marks` 不继承 `recipe.encodings` 或 `recipe.properties`。它们是独立的 Plot authoring 内容；作者需要 Path 等非 Scatter 图元时通过该 Plot 出口显式添加，Chart 只负责将它们按 Plot contract 组合到最终结果

## properties、组件与 Theme

component props 与 `recipe.properties` 共同调整内建 semantic recipe 的常量表现。React `ScatterMark` 默认表达额外 authored Scatter mark，声明 `override` 时改为替换内建 `scatter` 组；它仍归一为同一个 `recipe.marks` Source payload，不写入独立配置对象。不在直接 Chart mark 位置的 marker 必须 fail-loud

Point recipe properties 顶层可以用 `domainPadding` 调整连续位置 scale 的留白；完整 shape、最大 Point 半径默认、Core spacing 优先级与 range / ratio 单位由 [ADR-14](./14-point-radius-domain-padding.md) 统一规定。该字段属于 recipe scaffold，不进入 Scatter 或其它 authored Chart mark 的 properties

Recipe Theme 只接受当前 Point recipe 的严格 token slice，并与 Chart shell、Plot owner 的 Theme slice 按统一 Theme cascade 合并。Theme 不能改变 `point` family、`scatter` chartType、数据角色、semantic mark 数量或 mark kind

## 所有权与运行时扩展

- Chart Point family 拥有 `scatter` 的 Source schema、properties schema、recipe Theme schema、recipe Definition 与 mark bindings
- Plot 拥有 Point / Path mark、field channel、scale、guide、coordinate、missing-value delivery、lowering、provenance 与 locator
- Point family module 拥有 family → recipes 的唯一声明；active provider registry 从精确 Definition 与 runtime contribution 派生当前编译边界的索引
- React 与 Vanilla 只负责把组件或 typed input 组装为同一精确 Source；JSON、React、Vanilla 与 SSR 不各自实现 recipe dispatch 或默认解析

## 失败语义

以下情况必须在对应 owner 边界 fail-loud，并把 path 指向可修改的 Source 字段：

- 未注册 `point` family、`scatter` chartType、mark kind 或 Theme
- 缺少 `x` / `y`，空字段名，或将 constant 放入 `encodings`
- 将字段绑定放入 `properties`，未知 property、未知 mark 字段或 mark schema 不匹配
- mark resolver 没有生成 Plot mark，或 mark 试图改变 recipe scaffold、data、Theme、presentation、identity 或核心 coordinate 语义
- 同一 Source 对 `scatter` 声明多个 `override: true`
- 不兼容 Plot fragment、重复 identity、未知 provider dependency 或跨 family 的 chartType 冲突

`false`、`0`、空数组和 schema 允许的空字符串是否有效由精确 schema 决定；resolver 不使用 truthy fallback，也不静默丢弃已接受但没有合法 consumer 的字段

## Proposed 边界

本 ADR 仍为 Proposed。接受前需要确认 Scatter 的精确 properties、recipe Theme、Point mark contract、Chart mark 组件位置与公开文档保持一致；其它 Point chartType 需各自建立 ADR 并通过 capability gate，不在本 ADR 增加新的 family、mark kind、Plot provider 或 adapter 旁路
